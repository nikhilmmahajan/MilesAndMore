'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Zap } from 'lucide-react'

export function ActivateSeasonButton({ seasonId, seasonName }: { seasonId: string; seasonName: string }) {
  const [loading, setLoading] = useState(false)

  async function handleActivate() {
    if (!confirm(`Activate "${seasonName}"? This will archive the current active season.`)) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/seasons/${seasonId}/activate`, { method: 'POST' })
      if (res.ok) {
        window.location.reload()
      } else {
        const data = await res.json()
        alert(data.error ?? 'Failed to activate season')
      }
    } catch {
      alert('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleActivate}
      disabled={loading}
      className="border-brand-orange text-brand-orange hover:bg-brand-orange hover:text-white text-xs h-7"
    >
      <Zap size={12} className="mr-1" />
      {loading ? 'Activating…' : 'Activate'}
    </Button>
  )
}
