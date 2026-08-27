/**
 * Unit checks for Chess.com discovery helpers (no network).
 * Run: node backend/scripts/test-daily-compute.js
 */

const {
  mapGameToMatchWinner,
  resolveGameCandidates,
  parseTimeControl,
  validateTimeControl,
} = require('../services/chessComService');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// mapGameToMatchWinner
{
  const game = {
    white: { username: 'Alice' },
    black: { username: 'Bob' },
    pgn: '[Result "1-0"]',
  };
  assert(mapGameToMatchWinner(game, 'Alice', 'Bob') === 'a', 'white wins → a');
  assert(mapGameToMatchWinner(game, 'Bob', 'Alice') === 'b', 'white wins → b when swapped');
}

{
  const drawGame = {
    white: { username: 'Alice' },
    black: { username: 'Bob' },
    pgn: '1/2-1/2',
  };
  assert(mapGameToMatchWinner(drawGame, 'Alice', 'Bob') === 'draw', 'draw');
}

// resolveGameCandidates
{
  const single = resolveGameCandidates([
    { url: 'https://chess.com/live/game/1', end_time: 100, result_winner: 'a' },
  ]);
  assert(single.decision === 'auto', 'single → auto');
  assert(single.game.result_winner === 'a', 'single game winner');
}

{
  const same = resolveGameCandidates([
    { url: 'https://chess.com/live/game/1', end_time: 200, result_winner: 'a' },
    { url: 'https://chess.com/live/game/2', end_time: 100, result_winner: 'a' },
  ]);
  assert(same.decision === 'auto', 'same result → auto');
  assert(same.game.end_time === 100, 'earliest end_time picked');
}

{
  const conflict = resolveGameCandidates([
    { url: 'https://chess.com/live/game/1', end_time: 100, result_winner: 'a' },
    { url: 'https://chess.com/live/game/2', end_time: 110, result_winner: 'b' },
  ]);
  assert(conflict.decision === 'needs_review', 'conflict → needs_review');
  assert(conflict.candidates.length === 2, 'keeps candidates');
}

{
  const none = resolveGameCandidates([]);
  assert(none.decision === 'none', 'empty → none');
}

// time control
{
  const parsed = parseTimeControl('600');
  assert(parsed.baseSeconds === 600, '600 seconds');
  const tc = validateTimeControl('600', 'rapid', '600');
  assert(tc.valid, '600 matches rapid');
}

console.log('All daily-compute helper checks passed.');
