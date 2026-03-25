export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { clearSessionCookie } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? `${req.nextUrl.protocol}//${req.nextUrl.host}`
    const headers = new Headers()
    clearSessionCookie(headers)
    return NextResponse.redirect(new URL('/login', base), {
      headers,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
