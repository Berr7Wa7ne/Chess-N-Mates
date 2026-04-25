"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

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
  return (
    <TooltipProvider>
      <div className={`flex items-center gap-2 ${className}`}>
        <Link
          href={`/admin/players/${playerId}`}
          className="font-medium text-blue-600 hover:text-blue-700 hover:underline truncate max-w-xs"
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="block truncate">{username}</span>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>{username}</p>
            </TooltipContent>
          </Tooltip>
        </Link>
        <Badge variant="secondary" className="ml-auto whitespace-nowrap">
          {elo}
        </Badge>
      </div>
    </TooltipProvider>
  )
}

export default PlayerIdentity
