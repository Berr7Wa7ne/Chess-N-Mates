/**
 * In-process cron for daily Chess.com compute.
 * Set CRON_DAILY_COMPUTE (e.g. "0 2 * * *") to enable; empty/unset disables.
 */

function startDailyComputeCron() {
  const schedule = (process.env.CRON_DAILY_COMPUTE || '').trim();
  if (!schedule) {
    console.log('[cron] CRON_DAILY_COMPUTE not set — daily compute cron disabled');
    return null;
  }

  let cron;
  try {
    cron = require('node-cron');
  } catch {
    console.warn('[cron] node-cron not installed — daily compute cron disabled');
    return null;
  }

  if (!cron.validate(schedule)) {
    console.warn(`[cron] Invalid CRON_DAILY_COMPUTE schedule: "${schedule}"`);
    return null;
  }

  const task = cron.schedule(schedule, async () => {
    console.log('[cron] Starting daily-compute job…');
    try {
      const { computeAllActive } = require('../services/dailyComputeService');
      const summary = await computeAllActive();
      console.log(
        `[cron] daily-compute done: scored=${summary.scored} review=${summary.needs_review} absent=${summary.absent} advanced=${summary.advanced}`
      );
    } catch (err) {
      console.error('[cron] daily-compute failed:', err.message || err);
    }
  });

  console.log(`[cron] Daily compute scheduled: "${schedule}" (UTC)`);
  return task;
}

module.exports = { startDailyComputeCron };
