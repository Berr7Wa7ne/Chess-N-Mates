const { computeAllActive, computeCompetition } = require('../services/dailyComputeService');

/**
 * POST /api/v1/jobs/daily-compute
 * Protected by x-jobs-key or Bearer JOBS_API_KEY
 * Body: { competition_id?: string }
 */
exports.dailyCompute = async (req, res) => {
  try {
    const competitionId = req.body?.competition_id || req.query?.competition_id;

    if (competitionId) {
      const report = await computeCompetition(competitionId, {
        ignoreAutoComputeFlag: Boolean(req.body?.force),
        triggered_by: 'job_api',
      });
      return res.json({ success: true, data: report });
    }

    const summary = await computeAllActive({
      ignoreAutoComputeFlag: Boolean(req.body?.force),
      triggered_by: 'job_api',
    });
    return res.json({ success: true, data: summary });
  } catch (err) {
    console.error('[jobs/daily-compute]', err);
    return res.status(500).json({
      success: false,
      error: { message: err.message || 'Daily compute failed' },
    });
  }
};
