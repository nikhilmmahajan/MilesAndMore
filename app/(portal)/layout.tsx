export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { getMany } from '@/lib/db'
import type { Season } from '@/lib/types'
import { SeasonProvider } from '@/lib/context/SeasonContext'
import { LeftSidebar } from '@/components/layout/LeftSidebar'
import { PulseFeed } from '@/components/pulse/PulseFeed'
import { CommissionerWidget } from '@/components/commissioner/CommissionerWidget'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  let user
  try {
    user = await requireUser()
  } catch {
    redirect('/login')
  }

  const seasons = await getMany<Season>(
    'SELECT * FROM seasons ORDER BY start_date DESC'
  )

  return (
    <SeasonProvider initialSeasons={seasons}>
      <div className="flex h-screen overflow-hidden bg-brand-dark">
        <LeftSidebar user={user} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
        <PulseFeed />
        <CommissionerWidget />
      </div>
    </SeasonProvider>
  )
}
