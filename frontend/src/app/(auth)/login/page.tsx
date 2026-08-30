import { Suspense } from 'react'
import { AuthForm } from './auth-form'

function AuthFormFallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg-page p-3 sm:p-5">
      <div className="h-[28rem] w-full max-w-md animate-pulse rounded-[32px] bg-bg-shell" />
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
