const CHESS_COM_BASE = 'https://api.chess.com/pub'

/**
 * Map chess.com time_class to a human-readable category for comparison.
 */
function normalizeTimeClass(timeClass) {
  const map = {
    bullet: 'bullet',
    blitz: 'blitz',
    rapid: 'rapid',
    standard: 'standard',
    daily: 'daily',
  }
  return map[timeClass?.toLowerCase()] || null
}

/**
 * Parse a competition time_control string (stored in chess.com standard format)
 * into { baseSeconds, increment, isDaily }.
 *
 * Supported formats:
 *   "600"       → 10 min base, no increment
 *   "300+2"     → 5 min base, 2 sec increment
 *   "120+1"     → 2 min base, 1 sec increment
 *   "daily"     → Daily game
 *   "1/259200"  → 3 days per move (daily variant)
 */
function parseTimeControl(timeControlStr) {
  if (!timeControlStr) return null

  const trimmed = timeControlStr.trim().toLowerCase()

  if (trimmed === 'daily') {
    return { baseSeconds: null, increment: null, isDaily: true }
  }

  // Handle "1/259200" style (daily with seconds per move)
  const dailyMatch = trimmed.match(/^(\d+)\/(\d+)$/)
  if (dailyMatch) {
    return { baseSeconds: null, increment: null, isDaily: true }
  }

  // Handle "5+2" or "600+10" style (minutes+seconds)
  const incMatch = trimmed.match(/^(\d+)\+(\d+)$/)
  if (incMatch) {
    let baseSeconds = parseInt(incMatch[1], 10)
    const increment = parseInt(incMatch[2], 10)
    // If base ≤ 180, assume it was entered as minutes (e.g. "5+2" = 5 min + 2s)
    if (baseSeconds <= 180) baseSeconds *= 60
    return { baseSeconds, increment, isDaily: false }
  }

  // Handle plain like "10" (minutes) or "600" (already seconds)
  const plainMatch = trimmed.match(/^(\d+)$/)
  if (plainMatch) {
    let baseSeconds = parseInt(plainMatch[1], 10)
    // If ≤ 180, assume it was entered as minutes (e.g. "10" = 10 min)
    if (baseSeconds <= 180) baseSeconds *= 60
    return { baseSeconds, increment: 0, isDaily: false }
  }

  return null
}

/**
 * Validate that the game's time control matches the competition's time control.
 *
 * @param {string} competitionTimeControl - e.g. "600", "300+2", "daily"
 * @param {string} gameTimeClass - e.g. "blitz", "rapid", "daily" (from chess.com API)
 * @param {string} gameTimeControl - e.g. "600", "300+2" (from chess.com API)
 * @returns {{ valid: boolean, reason?: string }}
 */
function validateTimeControl(competitionTimeControl, gameTimeClass, gameTimeControl) {
  const compParsed = parseTimeControl(competitionTimeControl)
  if (!compParsed) {
    return { valid: false, reason: 'Competition time control is not in a recognized format' }
  }

  const gameClass = normalizeTimeClass(gameTimeClass)
  if (!gameClass) {
    return { valid: false, reason: `Unknown chess.com time class: "${gameTimeClass}"` }
  }

  // Daily games
  if (compParsed.isDaily) {
    if (gameClass !== 'daily') {
      return {
        valid: false,
        reason: `Game is "${gameClass}" but competition requires "daily" time control`,
      }
    }
    return { valid: true }
  }

  // Non-daily: check time class category (matching chess.com's actual thresholds)
  // Bullet: ≤ 2 min (120s) — 1 min, 1+1, 2+1
  // Blitz: 3 min to 5 min (121s–300s) — 3 min, 3+2, 5 min
  // Rapid: 10 min to 30 min (301s–1800s) — 10 min, 15+10, 30 min
  // Standard: > 30 min
  const expectedClass = compParsed.baseSeconds <= 120 ? 'bullet'
    : compParsed.baseSeconds <= 300 ? 'blitz'
    : compParsed.baseSeconds <= 1800 ? 'rapid'
    : 'standard'

  if (gameClass !== expectedClass) {
    return {
      valid: false,
      reason: `Game is "${gameClass}" (${gameTimeControl || '?'}) but competition requires "${expectedClass}" (${competitionTimeControl})`,
    }
  }

  // If game has a time_control value, compare directly
  if (gameTimeControl) {
    const gameParsed = parseTimeControl(gameTimeControl)
    if (gameParsed && !gameParsed.isDaily) {
      if (gameParsed.baseSeconds !== compParsed.baseSeconds || gameParsed.increment !== compParsed.increment) {
        return {
          valid: false,
          reason: `Game time control (${gameTimeControl}) does not match competition time control (${competitionTimeControl})`,
        }
      }
    }
  }

  return { valid: true }
}

/**
 * Validate that the game was played before the match deadline.
 *
 * @param {number} gameEndTime - Unix timestamp from chess.com API
 * @param {string} matchDeadline - ISO date string from the match record
 * @returns {{ valid: boolean, reason?: string }}
 */
function validateGameDate(gameEndTime, matchDeadline) {
  if (!gameEndTime) {
    return { valid: false, reason: 'Could not determine game end time from chess.com' }
  }

  if (!matchDeadline) {
    // No deadline set — skip date validation
    return { valid: true }
  }

  const gameEndMs = gameEndTime * 1000 // chess.com uses Unix seconds
  const deadlineMs = new Date(matchDeadline).getTime()

  if (isNaN(deadlineMs)) {
    return { valid: false, reason: 'Match has an invalid deadline date' }
  }

  if (gameEndMs > deadlineMs) {
    return {
      valid: false,
      reason: `This game was played outside the round's time window. Games must be played within 24 hours of the round starting.`,
    }
  }

  return { valid: true }
}

async function verifyPlayer(username) {
  try {
    const res = await fetch(`${CHESS_COM_BASE}/player/${username.toLowerCase()}`, {
      headers: { 'User-Agent': 'ChessMates Tournament App' }
    })
    if (!res.ok) return { valid: false }
    const profile = await res.json()
    return { valid: true, profile }
  } catch {
    return { valid: false }
  }
}

/**
 * chess.com has NO "get game by ID" endpoint.
 * Games are only available via per-player monthly archives:
 *   GET /pub/player/{username}/games/{YYYY}/{MM}
 * Each game object has: url (ends with the game ID), white.username,
 * black.username, time_class, time_control, end_time, pgn.
 *
 * We search both players' recent monthly archives for the game whose
 * `url` ends with the given game ID.
 */
async function fetchGameFromArchives(username, gameId) {
  if (!username) return null
  try {
    // 1. Get list of archive months
    const archRes = await fetch(
      `${CHESS_COM_BASE}/player/${username.toLowerCase()}/games/archives`,
      { headers: { 'User-Agent': 'ChessMates Tournament App' } }
    )
    if (!archRes.ok) return null
    const { archives } = await archRes.json()
    if (!archives || !archives.length) return null

    // 2. Search most recent months first (current + previous 3)
    const recent = archives.slice(-4)
    for (const archiveUrl of recent) {
      const res = await fetch(archiveUrl, {
        headers: { 'User-Agent': 'ChessMates Tournament App' }
      })
      if (!res.ok) continue
      const data = await res.json()
      const games = data.games || []
      const game = games.find((g) => (g.url || '').endsWith(`/${gameId}`))
      if (game) return game
    }
    return null
  } catch {
    return null
  }
}

async function fetchGameResult(gameUrl, playerAUsername, playerBUsername) {
  try {
    // Accept both old format (chess.com/game/live/ID) and new format (chess.com/live/game/ID)
    const match = gameUrl.match(/chess\.com\/(?:.+\/)?(\d+)$/)
    if (!match) return { found: false, reason: 'Invalid chess.com game URL format' }

    const gameId = match[1]

    // chess.com has no direct game-by-ID endpoint; search both players' archives
    let game =
      (await fetchGameFromArchives(playerAUsername, gameId)) ||
      (await fetchGameFromArchives(playerBUsername, gameId))

    if (!game) {
      return { found: false, reason: 'Game not found on chess.com for either player' }
    }

    let result = null
    if (game.pgn) {
      if (game.pgn.includes('1-0')) result = 'a'
      else if (game.pgn.includes('0-1')) result = 'b'
      else if (game.pgn.includes('1/2-1/2')) result = 'draw'
    }

    return {
      found: true,
      white: game.white?.username?.toLowerCase(),
      black: game.black?.username?.toLowerCase(),
      result,
      gameId,
      // Additional fields for validation
      timeClass: game.time_class,       // e.g. "blitz", "rapid", "daily"
      timeControl: game.time_control,   // e.g. "600", "300+2"
      endTime: game.end_time,           // Unix timestamp
      rules: game.rules,                // e.g. "chess"
    }
  } catch {
    return { found: false, reason: 'Failed to fetch game from chess.com' }
  }
}

/**
 * Verify a chess.com game link and determine the winner.
 * Now includes time control and game date validation.
 *
 * @param {string} gameUrl - The chess.com game URL
 * @param {object} playerA - User record for player A (must have chess_com_username)
 * @param {object} playerB - User record for player B (must have chess_com_username)
 * @param {object} competition - Competition record (must have time_control)
 * @param {object} match - Match record (must have deadline)
 * @returns {{ matched: boolean, result_winner?: string, verified?: boolean, gameId?: string, reason?: string }}
 */
async function verifyGameAndDetermineWinner(gameUrl, playerA, playerB, competition, match) {
  const game = await fetchGameResult(
    gameUrl,
    playerA?.chess_com_username,
    playerB?.chess_com_username
  )
  if (!game.found) return { matched: false, reason: game.reason }
  if (!game.result) return { matched: false, reason: 'Could not determine result from game PGN' }

  // ── Validation 1: Player usernames ──
  const aUsername = playerA.chess_com_username?.toLowerCase()
  const bUsername = playerB.chess_com_username?.toLowerCase()

  const whiteIsA = game.white === aUsername
  const whiteIsB = game.white === bUsername
  const blackIsA = game.black === aUsername
  const blackIsB = game.black === bUsername

  if ((!whiteIsA && !blackIsA) || (!whiteIsB && !blackIsB)) {
    return {
      matched: false,
      reason: 'Player chess.com usernames do not match the game participants'
    }
  }

  // ── Validation 2: Time control ──
  if (competition?.time_control) {
    const tcValidation = validateTimeControl(competition.time_control, game.timeClass, game.timeControl)
    if (!tcValidation.valid) {
      return { matched: false, reason: tcValidation.reason }
    }
  }

  // ── Validation 3: Game date (must be before match deadline) ──
  if (match?.deadline) {
    const dateValidation = validateGameDate(game.endTime, match.deadline)
    if (!dateValidation.valid) {
      return { matched: false, reason: dateValidation.reason }
    }
  }

  // ── Determine winner ──
  let result_winner
  if (game.result === 'draw') {
    result_winner = 'draw'
  } else if (game.result === 'a') {
    result_winner = whiteIsA ? 'a' : 'b'
  } else {
    result_winner = blackIsA ? 'a' : 'b'
  }

  return { matched: true, result_winner, verified: true, gameId: game.gameId }
}

module.exports = { verifyPlayer, fetchGameResult, verifyGameAndDetermineWinner, validateTimeControl, validateGameDate, parseTimeControl }