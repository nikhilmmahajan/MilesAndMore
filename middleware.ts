import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/', '/login', '/api/auth', '/api/dev']
const PORTAL_PATHS = ['/dashboard', '/leaderboard', '/cotw', '/streaks', '/map', '/hall-of-fame', '/profile']
const ADMIN_PATHS = ['/admin']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const userId = request.cookies.get('almaden_user_id')?.value

  // Cron routes require Bearer token
  if (pathname.startsWith('/api/cron/')) {
    const auth = request.headers.get('authorization')
    const secret = process.env.CRON_SECRET
    if (!secret || auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.next()
  }

  // Public paths always allowed
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    // Redirect logged-in users away from /login
    if (pathname === '/login' && userId) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.next()
  }

  // Static + Next internals
  if (pathname.startsWith('/_next') || pathname.startsWith('/icons') || pathname.includes('.')) {
    return NextResponse.next()
  }

  // Portal and admin pages require auth
  const needsAuth =
    PORTAL_PATHS.some((p) => pathname.startsWith(p)) ||
    ADMIN_PATHS.some((p) => pathname.startsWith(p))

  if (needsAuth && !userId) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
