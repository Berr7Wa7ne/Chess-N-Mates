"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Filter, Info } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { currentPlayerId, getPlayerMatches } from "@/lib/admin-data"

type FilterType = "all" | "pending" | "awaiting_review" | "confirmed" | "disputed"

const allMatches = getPlayerMatches(currentPlayerId)

const statusDescriptions = {
  pending: "Awaiting your result submission",
  awaiting_review: "You submitted the result - waiting for admin review",
  confirmed: "Result confirmed by admin - match is complete",
  disputed: "Match has a dispute filed - under admin review",
}

function getStatusBadge(status: string) {
  // Map old statuses to new ones for display
  const displayStatus = status === "submitted" ? "awaiting_review" : status === "completed" ? "confirmed" : status
  
  switch (displayStatus) {
    case "pending":
      return <Badge className="bg-amber-500 text-white">Pending</Badge>
    case "awaiting_review":
      return <Badge className="bg-blue-500 text-white">Awaiting Review</Badge>
    case "confirmed":
      return <Badge className="bg-emerald-500 text-white">Confirmed</Badge>
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

// Helper to map statuses for filtering
const mapStatusForFilter = (status: string): FilterType | string => {
  if (status === "submitted") return "awaiting_review"
  if (status === "completed") return "confirmed"
  return status as FilterType
}

export default function PlayerMatchesPage() {
  const [filter, setFilter] = useState<FilterType>("all")

  const filteredMatches = useMemo(() => {
    return filter === "all"
      ? allMatches
      : allMatches.filter((match) => mapStatusForFilter(match.status) === filter)
  }, [filter])

  const filterOptions: Array<{ value: FilterType; label: string; description: string }> = [
    { value: "all", label: "All Matches", description: "" },
    { value: "pending", label: "Pending", description: "Awaiting your result submission" },
    { value: "awaiting_review", label: "Awaiting Review", description: "Waiting for admin verification" },
    { value: "confirmed", label: "Confirmed", description: "Admin verified results" },
    { value: "disputed", label: "Disputed", description: "Under dispute review" },
  ]

  return (
    <div className="space-y-4 pb-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Matches</h1>
        <p className="text-muted-foreground">{allMatches.length} total matches across all tournaments</p>
      </div>

      <TooltipProvider>
        <div className="flex flex-wrap gap-2">
          {filterOptions.map((option) => (
            <Tooltip key={option.value} delayDuration={300}>
              <TooltipTrigger asChild>
                <Button
                  variant={filter === option.value ? "default" : "outline"}
                  size="sm"
                  className="rounded-full"
                  onClick={() => setFilter(option.value)}
                >
                  {option.value === "all" ? <Filter className="mr-1.5 size-4" /> : null}
                  {option.label}
                  {option.description ? <Info className="ml-1 size-3 opacity-60" /> : null}
                </Button>
              </TooltipTrigger>
              {option.description && (
                <TooltipContent side="bottom" className="text-xs">
                  {option.description}
                </TooltipContent>
              )}
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>

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
                    <TableCell>{getStatusBadge(mapStatusForFilter(match.status))}</TableCell>
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
