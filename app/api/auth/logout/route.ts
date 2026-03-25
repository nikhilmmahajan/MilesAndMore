export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { clearSessionCookie } from '@/lib/auth'

export async function POST() {
  try {
    const headers = new Headers()
    clearSessionCookie(headers)
    return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'), {
      headers,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
