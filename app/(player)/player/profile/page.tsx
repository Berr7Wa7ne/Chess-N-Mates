"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Edit2, 
  Phone, 
  User, 
  Check, 
  X, 
  ExternalLink, 
  Trophy,
  Swords,
  Award,
  TrendingUp,
  Calendar,
  LogOut
} from "lucide-react"

// Mock player profile
const playerProfile = {
  username: "JohnDoe",
  platform: "Chess.com",
  platformUrl: "https://chess.com/member/johndoe",
  phoneNumber: "+1 (555) 123-4567",
  status: "active",
  joinedDate: "2024-01-15",
  rating: 1847,
  rank: 15,
  matchesPlayed: 42,
  wins: 24,
  losses: 12,
  draws: 6,
}

export default function PlayerProfilePage() {
  const [isEditing, setIsEditing] = useState(false)
  const [username, setUsername] = useState(playerProfile.username)
  const [tempUsername, setTempUsername] = useState(username)

  const handleSave = () => {
    setUsername(tempUsername)
    setIsEditing(false)
    // In production: API call to update username
  }

  const handleCancel = () => {
    setTempUsername(username)
    setIsEditing(false)
  }

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">Manage your account</p>
      </div>

      {/* Profile Header Card */}
      <Card className="overflow-hidden shadow-sm">
        <CardContent className="p-0">
          {/* Profile Banner */}
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6">
            <div className="flex flex-col items-center text-center">
              {/* Avatar */}
              <div className="mb-3 flex size-20 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground shadow-lg">
                {username.slice(0, 2).toUpperCase()}
              </div>
              
              {/* Username */}
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={tempUsername}
                    onChange={(e) => setTempUsername(e.target.value)}
                    className="h-10 max-w-[200px] text-center font-semibold"
                    autoFocus
                  />
                  <Button size="icon" variant="ghost" onClick={handleSave} className="shrink-0">
                    <Check className="size-5 text-emerald-600" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={handleCancel} className="shrink-0">
                    <X className="size-5 text-red-600" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">{username}</h2>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit2 className="size-4" />
                  </Button>
                </div>
              )}
              
              {/* Status Badge */}
              <Badge
                className={`mt-2 ${
                  playerProfile.status === "active"
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-500 text-white"
                }`}
              >
                {playerProfile.status === "active" ? "Active Player" : "Inactive"}
              </Badge>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-3 divide-x border-t">
            <div className="p-4 text-center">
              <p className="text-2xl font-bold">{playerProfile.rating}</p>
              <p className="text-xs text-muted-foreground">Rating</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-2xl font-bold">#{playerProfile.rank}</p>
              <p className="text-xs text-muted-foreground">Rank</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-2xl font-bold">{playerProfile.wins}</p>
              <p className="text-xs text-muted-foreground">Wins</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Details */}
      <Card className="shadow-sm">
        <CardContent className="divide-y p-0">
          {/* Platform */}
          <div className="flex items-center gap-4 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-100">
              <Trophy className="size-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Chess Platform</p>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={
                    playerProfile.platform === "Chess.com"
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-purple-50 text-purple-700 border-purple-200"
                  }
                >
                  {playerProfile.platform}
                </Badge>
              </div>
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
          
          {/* Phone Number */}
          <div className="flex items-center gap-4 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-blue-100">
              <Phone className="size-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Phone Number</p>
              <p className="font-medium">{playerProfile.phoneNumber}</p>
            </div>
          </div>
          
          {/* Member Since */}
          <div className="flex items-center gap-4 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-amber-100">
              <Calendar className="size-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Member Since</p>
              <p className="font-medium">
                {new Date(playerProfile.joinedDate).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Card */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <h3 className="mb-4 font-semibold">Tournament Stats</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <TrendingUp className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-lg font-bold">{playerProfile.rating}</p>
                <p className="text-xs text-muted-foreground">Rating</p>
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

      {/* Sign Out */}
      <Button variant="outline" className="h-12 w-full text-red-600 hover:bg-red-50 hover:text-red-700">
        <LogOut className="mr-2 size-5" />
        Sign Out
      </Button>
    </div>
  )
}
