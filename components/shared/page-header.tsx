"use client"

import Link from "next/link"
import { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: {
    label: string
    onClick?: () => void
    href?: string
    icon?: ReactNode
    className?: string
  }
  children?: ReactNode
  className?: string
}

export function PageHeader({
  title,
  subtitle,
  action,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-muted-foreground">{subtitle}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3 self-start">
        {children}
        {action?.href ? (
          <Button asChild className={cn("h-12 rounded-2xl bg-black px-6 text-sm text-white hover:bg-slate-900", action.className)}>
            <Link href={action.href}>
              {action.icon}
              <span>{action.label}</span>
            </Link>
          </Button>
        ) : action ? (
          <Button className={cn("h-12 rounded-2xl bg-black px-6 text-sm text-white hover:bg-slate-900", action.className)} onClick={action.onClick} type="button">
            {action.icon}
            <span>{action.label}</span>
          </Button>
        ) : null}
      </div>
    </div>
  )
}

export default PageHeader
