import Link from 'next/link'
import { Trophy } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string
  description: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Trophy className="size-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Chess Tournament</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>Sign in to manage competitions and matches</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">{children}</CardContent>
        </Card>

        {footer}
      </div>
    </div>
  )
}

export function AuthFooterLink({
  text,
  linkText,
  href,
}: {
  text: string
  linkText: string
  href: string
}) {
  return (
    <p className="text-center text-sm text-muted-foreground">
      {text}{' '}
      <Link href={href} className="font-medium text-primary underline-offset-4 hover:underline">
        {linkText}
      </Link>
    </p>
  )
}
