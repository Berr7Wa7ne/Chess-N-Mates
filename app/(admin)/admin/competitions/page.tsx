"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Plus, Search, Trophy } from "lucide-react"
import { EmptyState, PageHeader } from "@/components/shared"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { competitions, getCompetitionFixtures, getCompetitionResults, getCurrentCompetition, type CompetitionStatus, type CompetitionType } from "@/lib/admin-data"

function getTypeBadge(type: CompetitionType) {
  switch (type) {
    case "Swiss":
      return <Badge variant="outline" className="border-blue-500/20 bg-blue-500/10 text-blue-700">Swiss</Badge>
    case "Knockout":
      return <Badge variant="outline" className="border-red-500/20 bg-red-500/10 text-red-700">Knockout</Badge>
    case "Round Robin":
      return <Badge variant="outline" className="border-orange-500/20 bg-orange-500/10 text-orange-700">Round Robin</Badge>
  }
}

function getStatusBadge(status: CompetitionStatus) {
  switch (status) {
    case "active":
      return <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600">Active</Badge>
    case "pending":
      return <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-600">Pending</Badge>
    case "completed":
      return <Badge variant="secondary">Completed</Badge>
  }
}

const currentCompetition = getCurrentCompetition()

export default function CompetitionsPage() {
  const [nameFilter, setNameFilter] = useState("")
  const [typeFilter, setTypeFilter] = useState<"all" | CompetitionType>("all")
  const [statusFilter, setStatusFilter] = useState<"all" | CompetitionStatus>("all")

  const filteredCompetitions = useMemo(() => {
    return competitions.filter((competition) => {
      const matchesName = competition.name.toLowerCase().includes(nameFilter.toLowerCase())
      const matchesType = typeFilter === "all" || competition.type === typeFilter
      const matchesStatus = statusFilter === "all" || competition.status === statusFilter
      return matchesName && matchesType && matchesStatus
    })
  }, [nameFilter, typeFilter, statusFilter])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Competitions"
        subtitle="Create competitions, generate fixtures, and manage current and past tournament history."
        action={{ label: "Add Competition", icon: <Plus className="size-4" /> }}
      />

      <Card className="rounded-lg shadow-sm">
        <CardHeader>
          <CardTitle>Ongoing Tournament</CardTitle>
          <CardDescription>
            This section always appears first and is where fixtures, results, and tournament progress now live.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentCompetition ? (
            <div className="grid gap-4 rounded-2xl border bg-muted/20 p-5 md:grid-cols-[1.6fr_1fr]">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold">{currentCompetition.name}</h2>
                  {getStatusBadge(currentCompetition.status)}
                  {getTypeBadge(currentCompetition.type)}
                </div>
                <p className="text-sm text-muted-foreground">{currentCompetition.description}</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Round</p>
                    <p className="font-medium">
                      {currentCompetition.currentRound} of {currentCompetition.rounds}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Fixtures</p>
                    <p className="font-medium">{getCompetitionFixtures(currentCompetition.id).length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Results</p>
                    <p className="font-medium">{getCompetitionResults(currentCompetition.id).length}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-between gap-4 rounded-2xl border bg-background p-4">
                <div>
                  <p className="text-sm text-muted-foreground">Tournament controls</p>
                  <p className="mt-1 text-sm">
                    Create fixtures, review submitted results, and open the detailed competition workspace from here.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button asChild>
                    <Link href={`/admin/competitions/${currentCompetition.id}`}>Open Details</Link>
                  </Button>
                  <Button variant="outline">Generate Fixtures</Button>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={<Trophy className="size-8" />}
              title="No ongoing tournament"
              description="Create a new competition when you are ready to start the next tournament."
            />
          )}
        </CardContent>
      </Card>

      <Card className="rounded-lg shadow-sm">
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardTitle>All Competitions</CardTitle>
              <CardDescription>History of all current and past competitions, with quick access to full details.</CardDescription>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={nameFilter}
                  onChange={(event) => setNameFilter(event.target.value)}
                  placeholder="Filter by name"
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {(["all", "Swiss", "Knockout", "Round Robin"] as const).map((type) => (
                  <Button
                    key={type}
                    size="sm"
                    variant={typeFilter === type ? "default" : "outline"}
                    onClick={() => setTypeFilter(type)}
                  >
                    {type}
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {(["all", "active", "pending", "completed"] as const).map((status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant={statusFilter === status ? "default" : "outline"}
                    onClick={() => setStatusFilter(status)}
                  >
                    {status}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Players</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCompetitions.map((competition) => (
                <TableRow
                  key={competition.id}
                  className="cursor-pointer transition-colors hover:bg-muted/50"
                  onClick={() => {
                    window.location.href = `/admin/competitions/${competition.id}`
                  }}
                >
                  <TableCell className="font-medium">{competition.name}</TableCell>
                  <TableCell>{getTypeBadge(competition.type)}</TableCell>
                  <TableCell>{getStatusBadge(competition.status)}</TableCell>
                  <TableCell>{competition.playerCount}</TableCell>
                  <TableCell className="text-muted-foreground">{competition.startDate}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Link href={`/admin/competitions/${competition.id}`}>View</Link>
                    </Button>
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
