const express = require('express');
const router = express.Router();
const jobsController = require('../controllers/jobsController');
const { validateJobsApiKey } = require('../middleware/auth');

router.post('/daily-compute', validateJobsApiKey, jobsController.dailyCompute);

module.exports = router;
