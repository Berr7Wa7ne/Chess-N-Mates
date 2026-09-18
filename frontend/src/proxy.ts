import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/register']
type UserRole = 'admin' | 'player'

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  )
}

function getDashboardPath(role: UserRole) {
  return role === 'admin' ? '/admin/dashboard' : '/player/dashboard'
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isAuthenticated = request.cookies.get('chess_auth')?.value === '1'
  const role = request.cookies.get('chess_role')?.value as UserRole | undefined

  if (pathname === '/') {
    if (isAuthenticated && role) {
      return NextResponse.redirect(new URL(getDashboardPath(role), request.url))
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (pathname === '/register') {
    return NextResponse.redirect(new URL('/login?mode=register', request.url))
  }

  if (isPublicPath(pathname) && isAuthenticated && role) {
    return NextResponse.redirect(new URL(getDashboardPath(role), request.url))
  }

  if (!isAuthenticated && (pathname.startsWith('/admin') || pathname.startsWith('/player'))) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isAuthenticated && pathname.startsWith('/admin') && role !== 'admin') {
    return NextResponse.redirect(
      new URL(role ? getDashboardPath(role) : '/login', request.url)
    )
  }

  if (isAuthenticated && pathname.startsWith('/player') && role !== 'player') {
    return NextResponse.redirect(
      new URL(role ? getDashboardPath(role) : '/login', request.url)
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\..*).*)'],
}