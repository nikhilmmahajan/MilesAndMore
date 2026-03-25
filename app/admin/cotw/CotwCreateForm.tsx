'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PlusCircle, CheckCircle, AlertCircle } from 'lucide-react'

interface Props {
  seasonId: string
}

export function CotwCreateForm({ seasonId }: Props) {
  const [weekStartDate, setWeekStartDate] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [participationPts, setParticipationPts] = useState('120')
  const [winnerBonusPts, setWinnerBonusPts] = useState('50')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/cotw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          season_id: seasonId,
          week_start_date: weekStartDate,
          title,
          description,
          video_url: videoUrl || null,
          participation_pts: parseInt(participationPts),
          winner_bonus_pts: parseInt(winnerBonusPts),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setResult({ ok: false, message: data.error ?? 'Failed to create challenge' })
      } else {
        setResult({ ok: true, message: `Challenge "${title}" created!` })
        setWeekStartDate('')
        setTitle('')
        setDescription('')
        setVideoUrl('')
        setParticipationPts('120')
        setWinnerBonusPts('50')
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
          Create Challenge of the Week
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Week Start Date (Monday)</label>
              <Input
                type="date"
                value={weekStartDate}
                onChange={(e) => setWeekStartDate(e.target.value)}
                required
                className="admin-input w-full"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. 100 Push-Ups Challenge"
                required
                className="admin-input w-full"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the challenge, rules, scoring criteria…"
              rows={3}
              className="admin-input w-full"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">Video URL (optional)</label>
            <Input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/…"
              className="admin-input w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Participation Points</label>
              <Input
                type="number"
                value={participationPts}
                onChange={(e) => setParticipationPts(e.target.value)}
                min={0}
                required
                className="admin-input w-full"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Winner Bonus Points</label>
              <Input
                type="number"
                value={winnerBonusPts}
                onChange={(e) => setWinnerBonusPts(e.target.value)}
                min={0}
                required
                className="admin-input w-full"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button
              type="submit"
              disabled={loading}
              className="bg-brand-orange hover:bg-brand-orange/80 text-white"
            >
              {loading ? 'Creating…' : 'Create Challenge'}
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
