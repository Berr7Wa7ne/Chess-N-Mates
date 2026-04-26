"use client"

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface TextTruncateProps {
  text: string
  maxLength?: number
  lines?: number
  className?: string
  showTooltip?: boolean
  maxWidthClassName?: string
}

export function TextTruncate({
  text,
  maxLength = 50,
  lines = 1,
  className = "",
  showTooltip = true,
  maxWidthClassName = "max-w-[220px]",
}: TextTruncateProps) {
  const isTruncated = text.length > maxLength

  const lineClamp = lines > 1 ? `line-clamp-${lines}` : ""

  const content = (
    <span
      className={`block min-w-0 w-full truncate ${maxWidthClassName} ${lineClamp} ${className}`}
    >
      {text}
    </span>
  )

  if (!isTruncated || !showTooltip) {
    return content
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="break-words">{text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default TextTruncate
