// routes/bot.js — Bot-specific API routes
const express = require('express');
const router = express.Router();
const botController = require('../controllers/botController');

// ============================================
// STATUS & INFO (existing)
// ============================================
router.get('/status', botController.getBotStatus);
router.get('/players', botController.getBotPlayers);

// ============================================
// USER LOOKUP & MANAGEMENT (existing)
// ============================================
router.get('/my-matches/:whatsappId', botController.getMyMatches);
router.post('/lookup-user', botController.lookupUser);
router.post('/import-members', botController.importMembers);
router.post('/update-activity', botController.updateActivity);

// ============================================
// WEBHOOK REGISTRATION (existing)
// ============================================
router.post('/register-webhook', botController.registerWebhook);
router.post('/unregister-webhook', botController.unregisterWebhook);

// ============================================
// ADMIN COMMANDS (new)
// ============================================

// Create competition + open registration
// Bot command: comp-start round-robin-single
router.post('/comp-create', botController.compCreate);

// Start tournament (generate fixtures, set active)
// Bot command: comp-begin
router.post('/comp-begin', botController.compBegin);

// Advance to next round
// Bot command: comp-next-round
router.post('/comp-advance', botController.compAdvance);

// Delete competition
// Bot command: comp-delete <id>
router.post('/comp-delete', botController.compDelete);

// Force match result
// Bot command: force-result <match_id> <a/b/draw> <reason>
router.post('/force-result', botController.forceResult);

// Mark player absent
// Bot command: mark-absent <match_id> <a/b/both>
router.post('/mark-absent', botController.markAbsent);

// Extend match deadline
// Bot command: extend <match_id> <hours>
router.post('/extend-deadline', botController.extendDeadline);

// Admin score match
// Bot command: admin-score <match_id> <a/b/draw>
router.post('/admin-score', botController.adminScoreMatch);

// View disputes
// Bot command: disputes
router.get('/disputes', botController.getDisputes);

// Resolve dispute
// Bot command: resolve-dispute <id> <upheld/overturned/draw>
router.post('/resolve-dispute', botController.resolveDispute);

// Reject dispute
// Bot command: reject-dispute <id>
router.post('/reject-dispute', botController.rejectDispute);

// ============================================
// PLAYER COMMANDS (new)
// ============================================

// Join competition
// Bot command: reg-chess <username>
router.post('/join', botController.joinCompetition);

// Withdraw from competition
// Bot command: withdraw
router.post('/withdraw', botController.withdrawFromCompetition);

// Submit match result
// Bot command: result <game-link>
router.post('/submit-result', botController.submitResult);

// File a dispute
// Bot command: dispute <match_id> <reason>
router.post('/file-dispute', botController.fileDispute);

// View fixtures (all matches for a round)
// Bot command: fixtures (current round) or fixtures <round_number> (specific round)
router.get('/fixtures', botController.getFixtures);

// View standings
// Bot command: standings
router.get('/standings', botController.getStandings);

module.exports = router;
