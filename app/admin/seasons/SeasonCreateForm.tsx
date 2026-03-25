'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, AlertCircle, PlusCircle } from 'lucide-react'

export function SeasonCreateForm() {
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/seasons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, start_date: startDate, end_date: endDate }),
      })
      const data = await res.json()
      if (!res.ok) {
        setResult({ ok: false, message: data.error ?? 'Failed to create season' })
      } else {
        setResult({ ok: true, message: `Season "${name}" created successfully.` })
        setName('')
        setStartDate('')
        setEndDate('')
        // Refresh
        window.location.reload()
      }
    } catch {
      setResult({ ok: false, message: 'Network error.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="bg-brand-mid border-brand-accent">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <PlusCircle size={18} className="text-brand-orange" />
          Create New Season
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Season Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Almaden Season 8"
              required
              className="admin-input w-full"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="admin-input w-full"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="admin-input w-full"
              />
            </div>
          </div>

          <div className="bg-brand-accent/30 border border-brand-accent rounded-md px-4 py-3 text-sm text-gray-400">
            <strong className="text-brand-gold">Note:</strong> After creating a season, use the
            Supabase dashboard to configure{' '}
            <code className="text-brand-orange">track_config</code> until the UI is ready.
          </div>

          <div className="flex items-center gap-4">
            <Button
              type="submit"
              disabled={loading}
              className="bg-brand-orange hover:bg-brand-orange/80 text-white"
            >
              {loading ? 'Creating…' : 'Create Season'}
            </Button>
            {result && (
              <div
                className={`flex items-center gap-2 text-sm ${result.ok ? 'text-green-400' : 'text-red-400'}`}
              >
                {result.ok ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                {result.message}
              </div>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
