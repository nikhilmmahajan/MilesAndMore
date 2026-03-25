'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Crown, CheckCircle, AlertCircle } from 'lucide-react'

interface Submitter {
  user_id: string
  name: string
  photo_url: string | null
  gender: 'M' | 'F' | null
  score_text: string | null
  is_winner: boolean
}

interface Props {
  cotwId: string
  submitters: Submitter[]
}

export function WinnerDeclaration({ cotwId, submitters }: Props) {
  const [winners, setWinners] = useState<Set<string>>(
    new Set(submitters.filter((s) => s.is_winner).map((s) => s.user_id))
  )
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [messages, setMessages] = useState<Record<string, { ok: boolean; text: string }>>({})

  const males = submitters.filter((s) => s.gender === 'M')
  const females = submitters.filter((s) => s.gender === 'F')

  async function handleCrown(userId: string, gender: 'M' | 'F') {
    setLoading((p) => ({ ...p, [userId]: true }))
    try {
      const res = await fetch('/api/admin/cotw/winner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cotw_id: cotwId, user_id: userId, gender }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessages((p) => ({ ...p, [userId]: { ok: false, text: data.error ?? 'Failed' } }))
      } else {
        setWinners((p) => { const next = new Set(Array.from(p)); next.add(userId); return next })
        setMessages((p) => ({ ...p, [userId]: { ok: true, text: 'Crowned!' } }))
      }
    } catch {
      setMessages((p) => ({ ...p, [userId]: { ok: false, text: 'Network error' } }))
    } finally {
      setLoading((p) => ({ ...p, [userId]: false }))
    }
  }

  function SubmitterRow({ s }: { s: Submitter }) {
    const isWinner = winners.has(s.user_id)
    return (
      <div className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-brand-accent/20">
        {s.photo_url ? (
          <img src={s.photo_url} alt={s.name} className="w-7 h-7 rounded-full object-cover" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-brand-accent flex items-center justify-center text-xs text-white">
            {s.name[0]}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white truncate">{s.name}</p>
          {s.score_text && <p className="text-xs text-gray-400 truncate">{s.score_text}</p>}
        </div>
        {isWinner ? (
          <span className="flex items-center gap-1 text-brand-gold text-xs font-medium">
            <Crown size={13} />
            Winner
          </span>
        ) : (
          <Button
            size="sm"
            onClick={() => handleCrown(s.user_id, s.gender as 'M' | 'F')}
            disabled={loading[s.user_id]}
            className="bg-brand-gold/20 hover:bg-brand-gold/40 text-brand-gold border border-brand-gold/40 text-xs h-7 px-2"
          >
            <Crown size={12} className="mr-1" />
            {loading[s.user_id] ? '…' : 'Crown'}
          </Button>
        )}
        {messages[s.user_id] && (
          <div
            className={`flex items-center gap-1 text-xs ${messages[s.user_id].ok ? 'text-green-400' : 'text-red-400'}`}
          >
            {messages[s.user_id].ok ? <CheckCircle size={11} /> : <AlertCircle size={11} />}
            {messages[s.user_id].text}
          </div>
        )}
      </div>
    )
  }

  if (submitters.length === 0) {
    return <p className="text-gray-500 text-xs">No full-form submissions yet.</p>
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <p className="text-xs text-gray-400 font-medium mb-2 uppercase tracking-wider">
          Men ({males.length})
        </p>
        <div className="space-y-1">
          {males.length === 0 && <p className="text-gray-600 text-xs">None</p>}
          {males.map((s) => <SubmitterRow key={s.user_id} s={s} />)}
        </div>
      </div>
      <div>
        <p className="text-xs text-gray-400 font-medium mb-2 uppercase tracking-wider">
          Women ({females.length})
        </p>
        <div className="space-y-1">
          {females.length === 0 && <p className="text-gray-600 text-xs">None</p>}
          {females.map((s) => <SubmitterRow key={s.user_id} s={s} />)}
        </div>
      </div>
    </div>
  )
}
