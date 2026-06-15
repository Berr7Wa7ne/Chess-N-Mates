const express = require('express');
const router = express.Router();
const matchesController = require('../controllers/matchesController');

// GET /competitions/:competition_id/matches — list matches for a competition
router.get('/', matchesController.getCompetitionMatches);

// GET /matches/:id — single match detail
router.get('/:id', matchesController.getMatch);

// POST /matches/:id/submit-result — player submits result
router.post('/:id/submit-result', matchesController.submitResult);

// POST /matches/:id/confirm-result — admin confirms result
router.post('/:id/confirm-result', matchesController.confirmResult);

// POST /matches/:id/force-result — admin forces result
router.post('/:id/force-result', matchesController.forceResult);

// POST /matches/:id/extend-deadline — admin extends deadline
router.post('/:id/extend-deadline', matchesController.extendDeadline);

module.exports = router;