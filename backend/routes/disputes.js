const express = require('express');
const router = express.Router();
const disputesController = require('../controllers/disputesController');

router.get('/', disputesController.getDisputes);
router.get('/:id', disputesController.getDispute);
router.post('/', disputesController.createDispute);
router.patch('/:id/status', disputesController.updateDisputeStatus);
router.post('/:id/resolve', disputesController.resolveDispute);
router.post('/:id/reject', disputesController.rejectDispute);

module.exports = router;