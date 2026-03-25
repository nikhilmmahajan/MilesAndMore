import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// API routes handle their own auth server-side — middleware only guards pages
const PROTECTED_PAGES = [
  '/dashboard', '/leaderboard', '/cotw', '/streaks',
  '/map', '/hall-of-fame', '/profile', '/admin',
]

export function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl

    // ── Cron: must carry Bearer token ──────────────────────────────────────
    if (pathname.startsWith('/api/cron/')) {
      const secret = process.env.CRON_SECRET
      const auth   = request.headers.get('authorization')
      if (!secret || auth !== `Bearer ${secret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      return NextResponse.next()
    }

    // ── Static assets & Next.js internals ──────────────────────────────────
    if (
      pathname.startsWith('/_next') ||
      pathname.startsWith('/icons') ||
      pathname.includes('.')
    ) {
      return NextResponse.next()
    }

    // ── All /api/* routes pass through (they guard themselves) ──────────────
    if (pathname.startsWith('/api/')) {
      return NextResponse.next()
    }

    const userId = request.cookies.get('almaden_user_id')?.value

    // ── Root: send to dashboard or login ───────────────────────────────────
    if (pathname === '/') {
      return NextResponse.redirect(
        new URL(userId ? '/dashboard' : '/login', request.url)
      )
    }

    // ── Login page: redirect already-authenticated users ───────────────────
    if (pathname === '/login') {
      if (userId) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
      return NextResponse.next()
    }

    // ── Protected pages: require auth ──────────────────────────────────────
    if (PROTECTED_PAGES.some((p) => pathname.startsWith(p))) {
      if (!userId) {
        return NextResponse.redirect(new URL('/login', request.url))
      }
    }

    return NextResponse.next()
  } catch {
    // Never let middleware crash the entire request
    return NextResponse.next()
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
