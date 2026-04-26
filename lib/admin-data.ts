export type MemberStatus = "active" | "inactive" | "removed"

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
  type: "Swiss" | "Knockout" | "Round Robin"
  status: "active" | "pending" | "completed"
  playerCount: number
  startDate: string
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
  status: "pending" | "ongoing" | "completed"
}

export interface Result {
  id: number
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
    chessUsername: undefined,
    status: "removed",
    registered: false,
    lastActiveAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  },
  {
    id: 6,
    name: "Emily Davis",
    phoneNumber: "+1 234 567 8906",
    chessUsername: { id: 6, username: "BishopPair", elo: 1950 },
    status: "active",
    registered: false,
    lastActiveAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
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
    name: "Spring Swiss Championship 2024",
    type: "Swiss",
    status: "active",
    playerCount: 64,
    startDate: "2024-02-15",
  },
  {
    id: 2,
    name: "Winter Knockout Tournament",
    type: "Knockout",
    status: "active",
    playerCount: 32,
    startDate: "2024-02-10",
  },
  {
    id: 3,
    name: "February Round Robin",
    type: "Round Robin",
    status: "pending",
    playerCount: 8,
    startDate: "2024-02-20",
  },
  {
    id: 4,
    name: "Blitz Championship",
    type: "Swiss",
    status: "completed",
    playerCount: 128,
    startDate: "2024-01-25",
  },
  {
    id: 5,
    name: "Rapid Masters Cup",
    type: "Knockout",
    status: "active",
    playerCount: 16,
    startDate: "2024-02-12",
  },
  {
    id: 6,
    name: "Club Championship 2024",
    type: "Round Robin",
    status: "pending",
    playerCount: 12,
    startDate: "2024-03-01",
  },
]

export const participantsByCompetition: Record<number, Participant[]> = {
  1: [
    { id: 1, username: "GrandMaster_Alex", elo: 2150, status: "active", score: 4.5, joinedDate: "2024-02-14" },
    { id: 2, username: "KnightRider", elo: 1920, status: "active", score: 4.0, joinedDate: "2024-02-14" },
    { id: 4, username: "QueenSacrifice", elo: 2020, status: "active", score: 3.5, joinedDate: "2024-02-15" },
    { id: 6, username: "BishopPair", elo: 1950, status: "active", score: 3.0, joinedDate: "2024-02-15" },
    { id: 5, username: "RookEndgame", elo: 1780, status: "withdrawn", score: 2.0, joinedDate: "2024-02-14" },
  ],
  2: [
    { id: 1, username: "GrandMaster_Alex", elo: 2150, status: "active", score: 3, joinedDate: "2024-02-09" },
    { id: 7, username: "CastleKing", elo: 1880, status: "eliminated", score: 2, joinedDate: "2024-02-09" },
    { id: 3, username: "PawnStorm", elo: 1850, status: "eliminated", score: 1, joinedDate: "2024-02-10" },
  ],
}

export const fixtures: Fixture[] = [
  {
    id: 1,
    tournament: "Spring Swiss Championship 2024",
    round: 1,
    playerA: { id: 1, username: "GrandMaster_Alex", elo: 2150 },
    playerB: { id: 2, username: "KnightRider", elo: 1920 },
    scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    status: "pending",
  },
  {
    id: 2,
    tournament: "Spring Swiss Championship 2024",
    round: 1,
    playerA: { id: 3, username: "PawnStorm", elo: 1850 },
    playerB: { id: 4, username: "QueenSacrifice", elo: 2020 },
    scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    status: "pending",
  },
  {
    id: 3,
    tournament: "Spring Swiss Championship 2024",
    round: 1,
    playerA: { id: 5, username: "RookEndgame", elo: 1780 },
    playerB: { id: 6, username: "BishopPair", elo: 1950 },
    scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    status: "pending",
  },
  {
    id: 4,
    tournament: "Spring Swiss Championship 2024",
    round: 2,
    playerA: { id: 1, username: "GrandMaster_Alex", elo: 2150 },
    playerB: { id: 4, username: "QueenSacrifice", elo: 2020 },
    scheduledDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
    status: "pending",
  },
  {
    id: 5,
    tournament: "Winter Rapid Tournament",
    round: 3,
    playerA: { id: 2, username: "KnightRider", elo: 1920 },
    playerB: { id: 5, username: "RookEndgame", elo: 1780 },
    scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    status: "ongoing",
  },
]

export const results: Result[] = [
  {
    id: 1,
    tournament: "Winter Rapid Tournament",
    round: 1,
    playerA: { id: 1, username: "GrandMaster_Alex", elo: 2150 },
    playerB: { id: 2, username: "KnightRider", elo: 1920 },
    winner: "a",
    scoreA: 1,
    scoreB: 0,
    datePlayed: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
  {
    id: 2,
    tournament: "Winter Rapid Tournament",
    round: 1,
    playerA: { id: 3, username: "PawnStorm", elo: 1850 },
    playerB: { id: 4, username: "QueenSacrifice", elo: 2020 },
    winner: "b",
    scoreA: 0,
    scoreB: 1,
    datePlayed: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
  {
    id: 3,
    tournament: "Winter Rapid Tournament",
    round: 2,
    playerA: { id: 1, username: "GrandMaster_Alex", elo: 2150 },
    playerB: { id: 4, username: "QueenSacrifice", elo: 2020 },
    winner: "draw",
    scoreA: 0.5,
    scoreB: 0.5,
    datePlayed: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  },
  {
    id: 4,
    tournament: "Spring Swiss Championship 2024",
    round: 1,
    playerA: { id: 5, username: "RookEndgame", elo: 1780 },
    playerB: { id: 6, username: "BishopPair", elo: 1950 },
    winner: "b",
    scoreA: 0,
    scoreB: 1,
    datePlayed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    id: 5,
    tournament: "Spring Swiss Championship 2024",
    round: 1,
    playerA: { id: 7, username: "CastleKing", elo: 1880 },
    playerB: { id: 8, username: "EnPassant", elo: 1710 },
    winner: "a",
    scoreA: 1,
    scoreB: 0,
    datePlayed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
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
    id: 2,
    rank: 3,
    username: "KnightRider",
    elo: 1920,
    points: 24.5,
    wins: 10,
    draws: 3,
    losses: 1,
    isActive: true,
  },
  {
    id: 5,
    rank: 4,
    username: "RookEndgame",
    elo: 1780,
    points: 22,
    wins: 9,
    draws: 1,
    losses: 4,
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
    id: 6,
    rank: 6,
    username: "BishopPair",
    elo: 1950,
    points: 18,
    wins: 7,
    draws: 2,
    losses: 5,
    isActive: true,
  },
  {
    id: 3,
    rank: 7,
    username: "PawnStorm",
    elo: 1850,
    points: 16.5,
    wins: 6,
    draws: 3,
    losses: 5,
    isActive: false,
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
