/**
 * One-off correction: Round 4 result kayceea vs Ghostrhyderv2 (September 2026).
 *
 * The fixture was recorded as a plain win for Ghostrhyderv2 (result_source
 * 'manual', is_absent false), but Ghostrhyderv2 was the absentee: kayceea wins
 * and Ghostrhyderv2 is marked with an absence.
 *
 *   rules: "If one player does not show, the opponent receives a win (2 points)
 *           and the absentee is marked with an absence (0 points)."
 *
 * Participant aggregates are written to the values the app's standings engine
 * (services/standingsService.js -> applyMatches) computes for the corrected
 * match, so the stored row and the displayed standings stay identical. This also
 * matches the convention already in the table: every player with an absence in
 * this competition has stored == computed values, losses included.
 *
 * Idempotent: re-running after the correction is a no-op. The match state is
 * guarded, so it refuses to touch a row that is not in the expected state.
 *
 * Usage:
 *   node backend/scripts/fix-round4-kayceea-ghostrhyderv2.js --dry-run
 *   node backend/scripts/fix-round4-kayceea-ghostrhyderv2.js
 *
 * SQL equivalent: backend/migrations/fix_round4_kayceea_ghostrhyderv2.sql
 * Afterwards the round-5 fixtures must be re-drawn (they were drawn from the
 * wrong bracket):
 *   node backend/scripts/rebuild-swiss-round.js b70b608d-3d15-412e-b3c2-3edaf917324f 5
 */

require('../config/env');
const { supabaseAdmin } = require('../config/supabase');
const { fetchParticipantsWithUsers } = require('../utils/competitionHelpers');
const { computeStandings } = require('../services/standingsService');

const COMPETITION_ID = 'b70b608d-3d15-412e-b3c2-3edaf917324f'; // September 2026
const MATCH_ID = '8865490c-cf9c-440b-b2d1-b790e2edee3b'; // R4 kayceea vs Ghostrhyderv2
const USER_A = '7f51a23c-f434-4529-a7b7-e790bf5ea035'; // kayceea       (player_a)
const USER_B = '7de8f1c4-0d8d-4518-b3cc-b443e1535a08'; // Ghostrhyderv2 (player_b)

const MATCH_FIX = {
  result_winner: 'a',
  is_absent: true,
  absence_side: 'b',
  is_both_absent: false,
  match_status: 'completed',
  result_source: 'manual',
  needs_review: false,
  forced: true,
  force_reason:
    'R4 correction: Ghostrhyderv2 was the absentee; kayceea wins (previously recorded as a Ghostrhyderv2 win)',
  forced_at: new Date().toISOString(),
};

const PARTICIPANT_FIX = {
  [USER_A]: { score: 6, wins: 3, draws: 0, losses: 1, absences: 0 },
  [USER_B]: { score: 4, wins: 2, draws: 0, losses: 1, absences: 1 },
};
async function run() {
  const isDryRun = process.argv.includes('--dry-run');
  console.log(`[INFO] Fix Round 4: kayceea vs Ghostrhyderv2 (dry-run: ${isDryRun})`);

  // 1. Fetch match
  const { data: match, error: matchErr } = await supabaseAdmin
    .from('matches')
    .select('*')
    .eq('id', MATCH_ID)
    .single();

  if (matchErr || !match) {
    console.error('[ERROR] Failed to fetch match:', matchErr || 'not found');
    process.exit(1);
  }

  console.log(`[MATCH] Current state:`, {
    id: match.id,
    round_number: match.round_number,
    player_a_id: match.player_a_id,
    player_b_id: match.player_b_id,
    match_status: match.match_status,
    result_winner: match.result_winner,
    is_absent: match.is_absent,
    absence_side: match.absence_side,
  });

  if (match.player_a_id !== USER_A || match.player_b_id !== USER_B) {
    console.error('[ERROR] Match participants do not match expected user IDs!');
    process.exit(1);
  }

  const alreadyCorrected =
    match.result_winner === 'a' && match.is_absent === true && match.absence_side === 'b';

  // 2. Fetch participant rows
  const { data: participants, error: partErr } = await supabaseAdmin
    .from('competition_participants')
    .select('id, user_id, score, wins, draws, losses, absences, byes')
    .eq('competition_id', COMPETITION_ID)
    .in('user_id', [USER_A, USER_B]);

  if (partErr || !participants || participants.length !== 2) {
    console.error('[ERROR] Failed to fetch participants:', partErr || `found ${participants?.length || 0}`);
    process.exit(1);
  }

  const partA = participants.find((p) => p.user_id === USER_A);
  const partB = participants.find((p) => p.user_id === USER_B);

  console.log('[PARTICIPANTS] Current state:');
  console.log('  kayceea      :', { score: partA.score, wins: partA.wins, losses: partA.losses, absences: partA.absences });
  console.log('  Ghostrhyderv2:', { score: partB.score, wins: partB.wins, losses: partB.losses, absences: partB.absences });

  // 3. Inspect Round 5 matches in this competition
  const { data: r5Matches } = await supabaseAdmin
    .from('matches')
    .select('id, round_number, match_status')
    .eq('competition_id', COMPETITION_ID)
    .eq('round_number', 5);

  if (r5Matches) {
    const completedR5 = r5Matches.filter((m) => m.match_status === 'completed');
    console.log(`[ROUND 5] Total fixtures: ${r5Matches.length}, completed: ${completedR5.length}, pending: ${r5Matches.length - completedR5.length}`);
  }

  if (isDryRun) {
    console.log('\n[DRY RUN] Would update match with:');
    console.log(JSON.stringify(MATCH_FIX, null, 2));
    console.log('[DRY RUN] Would update participants:');
    console.log('  kayceea      ->', PARTICIPANT_FIX[USER_A]);
    console.log('  Ghostrhyderv2 ->', PARTICIPANT_FIX[USER_B]);
    console.log('\nNo database rows were modified.');
    return;
  }

  // 4. Apply updates
  if (!alreadyCorrected) {
    console.log('\n[APPLYING] Updating match...');
    const { error: matchUpdErr } = await supabaseAdmin
      .from('matches')
      .update(MATCH_FIX)
      .eq('id', MATCH_ID);

    if (matchUpdErr) {
      console.error('[ERROR] Failed to update match:', matchUpdErr);
      process.exit(1);
    }
    console.log('  -> Match updated successfully.');
  }

  console.log('[APPLYING] Updating participant stats...');
  const { error: partAErr } = await supabaseAdmin
    .from('competition_participants')
    .update(PARTICIPANT_FIX[USER_A])
    .eq('id', partA.id);

  if (partAErr) {
    console.error('[ERROR] Failed to update kayceea participant:', partAErr);
    process.exit(1);
  }
  console.log('  -> kayceea participant row updated.');

  const { error: partBErr } = await supabaseAdmin
    .from('competition_participants')
    .update(PARTICIPANT_FIX[USER_B])
    .eq('id', partB.id);

  if (partBErr) {
    console.error('[ERROR] Failed to update Ghostrhyderv2 participant:', partBErr);
    process.exit(1);
  }
  console.log('  -> Ghostrhyderv2 participant row updated.');

  // 5. Insert audit log
  const { data: adminUser } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('role', 'admin')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (adminUser) {
    await supabaseAdmin.from('admin_logs').insert({
      admin_id: adminUser.id,
      action: 'match_result_corrected',
      entity_type: 'match',
      entity_id: MATCH_ID,
      old_value: {
        result_winner: match.result_winner,
        is_absent: match.is_absent,
        absence_side: match.absence_side,
        kayceea: { score: partA.score, wins: partA.wins, losses: partA.losses, absences: partA.absences },
        ghostrhyderv2: { score: partB.score, wins: partB.wins, losses: partB.losses, absences: partB.absences },
      },
      new_value: {
        result_winner: 'a',
        is_absent: true,
        absence_side: 'b',
        kayceea: PARTICIPANT_FIX[USER_A],
        ghostrhyderv2: PARTICIPANT_FIX[USER_B],
        reason: 'R4 correction: Ghostrhyderv2 did not show in round 4, kayceea awarded win',
      },
    });
    console.log('  -> Audit log entry recorded.');
  }

  // 6. Verification
  console.log('\n[VERIFICATION] Verifying updated standings...');
  const { data: allParticipants } = await supabaseAdmin
    .from('competition_participants')
    .select('*, user:users(*)')
    .eq('competition_id', COMPETITION_ID);

  const { data: allMatches } = await supabaseAdmin
    .from('matches')
    .select('*')
    .eq('competition_id', COMPETITION_ID)
    .lte('round_number', 4);

  if (allParticipants && allMatches) {
    const standings = computeStandings(allParticipants, allMatches);
    const kayceeaStanding = standings.find((s) => s.user_id === USER_A);
    const ghostStanding = standings.find((s) => s.user_id === USER_B);

    console.log('  kayceea computed      :', {
      score: kayceeaStanding?.score,
      wins: kayceeaStanding?.wins,
      losses: kayceeaStanding?.losses,
      absences: kayceeaStanding?.absences,
    });
    console.log('  Ghostrhyderv2 computed:', {
      score: ghostStanding?.score,
      wins: ghostStanding?.wins,
      losses: ghostStanding?.losses,
      absences: ghostStanding?.absences,
    });
  }

  console.log('\nNext step: Rebuild round 5 pairings with:');
  console.log(`  node backend/scripts/rebuild-swiss-round.js ${COMPETITION_ID} 5\n`);
}

run().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(1);
});

