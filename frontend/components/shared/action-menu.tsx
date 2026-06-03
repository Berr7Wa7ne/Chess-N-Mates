"use client"

import { MoreHorizontal, Eye, CheckCircle, XCircle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface ActionMenuItem {
  label: string
  icon?: React.ReactNode
  onClick?: () => void
  href?: string
  variant?: "default" | "destructive"
  separator?: boolean
}

interface ActionMenuProps {
  items: ActionMenuItem[]
}

export function ActionMenu({ items }: ActionMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-9 rounded-md">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {items.map((item, index) => (
          <div key={index}>
            {item.separator && <DropdownMenuSeparator />}
            {item.href ? (
              <DropdownMenuItem asChild>
                <Link
                  href={item.href}
                  className={
                    item.variant === "destructive" ? "text-red-600 focus:text-red-600" : ""
                  }
                >
                  {item.icon && <span className="mr-2 flex h-4 w-4 items-center justify-center">{item.icon}</span>}
                  {item.label}
                </Link>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={item.onClick}
                className={
                  item.variant === "destructive" ? "text-red-600 focus:text-red-600" : ""
                }
              >
                {item.icon && <span className="mr-2 flex h-4 w-4 items-center justify-center">{item.icon}</span>}
                {item.label}
              </DropdownMenuItem>
            )}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Preset menu builders
export function createViewMenuItem(href: string) {
  return { label: "View", icon: <Eye className="h-4 w-4" />, href }
}

export function createApproveMenuItem(onClick: () => void) {
  return {
    label: "Approve",
    icon: <CheckCircle className="h-4 w-4" />,
    onClick,
  }
}

export function createRejectMenuItem(onClick: () => void) {
  return {
    label: "Reject",
    icon: <XCircle className="h-4 w-4" />,
    onClick,
    variant: "destructive" as const,
  }
}

export default ActionMenu
