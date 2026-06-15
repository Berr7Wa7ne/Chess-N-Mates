const express = require('express');
const router = express.Router();
const competitionsController = require('../controllers/competitionsController');
const participantsController = require('../controllers/participantsController');
const matchesController = require('../controllers/matchesController');

router.post('/', competitionsController.createCompetition);
router.get('/', competitionsController.getCompetitions);
router.get('/:id', competitionsController.getCompetition);
router.patch('/:id', competitionsController.updateCompetition);
router.post('/:id/start', competitionsController.startCompetition);
router.post('/:id/advance-round', competitionsController.advanceRound);
router.get('/:id/standings', competitionsController.getStandings);
router.get('/:id/matches', matchesController.getCompetitionMatches);
router.post('/:id/join', participantsController.joinCompetition);
router.post('/:id/participants/:userId/withdraw', participantsController.withdrawParticipant);
router.post('/:id/participants/:userId/eliminate', participantsController.eliminateParticipant);

module.exports = router;
