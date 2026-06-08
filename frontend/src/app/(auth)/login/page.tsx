import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { AuthForm } from './auth-form'

function AuthFormFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Skeleton className="h-96 w-full max-w-md rounded-xl" />
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthFormFallback />}>
      <AuthForm />
    </Suspense>
  )
}
