export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Zap } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'

interface LoginPageProps {
  searchParams: { error?: string }
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUser()
  if (user) redirect('/dashboard')

  const error = searchParams.error

  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <p className="text-brand-orange font-black text-4xl leading-none tracking-wider">ALMADEN</p>
          <p className="text-brand-orange font-black text-4xl leading-none tracking-wider">FIT AF</p>
          <p className="text-gray-400 text-sm mt-3">Season 7 · Community Fitness Portal</p>
        </div>

        {/* Error banners */}
        {error === 'strava_denied' && (
          <div className="mb-4 rounded-xl border border-red-600 bg-red-950 px-4 py-3 text-red-300 text-sm">
            Strava authorization was denied. Please try again.
          </div>
        )}
        {error === 'token_exchange' && (
          <div className="mb-4 rounded-xl border border-red-600 bg-red-950 px-4 py-3 text-red-300 text-sm">
            Authentication failed. Please try again.
          </div>
        )}

        {/* Card */}
        <div className="rounded-xl border border-brand-accent bg-brand-mid p-8 shadow-lg">
          <p className="text-white text-center text-sm mb-6">
            Sign in to track your workouts, compete on the leaderboard, and earn points with your community.
          </p>

          <Link
            href="/api/auth/strava"
            className="flex items-center justify-center gap-2 w-full rounded-lg px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#FC4C02' }}
          >
            <Zap className="h-4 w-4" />
            Connect with Strava
          </Link>

          <p className="text-gray-500 text-xs text-center mt-4 leading-relaxed">
            By connecting, you allow Almaden Fit AF to read your Strava activities.
          </p>
        </div>

        {/* Dev bypass — only shown in development */}
        {process.env.NODE_ENV !== 'production' && (
          <div className="mt-6 rounded-xl border border-dashed border-yellow-600/50 bg-yellow-950/20 p-4">
            <p className="text-yellow-500 text-xs font-semibold text-center mb-3">
              ⚡ Dev Mode — Strava not configured yet
            </p>
            <Link
              href="/api/dev/login"
              className="flex items-center justify-center gap-2 w-full rounded-lg border border-yellow-600/50 px-4 py-2.5 text-sm font-semibold text-yellow-400 hover:bg-yellow-950/40 transition-colors"
            >
              Enter as Dev Admin (no Strava needed)
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
