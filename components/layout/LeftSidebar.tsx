'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Trophy,
  Zap,
  Flame,
  MapPin,
  Star,
  Settings,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { User } from '@/lib/types'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { SeasonSelector } from '@/components/layout/SeasonSelector'

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { href: '/cotw', label: 'COTW', icon: Zap },
  { href: '/streaks', label: 'Streaks', icon: Flame },
  { href: '/map', label: 'Activity Map', icon: MapPin },
  { href: '/hall-of-fame', label: 'Hall of Fame', icon: Star },
]

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function LeftSidebar({ user }: { user: User }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <aside className="w-56 h-screen flex flex-col bg-brand-mid border-r border-brand-accent shrink-0">
      {/* Brand header */}
      <div className="px-5 py-5 border-b border-brand-accent">
        <p className="text-brand-orange font-black text-xl leading-none tracking-wider">ALMADEN</p>
        <p className="text-brand-orange font-black text-xl leading-none tracking-wider">FIT AF</p>
      </div>

      {/* Season selector */}
      <div className="px-3 py-3 border-b border-brand-accent">
        <SeasonSelector />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5 overflow-y-auto">
        {NAV_LINKS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-brand-orange text-white'
                  : 'text-gray-400 hover:text-white hover:bg-brand-accent'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}

        {user.is_admin && (
          <Link
            href="/admin"
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mt-2',
              pathname.startsWith('/admin')
                ? 'bg-brand-gold/20 text-brand-gold'
                : 'text-brand-gold/70 hover:text-brand-gold hover:bg-brand-accent'
            )}
          >
            <Settings className="h-4 w-4 shrink-0" />
            Admin Panel
          </Link>
        )}
      </nav>

      {/* User footer */}
      <div className="px-3 py-3 border-t border-brand-accent flex items-center gap-2">
        <Avatar className="h-8 w-8 shrink-0">
          {user.photo_url ? (
            <AvatarImage src={user.photo_url} alt={user.name} />
          ) : null}
          <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
        </Avatar>
        <span className="flex-1 text-xs text-white font-medium truncate min-w-0">
          {user.name}
        </span>
        <button
          onClick={handleSignOut}
          className="text-gray-500 hover:text-red-400 transition-colors shrink-0"
          title="Sign out"
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </aside>
  )
}
