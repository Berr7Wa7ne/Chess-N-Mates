"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { useIsMobile } from "@/hooks/use-mobile"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface PlayerIdentityProps {
  playerId: number
  username: string
  elo: number
  className?: string
}

export function PlayerIdentity({
  playerId,
  username,
  elo,
  className = "",
}: PlayerIdentityProps) {
  const isMobile = useIsMobile()
  const eloPill = (
    <Badge
      variant="secondary"
      className="rounded-full border-0 bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
    >
      {elo}
    </Badge>
  )

  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <Link
        href={`/admin/players/${playerId}`}
        className="min-w-0 truncate font-medium text-blue-600 hover:text-blue-700 hover:underline"
      >
        {username}
      </Link>
      {isMobile ? (
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="shrink-0 rounded-full p-0.5">
              {eloPill}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto rounded-lg px-3 py-2 text-xs font-medium">
            ELO Rating
          </PopoverContent>
        </Popover>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="shrink-0">{eloPill}</span>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={6}>
            <p>ELO Rating</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}

export default PlayerIdentity
