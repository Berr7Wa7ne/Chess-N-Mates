export type MemberStatus = "active" | "inactive" | "removed"
export type CompetitionType = "Swiss" | "Knockout" | "Round Robin"
export type CompetitionStatus = "active" | "pending" | "completed"
export type CompetitionMatchStatus = "pending" | "ongoing" | "submitted" | "completed" | "disputed"

export interface Member {
  id: number
  name: string
  phoneNumber: string
  chessUsername?: {
    id: number
    username: string
    elo: number
  }
  status: MemberStatus
  registered: boolean
  lastActiveAt: Date
  removedAt?: string
  historyNote?: string
}

export interface Player {
  id: number
  username: string
  elo: number
  platform: "Chess.com" | "Lichess"
  status: "active" | "inactive"
  activeTournament: boolean
  lastActiveAt: Date
}

export interface Competition {
  id: number
  name: string
  type: CompetitionType
  status: CompetitionStatus
  playerCount: number
  startDate: string
  endDate?: string
  rounds: number
  currentRound?: number
  description: string
}

export interface Participant {
  id: number
  username: string
  elo?: number
  status: "active" | "eliminated" | "withdrawn"
  score: number
  joinedDate: string
}

export interface Fixture {
  id: number
  competitionId: number
  tournament: string
  round: number
  playerA: {
    id: number
    username: string
    elo: number
  }
  playerB: {
    id: number
    username: string
    elo: number
  }
  scheduledDate: Date
  status: CompetitionMatchStatus
}

export interface Result {
  id: number
  competitionId: number
  tournament: string
  round: number
  playerA: {
    id: number
    username: string
    elo: number
  }
  playerB: {
    id: number
    username: string
    elo: number
  }
  winner: "a" | "b" | "draw"
  scoreA: number
  scoreB: number
  datePlayed: Date
}

export interface Dispute {
  id: number
  matchId: string
  raisedBy: {
    id: number
    username: string
    elo: number
  }
  opponent: {
    id: number
    username: string
    elo: number
  }
  reason: string
  status: "open" | "under_review" | "resolved" | "rejected"
}

export interface LeaderboardEntry {
  id: number
  rank: number
  username: string
  elo: number
  points: number
  wins: number
  draws: number
  losses: number
  isActive: boolean
}

export interface PlayerMatch {
  id: string
  competitionId: number
  competition: string
  opponent: string
  opponentId: number
  round: number
  playerColor: "white" | "black"
  status: CompetitionMatchStatus
  deadline: string
  gameLink?: string
  result?: "win" | "loss" | "draw"
  dispute?: {
    raisedBy: string
    reason: string
    status: "open" | "resolved"
  }
}

export const members: Member[] = [
  {
    id: 1,
    name: "Alex Johnson",
    phoneNumber: "+1 234 567 8901",
    chessUsername: { id: 1, username: "GrandMaster_Alex", elo: 2150 },
    status: "active",
    registered: true,
    lastActiveAt: new Date(Date.now() - 2 * 60 * 1000),
  },
  {
    id: 2,
    name: "Maria Garcia",
    phoneNumber: "+1 234 567 8902",
    chessUsername: { id: 2, username: "KnightRider", elo: 1920 },
    status: "active",
    registered: true,
    lastActiveAt: new Date(Date.now() - 15 * 60 * 1000),
  },
  {
    id: 3,
    name: "James Wilson",
    phoneNumber: "+1 234 567 8903",
    chessUsername: undefined,
    status: "inactive",
    registered: false,
    lastActiveAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    historyNote: "Has not completed onboarding yet.",
  },
  {
    id: 4,
    name: "Sarah Chen",
    phoneNumber: "+1 234 567 8904",
    chessUsername: { id: 4, username: "QueenSacrifice", elo: 2020 },
    status: "active",
    registered: true,
    lastActiveAt: new Date(Date.now() - 60 * 60 * 1000),
  },
  {
    id: 5,
    name: "Michael Brown",
    phoneNumber: "+1 234 567 8905",
    chessUsername: { id: 5, username: "RookEndgame", elo: 1780 },
    status: "removed",
    registered: false,
    lastActiveAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    removedAt: "2026-04-20",
    historyNote:
      "Removed members keep their historical match, competition, and rating records. If Michael rejoins later, he starts onboarding again as a new member profile.",
  },
  {
    id: 6,
    name: "Emily Davis",
    phoneNumber: "+1 234 567 8906",
    chessUsername: { id: 6, username: "BishopPair", elo: 1950 },
    status: "active",
    registered: false,
    lastActiveAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    historyNote: "Linked chess profile exists, but onboarding is still incomplete.",
  },
  {
    id: 7,
    name: "David Lee",
    phoneNumber: "+1 234 567 8907",
    chessUsername: { id: 7, username: "CastleKing", elo: 1880 },
    status: "inactive",
    registered: true,
    lastActiveAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
  {
    id: 8,
    name: "Lisa Martinez",
    phoneNumber: "+1 234 567 8908",
    chessUsername: { id: 8, username: "EnPassant", elo: 1710 },
    status: "active",
    registered: true,
    lastActiveAt: new Date(Date.now() - 30 * 60 * 1000),
  },
]

export const players: Player[] = [
  {
    id: 1,
    username: "GrandMaster_Alex",
    elo: 2150,
    platform: "Chess.com",
    status: "active",
    activeTournament: true,
    lastActiveAt: new Date(Date.now() - 2 * 60 * 1000),
  },
  {
    id: 2,
    username: "KnightRider",
    elo: 1920,
    platform: "Lichess",
    status: "active",
    activeTournament: true,
    lastActiveAt: new Date(Date.now() - 15 * 60 * 1000),
  },
  {
    id: 3,
    username: "PawnStorm",
    elo: 1850,
    platform: "Chess.com",
    status: "inactive",
    activeTournament: false,
    lastActiveAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
  {
    id: 4,
    username: "QueenSacrifice",
    elo: 2020,
    platform: "Lichess",
    status: "active",
    activeTournament: true,
    lastActiveAt: new Date(Date.now() - 60 * 60 * 1000),
  },
  {
    id: 5,
    username: "RookEndgame",
    elo: 1780,
    platform: "Chess.com",
    status: "active",
    activeTournament: false,
    lastActiveAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
  },
  {
    id: 6,
    username: "BishopPair",
    elo: 1950,
    platform: "Lichess",
    status: "active",
    activeTournament: true,
    lastActiveAt: new Date(Date.now() - 30 * 60 * 1000),
  },
  {
    id: 7,
    username: "CastleKing",
    elo: 1880,
    platform: "Chess.com",
    status: "active",
    activeTournament: false,
    lastActiveAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    id: 8,
    username: "EnPassant",
    elo: 1710,
    platform: "Lichess",
    status: "inactive",
    activeTournament: false,
    lastActiveAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
  },
]

export const competitions: Competition[] = [
  {
    id: 1,
    name: "Spring Swiss Championship 2026",
    type: "Swiss",
    status: "active",
    playerCount: 64,
    startDate: "2026-05-14",
    rounds: 7,
    currentRound: 4,
    description: "Main community Swiss event with rolling round deadlines and live standings.",
  },
  {
    id: 2,
    name: "Winter Knockout Cup 2026",
    type: "Knockout",
    status: "completed",
    playerCount: 32,
    startDate: "2026-01-12",
    endDate: "2026-02-01",
    rounds: 5,
    description: "Single-elimination competition that concluded earlier this year.",
  },
  {
    id: 3,
    name: "June Round Robin Invitational",
    type: "Round Robin",
    status: "pending",
    playerCount: 8,
    startDate: "2026-06-10",
    rounds: 7,
    description: "Upcoming invitational event for the top active members.",
  },
  {
    id: 4,
    name: "Blitz Championship 2025",
    type: "Swiss",
    status: "completed",
    playerCount: 128,
    startDate: "2025-11-22",
    endDate: "2025-11-29",
    rounds: 9,
    description: "Large-format blitz championship archived for reference.",
  },
  {
    id: 5,
    name: "Rapid Masters Cup",
    type: "Knockout",
    status: "completed",
    playerCount: 16,
    startDate: "2026-03-08",
    endDate: "2026-03-20",
    rounds: 4,
    description: "Fast-paced knockout event for mid-season ranking movement.",
  },
  {
    id: 6,
    name: "Club Championship 2026",
    type: "Round Robin",
    status: "pending",
    playerCount: 12,
    startDate: "2026-07-02",
    rounds: 11,
    description: "Long-form club championship planned for the next season.",
  },
]

export const participantsByCompetition: Record<number, Participant[]> = {
  1: [
    { id: 1, username: "GrandMaster_Alex", elo: 2150, status: "active", score: 4.5, joinedDate: "2026-05-13" },
    { id: 2, username: "KnightRider", elo: 1920, status: "active", score: 4.0, joinedDate: "2026-05-13" },
    { id: 4, username: "QueenSacrifice", elo: 2020, status: "active", score: 3.5, joinedDate: "2026-05-13" },
    { id: 6, username: "BishopPair", elo: 1950, status: "active", score: 3.0, joinedDate: "2026-05-13" },
    { id: 5, username: "RookEndgame", elo: 1780, status: "withdrawn", score: 2.0, joinedDate: "2026-05-13" },
  ],
  2: [
    { id: 1, username: "GrandMaster_Alex", elo: 2150, status: "active", score: 4, joinedDate: "2026-01-10" },
    { id: 4, username: "QueenSacrifice", elo: 2020, status: "active", score: 3, joinedDate: "2026-01-10" },
    { id: 7, username: "CastleKing", elo: 1880, status: "eliminated", score: 2, joinedDate: "2026-01-10" },
    { id: 3, username: "PawnStorm", elo: 1850, status: "eliminated", score: 1, joinedDate: "2026-01-10" },
  ],
  5: [
    { id: 4, username: "QueenSacrifice", elo: 2020, status: "active", score: 3, joinedDate: "2026-03-08" },
    { id: 6, username: "BishopPair", elo: 1950, status: "active", score: 2, joinedDate: "2026-03-08" },
    { id: 8, username: "EnPassant", elo: 1710, status: "eliminated", score: 1, joinedDate: "2026-03-08" },
  ],
}

export const fixtures: Fixture[] = [
  {
    id: 1,
    competitionId: 1,
    tournament: "Spring Swiss Championship 2026",
    round: 4,
    playerA: { id: 1, username: "GrandMaster_Alex", elo: 2150 },
    playerB: { id: 2, username: "KnightRider", elo: 1920 },
    scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    status: "pending",
  },
  {
    id: 2,
    competitionId: 1,
    tournament: "Spring Swiss Championship 2026",
    round: 4,
    playerA: { id: 3, username: "PawnStorm", elo: 1850 },
    playerB: { id: 4, username: "QueenSacrifice", elo: 2020 },
    scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    status: "pending",
  },
  {
    id: 3,
    competitionId: 1,
    tournament: "Spring Swiss Championship 2026",
    round: 4,
    playerA: { id: 5, username: "RookEndgame", elo: 1780 },
    playerB: { id: 6, username: "BishopPair", elo: 1950 },
    scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    status: "ongoing",
  },
  {
    id: 4,
    competitionId: 1,
    tournament: "Spring Swiss Championship 2026",
    round: 4,
    playerA: { id: 7, username: "CastleKing", elo: 1880 },
    playerB: { id: 8, username: "EnPassant", elo: 1710 },
    scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    status: "submitted",
  },
]

export const results: Result[] = [
  {
    id: 1,
    competitionId: 1,
    tournament: "Spring Swiss Championship 2026",
    round: 1,
    playerA: { id: 1, username: "GrandMaster_Alex", elo: 2150 },
    playerB: { id: 2, username: "KnightRider", elo: 1920 },
    winner: "a",
    scoreA: 1,
    scoreB: 0,
    datePlayed: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
  },
  {
    id: 2,
    competitionId: 1,
    tournament: "Spring Swiss Championship 2026",
    round: 2,
    playerA: { id: 3, username: "PawnStorm", elo: 1850 },
    playerB: { id: 4, username: "QueenSacrifice", elo: 2020 },
    winner: "b",
    scoreA: 0,
    scoreB: 1,
    datePlayed: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  },
  {
    id: 3,
    competitionId: 1,
    tournament: "Spring Swiss Championship 2026",
    round: 3,
    playerA: { id: 1, username: "GrandMaster_Alex", elo: 2150 },
    playerB: { id: 4, username: "QueenSacrifice", elo: 2020 },
    winner: "draw",
    scoreA: 0.5,
    scoreB: 0.5,
    datePlayed: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
  },
  {
    id: 4,
    competitionId: 2,
    tournament: "Winter Knockout Cup 2026",
    round: 4,
    playerA: { id: 1, username: "GrandMaster_Alex", elo: 2150 },
    playerB: { id: 4, username: "QueenSacrifice", elo: 2020 },
    winner: "a",
    scoreA: 1,
    scoreB: 0,
    datePlayed: new Date("2026-02-01T16:00:00"),
  },
  {
    id: 5,
    competitionId: 5,
    tournament: "Rapid Masters Cup",
    round: 3,
    playerA: { id: 6, username: "BishopPair", elo: 1950 },
    playerB: { id: 8, username: "EnPassant", elo: 1710 },
    winner: "a",
    scoreA: 1,
    scoreB: 0,
    datePlayed: new Date("2026-03-18T17:00:00"),
  },
]

export const disputes: Dispute[] = [
  {
    id: 1,
    matchId: "M-2847",
    raisedBy: { id: 2, username: "KnightRider", elo: 1920 },
    opponent: { id: 3, username: "PawnStorm", elo: 1850 },
    reason: "Opponent disconnected during winning position",
    status: "open",
  },
  {
    id: 2,
    matchId: "M-2839",
    raisedBy: { id: 3, username: "PawnStorm", elo: 1850 },
    opponent: { id: 1, username: "GrandMaster_Alex", elo: 2150 },
    reason: "Server lag caused timeout loss",
    status: "open",
  },
  {
    id: 3,
    matchId: "M-2835",
    raisedBy: { id: 6, username: "BishopPair", elo: 1950 },
    opponent: { id: 8, username: "EnPassant", elo: 1710 },
    reason: "Suspected use of engine assistance during critical moments in the middlegame",
    status: "under_review",
  },
  {
    id: 4,
    matchId: "M-2830",
    raisedBy: { id: 8, username: "EnPassant", elo: 1710 },
    opponent: { id: 7, username: "CastleKing", elo: 1880 },
    reason: "Result incorrectly recorded",
    status: "resolved",
  },
  {
    id: 5,
    matchId: "M-2825",
    raisedBy: { id: 4, username: "QueenSacrifice", elo: 2020 },
    opponent: { id: 5, username: "RookEndgame", elo: 1780 },
    reason: "Opponent left match early without completing",
    status: "rejected",
  },
  {
    id: 6,
    matchId: "M-2820",
    raisedBy: { id: 5, username: "RookEndgame", elo: 1780 },
    opponent: { id: 6, username: "BishopPair", elo: 1950 },
    reason: "Technical issue during game preventing normal play",
    status: "open",
  },
]

export const leaderboard: LeaderboardEntry[] = [
  {
    id: 1,
    rank: 1,
    username: "GrandMaster_Alex",
    elo: 2150,
    points: 28.5,
    wins: 12,
    draws: 1,
    losses: 1,
    isActive: true,
  },
  {
    id: 4,
    rank: 2,
    username: "QueenSacrifice",
    elo: 2020,
    points: 26,
    wins: 11,
    draws: 0,
    losses: 3,
    isActive: true,
  },
  {
    id: 6,
    rank: 3,
    username: "BishopPair",
    elo: 1950,
    points: 25,
    wins: 10,
    draws: 2,
    losses: 2,
    isActive: true,
  },
  {
    id: 2,
    rank: 4,
    username: "KnightRider",
    elo: 1920,
    points: 24.5,
    wins: 10,
    draws: 3,
    losses: 1,
    isActive: true,
  },
  {
    id: 7,
    rank: 5,
    username: "CastleKing",
    elo: 1880,
    points: 20.5,
    wins: 8,
    draws: 1,
    losses: 5,
    isActive: false,
  },
  {
    id: 3,
    rank: 6,
    username: "PawnStorm",
    elo: 1850,
    points: 19.5,
    wins: 7,
    draws: 2,
    losses: 5,
    isActive: false,
  },
  {
    id: 5,
    rank: 7,
    username: "RookEndgame",
    elo: 1780,
    points: 18,
    wins: 7,
    draws: 1,
    losses: 6,
    isActive: true,
  },
  {
    id: 8,
    rank: 8,
    username: "EnPassant",
    elo: 1710,
    points: 14,
    wins: 5,
    draws: 4,
    losses: 5,
    isActive: true,
  },
]

export const playerMatchesByPlayerId: Record<number, PlayerMatch[]> = {
  1: [
    {
      id: "M-101",
      competitionId: 1,
      competition: "Spring Swiss Championship 2026",
      opponent: "KnightRider",
      opponentId: 2,
      round: 4,
      playerColor: "white",
      status: "pending",
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "M-102",
      competitionId: 1,
      competition: "Spring Swiss Championship 2026",
      opponent: "QueenSacrifice",
      opponentId: 4,
      round: 3,
      playerColor: "black",
      status: "completed",
      deadline: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      gameLink: "https://chess.com/game/live/gm-alex-001",
      result: "win",
    },
  ],
  2: [
    {
      id: "M-001",
      competitionId: 1,
      competition: "Spring Swiss Championship 2026",
      opponent: "GrandMaster_Alex",
      opponentId: 1,
      round: 4,
      playerColor: "black",
      status: "pending",
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "M-002",
      competitionId: 1,
      competition: "Spring Swiss Championship 2026",
      opponent: "BishopPair",
      opponentId: 6,
      round: 4,
      playerColor: "white",
      status: "submitted",
      deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      gameLink: "https://lichess.org/training-match-002",
    },
    {
      id: "M-003",
      competitionId: 1,
      competition: "Spring Swiss Championship 2026",
      opponent: "QueenSacrifice",
      opponentId: 4,
      round: 3,
      playerColor: "black",
      status: "completed",
      deadline: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      gameLink: "https://chess.com/game/live/123456789",
      result: "loss",
    },
    {
      id: "M-004",
      competitionId: 1,
      competition: "Spring Swiss Championship 2026",
      opponent: "CastleKing",
      opponentId: 7,
      round: 2,
      playerColor: "white",
      status: "completed",
      deadline: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      gameLink: "https://lichess.org/training-match-004",
      result: "win",
    },
    {
      id: "M-005",
      competitionId: 1,
      competition: "Spring Swiss Championship 2026",
      opponent: "PawnStorm",
      opponentId: 3,
      round: 1,
      playerColor: "white",
      status: "disputed",
      deadline: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
      gameLink: "https://chess.com/game/live/987654321",
      dispute: {
        raisedBy: "KnightRider",
        reason: "Opponent disconnected while a winning position was on the board.",
        status: "open",
      },
    },
  ],
  3: [
    {
      id: "M-201",
      competitionId: 1,
      competition: "Spring Swiss Championship 2026",
      opponent: "GrandMaster_Alex",
      opponentId: 1,
      round: 4,
      playerColor: "white",
      status: "submitted",
      deadline: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
      gameLink: "https://lichess.org/pawnstorm-001",
    },
    {
      id: "M-202",
      competitionId: 1,
      competition: "Spring Swiss Championship 2026",
      opponent: "RookEndgame",
      opponentId: 5,
      round: 3,
      playerColor: "black",
      status: "completed",
      deadline: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      gameLink: "https://chess.com/game/live/pawnstorm-003",
      result: "draw",
    },
  ],
  4: [
    {
      id: "M-301",
      competitionId: 1,
      competition: "Spring Swiss Championship 2026",
      opponent: "KnightRider",
      opponentId: 2,
      round: 4,
      playerColor: "white",
      status: "pending",
      deadline: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "M-302",
      competitionId: 1,
      competition: "Spring Swiss Championship 2026",
      opponent: "EnPassant",
      opponentId: 8,
      round: 3,
      playerColor: "white",
      status: "completed",
      deadline: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      gameLink: "https://lichess.org/queensacrifice-001",
      result: "win",
    },
  ],
  5: [
    {
      id: "M-401",
      competitionId: 1,
      competition: "Spring Swiss Championship 2026",
      opponent: "BishopPair",
      opponentId: 6,
      round: 4,
      playerColor: "black",
      status: "pending",
      deadline: new Date(Date.now() + 30 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "M-402",
      competitionId: 1,
      competition: "Spring Swiss Championship 2026",
      opponent: "PawnStorm",
      opponentId: 3,
      round: 2,
      playerColor: "white",
      status: "completed",
      deadline: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      gameLink: "https://chess.com/game/live/rookendgame-002",
      result: "loss",
    },
  ],
  6: [
    {
      id: "M-501",
      competitionId: 1,
      competition: "Spring Swiss Championship 2026",
      opponent: "KnightRider",
      opponentId: 2,
      round: 4,
      playerColor: "black",
      status: "completed",
      deadline: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      gameLink: "https://lichess.org/bishoppair-001",
      result: "win",
    },
    {
      id: "M-502",
      competitionId: 1,
      competition: "Spring Swiss Championship 2026",
      opponent: "RookEndgame",
      opponentId: 5,
      round: 3,
      playerColor: "white",
      status: "pending",
      deadline: new Date(Date.now() + 14 * 60 * 60 * 1000).toISOString(),
    },
  ],
  7: [
    {
      id: "M-601",
      competitionId: 1,
      competition: "Spring Swiss Championship 2026",
      opponent: "EnPassant",
      opponentId: 8,
      round: 4,
      playerColor: "white",
      status: "submitted",
      deadline: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
      gameLink: "https://chess.com/game/live/castleking-001",
    },
    {
      id: "M-602",
      competitionId: 1,
      competition: "Spring Swiss Championship 2026",
      opponent: "QueenSacrifice",
      opponentId: 4,
      round: 2,
      playerColor: "black",
      status: "completed",
      deadline: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
      gameLink: "https://lichess.org/castleking-002",
      result: "draw",
    },
  ],
  8: [
    {
      id: "M-701",
      competitionId: 1,
      competition: "Spring Swiss Championship 2026",
      opponent: "CastleKing",
      opponentId: 7,
      round: 4,
      playerColor: "black",
      status: "pending",
      deadline: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "M-702",
      competitionId: 1,
      competition: "Spring Swiss Championship 2026",
      opponent: "QueenSacrifice",
      opponentId: 4,
      round: 3,
      playerColor: "black",
      status: "completed",
      deadline: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      gameLink: "https://chess.com/game/live/enpassant-001",
      result: "loss",
    },
  ],
}

export const currentPlayerId = 2

export function getCurrentCompetition() {
  return competitions.find((competition) => competition.status === "active")
}

export function getCompetitionById(id: number | string) {
  const numericId = Number(id)
  return competitions.find((competition) => competition.id === numericId)
}

export function getCompetitionFixtures(competitionId: number | string) {
  const id = Number(competitionId)
  return fixtures.filter((fixture) => fixture.competitionId === id)
}

export function getCompetitionResults(competitionId: number | string) {
  const id = Number(competitionId)
  return results.filter((result) => result.competitionId === id)
}

export function getCompetitionParticipants(competitionId: number | string) {
  const id = Number(competitionId)
  return participantsByCompetition[id] ?? []
}

export function getCompetitionStandings(competitionId: number | string) {
  const id = Number(competitionId)
  const participantIds = new Set(getCompetitionParticipants(id).map((participant) => participant.id))
  return leaderboard.filter((entry) => participantIds.has(entry.id))
}

export function getPlayerMatches(playerId: number | string) {
  const id = Number(playerId)
  return playerMatchesByPlayerId[id] ?? []
}

export function getLeaderboardEntry(playerId: number | string) {
  const id = Number(playerId)
  return leaderboard.find((entry) => entry.id === id)
}

// ============================================================================
// MUTATION FUNCTIONS - Handle result submissions and dispute actions
// ============================================================================

export interface ResultSubmission {
  matchId: string
  playerId: number
  gameLink: string
  hasDispute: boolean
  disputeReason?: string
}

/**
 * Submit a match result from a player
 */
export function submitPlayerResult(submission: ResultSubmission): { success: boolean; message: string } {
  try {
    const playerMatchesList = playerMatchesByPlayerId[submission.playerId]
    if (!playerMatchesList) {
      return { success: false, message: "Player not found" }
    }

    const match = playerMatchesList.find((m) => m.id === submission.matchId)
    if (!match) {
      return { success: false, message: "Match not found" }
    }

    if (match.status !== "pending") {
      return { success: false, message: "Match is not pending" }
    }

    // Update match status
    match.status = "submitted"
    match.gameLink = submission.gameLink

    // If there's a dispute, create or update dispute record
    if (submission.hasDispute && submission.disputeReason) {
      const existingDispute = disputes.find((d) => d.matchId === submission.matchId)

      if (existingDispute) {
        // Update existing dispute
        existingDispute.reason = submission.disputeReason
        existingDispute.status = "open"
      } else {
        // Create new dispute
        const newDisputeId = Math.max(...disputes.map((d) => d.id), 0) + 1
        const opponent = match.opponentId
        const opponentPlayer = players.find((p) => p.id === opponent)

        if (opponentPlayer) {
          disputes.push({
            id: newDisputeId,
            matchId: submission.matchId,
            raisedBy: {
              id: submission.playerId,
              username: players.find((p) => p.id === submission.playerId)?.username || "Unknown",
              elo: players.find((p) => p.id === submission.playerId)?.elo || 0,
            },
            opponent: {
              id: opponent,
              username: opponentPlayer.username,
              elo: opponentPlayer.elo,
            },
            reason: submission.disputeReason,
            status: "open",
          })
        }
      }

      match.dispute = {
        raisedBy: players.find((p) => p.id === submission.playerId)?.username || "Unknown",
        reason: submission.disputeReason,
        status: "open",
      }
    }

    return { success: true, message: "Result submitted successfully" }
  } catch (error) {
    return { success: false, message: "Error submitting result" }
  }
}

/**
 * Approve a dispute (admin action)
 */
export function approveDispute(disputeId: number): { success: boolean; message: string } {
  try {
    const dispute = disputes.find((d) => d.id === disputeId)
    if (!dispute) {
      return { success: false, message: "Dispute not found" }
    }

    if (dispute.status !== "open") {
      return { success: false, message: "Dispute is not open" }
    }

    // Update dispute status
    dispute.status = "resolved"

    // Update the match's dispute status
    const matchId = dispute.matchId
    Object.values(playerMatchesByPlayerId).forEach((matches) => {
      const match = matches.find((m) => m.id === matchId)
      if (match && match.dispute) {
        match.dispute.status = "resolved"
      }
    })

    return { success: true, message: "Dispute approved successfully" }
  } catch (error) {
    return { success: false, message: "Error approving dispute" }
  }
}

/**
 * Reject a dispute (admin action)
 */
export function rejectDispute(disputeId: number): { success: boolean; message: string } {
  try {
    const dispute = disputes.find((d) => d.id === disputeId)
    if (!dispute) {
      return { success: false, message: "Dispute not found" }
    }

    if (dispute.status !== "open") {
      return { success: false, message: "Dispute is not open" }
    }

    // Update dispute status
    dispute.status = "rejected"

    // Update the match's dispute status
    const matchId = dispute.matchId
    Object.values(playerMatchesByPlayerId).forEach((matches) => {
      const match = matches.find((m) => m.id === matchId)
      if (match && match.dispute) {
        match.dispute.status = "resolved"
      }
    })

    return { success: true, message: "Dispute rejected successfully" }
  } catch (error) {
    return { success: false, message: "Error rejecting dispute" }
  }
}

/**
 * Force a match result (admin action)
 */
export function forceMatchResult(
  matchId: string,
  result: "white_wins" | "black_wins" | "draw"
): { success: boolean; message: string } {
  try {
    let matchFound = false

    // Find the match in player matches
    Object.values(playerMatchesByPlayerId).forEach((matches) => {
      const match = matches.find((m) => m.id === matchId)
      if (match) {
        match.status = "completed"
        match.result = result === "draw" ? "draw" : result === "white_wins" ? "win" : "loss"
        matchFound = true
      }
    })

    if (!matchFound) {
      return { success: false, message: "Match not found" }
    }

    return { success: true, message: `Match result forced to ${result}` }
  } catch (error) {
    return { success: false, message: "Error forcing match result" }
  }
}
