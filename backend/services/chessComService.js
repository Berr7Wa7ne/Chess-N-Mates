const CHESS_COM_BASE = 'https://api.chess.com/pub'

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

async function fetchGameResult(gameUrl) {
  try {
    const match = gameUrl.match(/chess\.com\/game\/(?:live|daily)\/(\d+)/)
    if (!match) return { found: false, reason: 'Invalid chess.com game URL format' }
    
    const gameId = match[1]
    const res = await fetch(`${CHESS_COM_BASE}/game/${gameId}`, {
      headers: { 'User-Agent': 'ChessMates Tournament App' }
    })
    if (!res.ok) return { found: false, reason: 'Game not found on chess.com' }
    
    const game = await res.json()
    
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
    }
  } catch {
    return { found: false, reason: 'Failed to fetch game from chess.com' }
  }
}

async function verifyGameAndDetermineWinner(gameUrl, playerA, playerB) {
  const game = await fetchGameResult(gameUrl)
  if (!game.found) return { matched: false, reason: game.reason }
  if (!game.result) return { matched: false, reason: 'Could not determine result from game PGN' }

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

module.exports = { verifyPlayer, fetchGameResult, verifyGameAndDetermineWinner }