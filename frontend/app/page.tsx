import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, Shield, Swords } from "lucide-react"

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="space-y-2">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Trophy className="size-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Chess Tournament</h1>
          <p className="text-muted-foreground">
            Welcome to the Chess Tournament Management Platform
          </p>
        </div>

        <div className="grid gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-center gap-2 text-lg">
                <Swords className="size-5" />
                Player Portal
              </CardTitle>
              <CardDescription>
                View matches, submit results, and track standings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" asChild>
                <Link href="/player/dashboard">Enter as Player</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-center gap-2 text-lg">
                <Shield className="size-5" />
                Admin Panel
              </CardTitle>
              <CardDescription>
                Manage tournaments, players, and disputes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/admin">Enter as Admin</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <p className="text-xs text-muted-foreground">
          Built for competitive chess tournament management
        </p>
      </div>
    </div>
  )
}
