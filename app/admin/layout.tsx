export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import { AdminNavLink } from '@/components/admin/AdminNavLink'
import {
  BarChart2,
  CalendarDays,
  Users,
  Zap,
  Gift,
  Flag,
  Bell,
  Download,
  ArrowLeft,
} from 'lucide-react'

const navItems = [
  { href: '/admin', label: 'Overview', Icon: BarChart2 },
  { href: '/admin/seasons', label: 'Seasons', Icon: CalendarDays },
  { href: '/admin/teams', label: 'Teams', Icon: Users },
  { href: '/admin/cotw', label: 'COTW', Icon: Zap },
  { href: '/admin/bonuses', label: 'Bonuses', Icon: Gift },
  { href: '/admin/activities', label: 'Activities', Icon: Flag },
  { href: '/admin/nudges', label: 'Nudges', Icon: Bell },
  { href: '/admin/import', label: 'Import', Icon: Download },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireAdmin()
  } catch {
    redirect('/dashboard')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-brand-dark">
      {/* Sidebar */}
      <aside className="bg-brand-mid border-r border-brand-accent w-48 flex-shrink-0 flex flex-col p-4 space-y-1">
        <div className="mb-4 px-3">
          <p className="text-xs font-semibold text-brand-orange uppercase tracking-wider">Admin Panel</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Almaden Fit AF</p>
        </div>

        {navItems.map(({ href, label, Icon }) => (
          <AdminNavLink key={href} href={href}>
            <Icon size={15} />
            {label}
          </AdminNavLink>
        ))}

        <div className="flex-1" />

        <div className="pt-4 border-t border-brand-accent">
          <AdminNavLink href="/dashboard">
            <ArrowLeft size={15} />
            Back to Portal
          </AdminNavLink>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  )
}
