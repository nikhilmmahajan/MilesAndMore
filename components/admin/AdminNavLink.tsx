'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export function AdminNavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname()
  const isActive = pathname === href || (href !== '/admin' && pathname.startsWith(href))

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
        isActive
          ? 'bg-brand-orange text-white font-medium'
          : 'text-gray-300 hover:bg-brand-accent hover:text-white'
      )}
    >
      {children}
    </Link>
  )
}
