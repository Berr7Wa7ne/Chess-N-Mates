/**
 * Diagnostic: why Chess.com auto-compute isn't scoring matches.
 * Read-only — does not update matches.
 *
 * Usage: node backend/scripts/diagnose-auto-compute.js
 */

require('../config/env');

const { supabaseAdmin } = require('../config/supabase');
const {
  findGamesBetweenPlayers,
  resolveGameCandidates,
} = require('../services/chessComService');

function fmt(ts) {
  if (!ts) return null;
  return typeof ts === 'number'
    ? new Date(ts * 1000).toISOString()
    : new Date(ts).toISOString();
}

async function main() {
  console.log('=== Auto-compute diagnostic ===');
  console.log('CRON_DAILY_COMPUTE:', JSON.stringify(process.env.CRON_DAILY_COMPUTE || ''));
  console.log('SUPABASE_URL set:', Boolean(process.env.SUPABASE_URL));
  console.log('SUPABASE_SERVICE_KEY set:', Boolean(process.env.SUPABASE_SERVICE_KEY));
  console.log('');

  const { data: competitions, error: compErr } = await supabaseAdmin
    .from('competitions')
    .select(
      'id, name, platform, auto_compute_enabled, current_round, time_control, competition_status'
    )
    .eq('competition_status', 'active');

  if (compErr) {
    console.error('Failed to load competitions:', compErr.message);
    process.exit(1);
  }

  console.log(`Active competitions: ${(competitions || []).length}`);
  for (const c of competitions || []) {
    console.log(
      `  - ${c.id} | ${c.name} | platform=${c.platform} | auto_compute=${c.auto_compute_enabled} | round=${c.current_round} | TC=${JSON.stringify(c.time_control)} | status=${c.competition_status}`
    );
  }
  console.log('');

  const probeTargets = []; // { competition, match, userA, userB }

  for (const c of competitions || []) {
    const round = c.current_round || 1;
    const { data: matches, error: matchErr } = await supabaseAdmin
      .from('matches')
      .select(
        'id, competition_id, round_number, match_status, is_bye, player_a_id, player_b_id, created_at, deadline, needs_review'
      )
      .eq('competition_id', c.id)
      .eq('round_number', round);

    if (matchErr) {
      console.error(`Matches error for ${c.name}:`, matchErr.message);
      continue;
    }

    const pending = (matches || []).filter(
      (m) => !m.is_bye && ['pending', 'ongoing'].includes(m.match_status)
    );

    console.log(
      `--- ${c.name} (round ${round}): ${pending.length} pending/ongoing of ${(matches || []).length} total ---`
    );

    if (pending.length === 0) {
      console.log('  (none)\n');
      continue;
    }

    const userIds = [...new Set(pending.flatMap((m) => [m.player_a_id, m.player_b_id]))];
    const { data: users, error: userErr } = await supabaseAdmin
      .from('users')
      .select('id, chess_com_username, chess_username, display_name')
      .in('id', userIds);

    if (userErr) {
      console.error('  Users error:', userErr.message);
      continue;
    }

    const usersById = new Map((users || []).map((u) => [u.id, u]));

    for (const m of pending) {
      const a = usersById.get(m.player_a_id);
      const b = usersById.get(m.player_b_id);
      console.log(
        `  match ${m.id} status=${m.match_status} needs_review=${m.needs_review}`
      );
      console.log(
        `    A ${m.player_a_id}: display=${JSON.stringify(a?.display_name)} chess_com=${JSON.stringify(a?.chess_com_username)} chess_username=${JSON.stringify(a?.chess_username)}`
      );
      console.log(
        `    B ${m.player_b_id}: display=${JSON.stringify(b?.display_name)} chess_com=${JSON.stringify(b?.chess_com_username)} chess_username=${JSON.stringify(b?.chess_username)}`
      );
      console.log(
        `    created_at=${m.created_at} deadline=${m.deadline}`
      );

      if (
        probeTargets.length < 2 &&
        a?.chess_com_username &&
        b?.chess_com_username
      ) {
        probeTargets.push({ competition: c, match: m, userA: a, userB: b });
      } else if (
        probeTargets.length < 2 &&
        (!a?.chess_com_username || !b?.chess_com_username)
      ) {
        // still record missing-username case in summary via log above
      }
    }
    console.log('');
  }

  if (probeTargets.length === 0) {
    console.log(
      'No pending matches with both chess_com_username set — cannot probe Chess.com API.'
    );
    // Try probes using chess_username fallback to show if that would help
    console.log('Checking if chess_username fallback would unlock any pairs…');
    for (const c of competitions || []) {
      const round = c.current_round || 1;
      const { data: matches } = await supabaseAdmin
        .from('matches')
        .select('id, player_a_id, player_b_id, created_at, deadline')
        .eq('competition_id', c.id)
        .eq('round_number', round)
        .in('match_status', ['pending', 'ongoing']);

      const pending = (matches || []).filter((m) => true);
      if (!pending.length) continue;

      const userIds = [...new Set(pending.flatMap((m) => [m.player_a_id, m.player_b_id]))];
      const { data: users } = await supabaseAdmin
        .from('users')
        .select('id, chess_com_username, chess_username, display_name')
        .in('id', userIds);
      const usersById = new Map((users || []).map((u) => [u.id, u]));

      for (const m of pending) {
        if (probeTargets.length >= 2) break;
        const a = usersById.get(m.player_a_id);
        const b = usersById.get(m.player_b_id);
        const ua = a?.chess_com_username || a?.chess_username;
        const ub = b?.chess_com_username || b?.chess_username;
        if (ua && ub) {
          probeTargets.push({
            competition: c,
            match: m,
            userA: { ...a, chess_com_username: ua },
            userB: { ...b, chess_com_username: ub },
            usedFallback: true,
          });
        }
      }
    }
  }

  console.log(`\n=== Chess.com probes (${probeTargets.length}) ===`);
  const now = Date.now();
  const archiveCache = new Map();

  for (const target of probeTargets) {
    const { competition: c, match: m, userA, userB } = target;
    const userAName = userA.chess_com_username;
    const userBName = userB.chess_com_username;

    const sinceMs = m.created_at
      ? new Date(m.created_at).getTime()
      : now - 48 * 60 * 60 * 1000;
    const deadlineMs = m.deadline ? new Date(m.deadline).getTime() : null;
    const untilMs = deadlineMs != null ? deadlineMs : now;

    console.log(`\nProbe match ${m.id} in "${c.name}"`);
    console.log(
      `  players: ${userAName} vs ${userBName}${target.usedFallback ? ' (chess_username fallback)' : ''}`
    );
    console.log(
      `  window: since=${fmt(sinceMs / 1000)} until=${fmt(untilMs / 1000)} TC=${JSON.stringify(c.time_control)}`
    );

    try {
      const withTc = await findGamesBetweenPlayers(userAName, userBName, {
        sinceMs,
        untilMs,
        timeControl: c.time_control || null,
        cache: archiveCache,
        delayMs: 120,
      });
      const resWith = resolveGameCandidates(withTc);
      console.log(
        `  WITH timeControl: candidates=${withTc.length} decision=${resWith.decision}`
      );
      for (const g of withTc.slice(0, 5)) {
        console.log(
          `    - ${g.url} end=${fmt(g.end_time)} result=${g.result_winner} class=${g.time_class} tc=${g.time_control}`
        );
      }

      const withoutTc = await findGamesBetweenPlayers(userAName, userBName, {
        sinceMs,
        untilMs,
        timeControl: null,
        cache: archiveCache,
        delayMs: 0,
      });
      const resWithout = resolveGameCandidates(withoutTc);
      console.log(
        `  WITHOUT timeControl: candidates=${withoutTc.length} decision=${resWithout.decision}`
      );
      for (const g of withoutTc.slice(0, 8)) {
        console.log(
          `    - ${g.url} end=${fmt(g.end_time)} result=${g.result_winner} class=${g.time_class} tc=${g.time_control}`
        );
      }

      // Wider window: last 14 days, no TC — to detect window-too-narrow
      const wideSince = now - 14 * 24 * 60 * 60 * 1000;
      const wide = await findGamesBetweenPlayers(userAName, userBName, {
        sinceMs: wideSince,
        untilMs: now,
        timeControl: null,
        cache: archiveCache,
        delayMs: 0,
      });
      console.log(
        `  WIDE 14d no TC: candidates=${wide.length}`
      );
      for (const g of wide.slice(0, 8)) {
        console.log(
          `    - ${g.url} end=${fmt(g.end_time)} result=${g.result_winner} class=${g.time_class} tc=${g.time_control}`
        );
      }
    } catch (err) {
      console.error(`  API/error:`, err.message || err);
    }
  }

  console.log('\n=== Done ===');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
