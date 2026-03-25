'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Send, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import { timeAgo } from '@/lib/utils'

interface InactiveUser {
  id: string
  name: string
  photo_url: string | null
  last_synced_at: string | null
}

interface Props {
  inactiveUsers: InactiveUser[]
}

export function NudgeManager({ inactiveUsers }: Props) {
  const [messages, setMessages] = useState<Record<string, string>>(
    Object.fromEntries(inactiveUsers.map((u) => [u.id, '']))
  )
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [results, setResults] = useState<Record<string, { ok: boolean; text: string }>>({})

  async function handleSend(userId: string) {
    const message = messages[userId]?.trim()
    if (!message) return
    setLoading((p) => ({ ...p, [userId]: true }))
    setResults((p) => ({ ...p, [userId]: undefined as never }))
    try {
      const res = await fetch('/api/admin/nudges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient_id: userId, message }),
      })
      const data = await res.json()
      if (!res.ok) {
        setResults((p) => ({ ...p, [userId]: { ok: false, text: data.error ?? 'Failed' } }))
      } else {
        setResults((p) => ({ ...p, [userId]: { ok: true, text: 'Nudge sent!' } }))
        setMessages((p) => ({ ...p, [userId]: '' }))
      }
    } catch {
      setResults((p) => ({ ...p, [userId]: { ok: false, text: 'Network error' } }))
    } finally {
      setLoading((p) => ({ ...p, [userId]: false }))
    }
  }

  if (inactiveUsers.length === 0) {
    return (
      <div className="flex items-center gap-3 text-green-400 py-4">
        <CheckCircle size={18} />
        <span className="text-sm">All challengers have been active recently!</span>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {inactiveUsers.map((user) => (
        <div
          key={user.id}
          className="flex items-start gap-4 p-4 rounded-lg bg-brand-accent/20 border border-brand-accent/40"
        >
          {/* Avatar */}
          {user.photo_url ? (
            <img
              src={user.photo_url}
              alt={user.name}
              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-brand-accent flex items-center justify-center text-sm font-semibold text-white flex-shrink-0">
              {user.name[0]}
            </div>
          )}

          {/* User info + message */}
          <div className="flex-1 min-w-0 space-y-2">
            <div>
              <p className="text-white font-medium text-sm">{user.name}</p>
              <p className="text-gray-500 text-xs flex items-center gap-1">
                <Clock size={11} />
                Last seen:{' '}
                {user.last_synced_at ? timeAgo(user.last_synced_at) : 'Never'}
              </p>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={messages[user.id] ?? ''}
                onChange={(e) =>
                  setMessages((p) => ({ ...p, [user.id]: e.target.value }))
                }
                onKeyDown={(e) => e.key === 'Enter' && handleSend(user.id)}
                placeholder="Type a nudge message…"
                className="admin-input flex-1 text-sm"
              />
              <Button
                size="sm"
                onClick={() => handleSend(user.id)}
                disabled={loading[user.id] || !messages[user.id]?.trim()}
                className="bg-brand-orange hover:bg-brand-orange/80 text-white text-xs h-9 px-3 flex-shrink-0"
              >
                <Send size={13} className="mr-1" />
                {loading[user.id] ? 'Sending…' : 'Send'}
              </Button>
            </div>

            {results[user.id] && (
              <div
                className={`flex items-center gap-1 text-xs ${
                  results[user.id].ok ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {results[user.id].ok ? (
                  <CheckCircle size={11} />
                ) : (
                  <AlertCircle size={11} />
                )}
                {results[user.id].text}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
