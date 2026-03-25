'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'

export function SyncButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  async function handleSync() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setResult({ ok: false, message: data.error ?? 'Sync failed' })
      } else {
        setResult({ ok: true, message: `Synced ${data.synced} users successfully.` })
      }
    } catch {
      setResult({ ok: false, message: 'Network error — sync may have failed.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      <Button
        onClick={handleSync}
        disabled={loading}
        className="bg-brand-orange hover:bg-brand-orange/80 text-white"
      >
        <RefreshCw size={15} className={loading ? 'animate-spin mr-2' : 'mr-2'} />
        {loading ? 'Syncing…' : 'Force Sync Now'}
      </Button>

      {result && (
        <div
          className={`flex items-center gap-2 text-sm ${result.ok ? 'text-green-400' : 'text-red-400'}`}
        >
          {result.ok ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          {result.message}
        </div>
      )}
    </div>
  )
}
