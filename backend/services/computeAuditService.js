/**
 * Persist Chess.com compute audit rows for admin inspection.
 * Never throws to callers — logging must not break scoring.
 */

const { randomUUID } = require('crypto');
const { supabaseAdmin } = require('../config/supabase');

function newRunId() {
  return randomUUID();
}

/**
 * @param {object} entry
 * @param {string} [entry.competition_id]
 * @param {string|null} [entry.match_id]
 * @param {string} [entry.run_id]
 * @param {string} [entry.triggered_by] admin | cron | job_api | system
 * @param {string|null} [entry.actor_user_id]
 * @param {string} entry.action
 * @param {string} entry.action_result success | skipped | needs_review | absent | error | info
 * @param {string} [entry.message]
 * @param {object} [entry.details]
 */
async function writeComputeAudit(entry) {
  try {
    const row = {
      competition_id: entry.competition_id || null,
      match_id: entry.match_id || null,
      run_id: entry.run_id || null,
      triggered_by: entry.triggered_by || 'system',
      actor_user_id: entry.actor_user_id || null,
      action: entry.action,
      action_result: entry.action_result,
      message: entry.message || null,
      details: entry.details || {},
    };
    const { error } = await supabaseAdmin.from('compute_audit_logs').insert(row);
    if (error) console.warn('[compute-audit] insert failed:', error.message);
  } catch (err) {
    console.warn('[compute-audit] write failed:', err.message || err);
  }
}

async function writeComputeAuditBatch(entries) {
  if (!entries || entries.length === 0) return;
  try {
    const rows = entries.map((entry) => ({
      competition_id: entry.competition_id || null,
      match_id: entry.match_id || null,
      run_id: entry.run_id || null,
      triggered_by: entry.triggered_by || 'system',
      actor_user_id: entry.actor_user_id || null,
      action: entry.action,
      action_result: entry.action_result,
      message: entry.message || null,
      details: entry.details || {},
    }));
    const { error } = await supabaseAdmin.from('compute_audit_logs').insert(rows);
    if (error) console.warn('[compute-audit] batch insert failed:', error.message);
  } catch (err) {
    console.warn('[compute-audit] batch write failed:', err.message || err);
  }
}

/**
 * @param {string} competitionId
 * @param {{ limit?: number, offset?: number, run_id?: string }} [options]
 */
async function listComputeAuditLogs(competitionId, options = {}) {
  const limit = Math.min(Number(options.limit) || 100, 500);
  const offset = Number(options.offset) || 0;

  let query = supabaseAdmin
    .from('compute_audit_logs')
    .select('*')
    .eq('competition_id', competitionId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (options.run_id) query = query.eq('run_id', options.run_id);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

module.exports = {
  newRunId,
  writeComputeAudit,
  writeComputeAuditBatch,
  listComputeAuditLogs,
};
