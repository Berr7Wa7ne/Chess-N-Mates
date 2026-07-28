// routes/bot.js — Bot-specific API routes
const express = require('express');
const router = express.Router();
const botController = require('../controllers/botController');

// Status & Info
router.get('/status', botController.getBotStatus);
router.get('/players', botController.getBotPlayers);

// User lookup & management
router.get('/my-matches/:whatsappId', botController.getMyMatches);
router.post('/lookup-user', botController.lookupUser);
router.post('/import-members', botController.importMembers);
router.post('/update-activity', botController.updateActivity);

// Webhook registration
router.post('/register-webhook', botController.registerWebhook);
router.post('/unregister-webhook', botController.unregisterWebhook);

module.exports = router;