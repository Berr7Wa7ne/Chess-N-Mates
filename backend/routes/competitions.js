const express = require('express');
const router = express.Router();
const competitionsController = require('../controllers/competitionsController');

router.post('/', competitionsController.createCompetition);
router.get('/', competitionsController.getCompetitions);
router.get('/:id', competitionsController.getCompetition);

module.exports = router;
