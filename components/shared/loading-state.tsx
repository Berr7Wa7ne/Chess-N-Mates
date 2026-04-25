"use client"

import { cn } from "@/lib/utils"
import { Spinner } from "@/components/ui/spinner"

interface LoadingStateProps {
  text?: string
  className?: string
}

export function LoadingState({ text = "Loading...", className }: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 p-8",
        className
      )}
    >
      <Spinner className="size-8" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  )
}
