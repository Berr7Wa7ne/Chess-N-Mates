import Link from "next/link"
import { Eye, CheckCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface Match {
  id: string
  competition: string
  players: string
  round: number
  status: "pending" | "submitted" | "completed" | "disputed"
  result: string
}

const matches: Match[] = [
  {
    id: "M-2851",
    competition: "Spring Swiss Championship",
    players: "GrandMaster_Alex vs KnightRider",
    round: 4,
    status: "submitted",
    result: "-",
  },
  {
    id: "M-2850",
    competition: "Spring Swiss Championship",
    players: "PawnStorm vs QueenSacrifice",
    round: 4,
    status: "pending",
    result: "-",
  },
  {
    id: "M-2849",
    competition: "Winter Knockout",
    players: "RookEndgame vs BishopPair",
    round: 4,
    status: "submitted",
    result: "-",
  },
  {
    id: "M-2848",
    competition: "Winter Knockout",
    players: "CastleKing vs EnPassant",
    round: 4,
    status: "completed",
    result: "1-0",
  },
  {
    id: "M-2847",
    competition: "Spring Swiss Championship",
    players: "KnightRider vs PawnStorm",
    round: 3,
    status: "disputed",
    result: "0-1",
  },
  {
    id: "M-2846",
    competition: "Spring Swiss Championship",
    players: "GrandMaster_Alex vs RookEndgame",
    round: 3,
    status: "completed",
    result: "1-0",
  },
  {
    id: "M-2845",
    competition: "Rapid Masters Cup",
    players: "QueenSacrifice vs CastleKing",
    round: 3,
    status: "completed",
    result: "½-½",
  },
  {
    id: "M-2844",
    competition: "Rapid Masters Cup",
    players: "BishopPair vs EnPassant",
    round: 3,
    status: "completed",
    result: "0-1",
  },
]

function getStatusBadge(status: Match["status"]) {
  switch (status) {
    case "completed":
      return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Completed</Badge>
    case "submitted":
      return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Submitted</Badge>
    case "pending":
      return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Pending</Badge>
    case "disputed":
      return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Disputed</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

export default function MatchesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Matches</h1>
        <p className="text-muted-foreground">
          Track and manage individual matches across competitions
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Matches</CardTitle>
          <CardDescription>
            View match results and manage ongoing games
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Match ID</TableHead>
                <TableHead>Competition</TableHead>
                <TableHead>Players</TableHead>
                <TableHead>Round</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Result</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matches.map((match) => (
                <TableRow key={match.id}>
                  <TableCell className="font-mono text-sm">{match.id}</TableCell>
                  <TableCell className="text-muted-foreground">{match.competition}</TableCell>
                  <TableCell className="font-medium">{match.players}</TableCell>
                  <TableCell>Round {match.round}</TableCell>
                  <TableCell>{getStatusBadge(match.status)}</TableCell>
                  <TableCell className="font-mono">{match.result}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/matches/${match.id}`}>
                          <Eye className="mr-1 size-4" />
                          View
                        </Link>
                      </Button>
                      {(match.status === "submitted" || match.status === "disputed") && (
                        <Button variant="ghost" size="sm" className="text-amber-600 hover:text-amber-700" asChild>
                          <Link href={`/admin/matches/${match.id}`}>
                            <CheckCircle className="mr-1 size-4" />
                            Force Result
                          </Link>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
