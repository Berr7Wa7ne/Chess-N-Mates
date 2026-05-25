"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Filter } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { currentPlayerId, getPlayerMatches } from "@/lib/admin-data"

type FilterType = "all" | "pending" | "submitted" | "completed" | "disputed"

const allMatches = getPlayerMatches(currentPlayerId)

function getStatusBadge(status: string) {
  switch (status) {
    case "pending":
      return <Badge className="bg-amber-500 text-white">Pending</Badge>
    case "submitted":
      return <Badge className="bg-blue-500 text-white">Submitted</Badge>
    case "completed":
      return <Badge className="bg-emerald-500 text-white">Completed</Badge>
    case "disputed":
      return <Badge className="bg-red-500 text-white">Disputed</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function getResultBadge(result: string | undefined) {
  if (!result) return <span className="text-muted-foreground">-</span>
  switch (result) {
    case "win":
      return <Badge className="bg-emerald-500 text-white">Win</Badge>
    case "loss":
      return <Badge className="bg-red-500 text-white">Loss</Badge>
    case "draw":
      return <Badge className="bg-slate-500 text-white">Draw</Badge>
    default:
      return <span>{result}</span>
  }
}

export default function PlayerMatchesPage() {
  const [filter, setFilter] = useState<FilterType>("all")

  const filteredMatches = useMemo(() => {
    return filter === "all" ? allMatches : allMatches.filter((match) => match.status === filter)
  }, [filter])

  return (
    <div className="space-y-4 pb-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Matches</h1>
        <p className="text-muted-foreground">{allMatches.length} total matches</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {(["all", "pending", "submitted", "completed", "disputed"] as const).map((option) => (
          <Button
            key={option}
            variant={filter === option ? "default" : "outline"}
            size="sm"
            className="shrink-0 rounded-full"
            onClick={() => setFilter(option)}
          >
            {option === "all" ? <Filter className="mr-1.5 size-4" /> : null}
            {option[0].toUpperCase() + option.slice(1)}
          </Button>
        ))}
      </div>

      <Card className="shadow-sm">
        <CardContent className="px-0 sm:px-6">
          {filteredMatches.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Competition</TableHead>
                  <TableHead>Opponent</TableHead>
                  <TableHead>Round</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMatches.map((match) => (
                  <TableRow key={match.id}>
                    <TableCell className="font-medium">{match.competition}</TableCell>
                    <TableCell>{match.opponent}</TableCell>
                    <TableCell>Round {match.round}</TableCell>
                    <TableCell className="capitalize">{match.playerColor}</TableCell>
                    <TableCell>{getStatusBadge(match.status)}</TableCell>
                    <TableCell>{getResultBadge(match.result)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/player/matches/${match.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-lg font-medium">No matches found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {filter === "all" ? "You do not have any matches yet." : `No ${filter} matches right now.`}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
