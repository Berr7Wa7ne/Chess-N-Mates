"use client"

import { useState } from "react"
import { Award, Calendar, Check, Edit2, ExternalLink, LogOut, Phone, Swords, Trophy, TrendingUp, User, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { currentPlayerId, getLeaderboardEntry } from "@/lib/admin-data"

const currentPlayerStanding = getLeaderboardEntry(currentPlayerId)

const playerProfile = {
  username: "KnightRider",
  platform: "Lichess",
  platformUrl: "https://lichess.org/@/KnightRider",
  phoneNumber: "+1 (555) 123-4567",
  status: "active",
  joinedDate: "2026-01-15",
  rating: currentPlayerStanding?.elo ?? 0,
  rank: currentPlayerStanding?.rank ?? 0,
  matchesPlayed: (currentPlayerStanding?.wins ?? 0) + (currentPlayerStanding?.draws ?? 0) + (currentPlayerStanding?.losses ?? 0),
  wins: currentPlayerStanding?.wins ?? 0,
  losses: currentPlayerStanding?.losses ?? 0,
  draws: currentPlayerStanding?.draws ?? 0,
}

export default function PlayerProfilePage() {
  const [isEditing, setIsEditing] = useState(false)
  const [username, setUsername] = useState(playerProfile.username)
  const [tempUsername, setTempUsername] = useState(username)

  const handleSave = () => {
    setUsername(tempUsername)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setTempUsername(username)
    setIsEditing(false)
  }

  return (
    <div className="space-y-4 pb-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">Manage your player account.</p>
      </div>

      <Card className="overflow-hidden shadow-sm">
        <CardContent className="p-0">
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6">
            <div className="flex flex-col items-center text-center">
              <div className="mb-3 flex size-20 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground shadow-lg">
                {username.slice(0, 2).toUpperCase()}
              </div>

              {isEditing ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={tempUsername}
                    onChange={(event) => setTempUsername(event.target.value)}
                    className="h-10 max-w-[200px] text-center font-semibold"
                    autoFocus
                  />
                  <Button size="icon" variant="ghost" onClick={handleSave}>
                    <Check className="size-5 text-emerald-600" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={handleCancel}>
                    <X className="size-5 text-red-600" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">{username}</h2>
                  <Button size="icon" variant="ghost" className="size-8" onClick={() => setIsEditing(true)}>
                    <Edit2 className="size-4" />
                  </Button>
                </div>
              )}

              <Badge className="mt-2 bg-emerald-500 text-white">Active Player</Badge>
            </div>
          </div>

          <div className="grid grid-cols-3 divide-x border-t">
            <div className="p-4 text-center">
              <p className="text-2xl font-bold">{playerProfile.rating}</p>
              <p className="text-xs text-muted-foreground">Community ELO</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-2xl font-bold">#{playerProfile.rank}</p>
              <p className="text-xs text-muted-foreground">Community Rank</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-2xl font-bold">{playerProfile.wins}</p>
              <p className="text-xs text-muted-foreground">Wins</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardContent className="divide-y p-0">
          <div className="flex items-center gap-4 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-100">
              <Trophy className="size-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Chess Platform</p>
              <Badge variant="outline">{playerProfile.platform}</Badge>
            </div>
            <a
              href={playerProfile.platformUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex size-10 items-center justify-center rounded-lg bg-muted"
            >
              <ExternalLink className="size-5 text-muted-foreground" />
            </a>
          </div>

          <div className="flex items-center gap-4 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-blue-100">
              <Phone className="size-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Phone Number</p>
              <p className="font-medium">{playerProfile.phoneNumber}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-amber-100">
              <Calendar className="size-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Member Since</p>
              <p className="font-medium">
                {new Date(playerProfile.joinedDate).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardContent className="p-4">
          <h3 className="mb-4 font-semibold">Player Stats</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <TrendingUp className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-lg font-bold">{playerProfile.rating}</p>
                <p className="text-xs text-muted-foreground">Community ELO</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
              <div className="rounded-lg bg-blue-100 p-2">
                <Swords className="size-5 text-blue-600" />
              </div>
              <div>
                <p className="text-lg font-bold">{playerProfile.matchesPlayed}</p>
                <p className="text-xs text-muted-foreground">Matches</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
              <div className="rounded-lg bg-emerald-100 p-2">
                <Award className="size-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-emerald-600">{playerProfile.wins}</p>
                <p className="text-xs text-muted-foreground">Wins</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
              <div className="rounded-lg bg-red-100 p-2">
                <User className="size-5 text-red-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-red-600">{playerProfile.losses}</p>
                <p className="text-xs text-muted-foreground">Losses</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button variant="outline" className="h-12 w-full text-red-600 hover:bg-red-50 hover:text-red-700">
        <LogOut className="mr-2 size-5" />
        Sign Out
      </Button>
    </div>
  )
}
