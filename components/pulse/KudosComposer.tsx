'use client'

import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

interface SearchResult {
  id: string
  name: string
  photo_url: string | null
  team_name: string | null
}

interface KudosComposerProps {
  seasonId: string
  onClose: () => void
}

export function KudosComposer({ seasonId, onClose }: KudosComposerProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selectedUser, setSelectedUser] = useState<SearchResult | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim() || selectedUser) {
      setResults([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/users/search?q=${encodeURIComponent(query)}&season_id=${seasonId}`
        )
        if (res.ok) {
          const data = await res.json()
          setResults(data)
        }
      } catch {}
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, seasonId, selectedUser])

  async function handleSend() {
    if (!selectedUser || !message.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/pulse/kudos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_id: selectedUser.id,
          message: message.trim(),
          season_id: seasonId,
        }),
      })
      if (res.ok) onClose()
    } catch {}
    setLoading(false)
  }

  const initials = (name: string) =>
    name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)

  return (
    <div className="flex flex-col gap-3 h-full">
      <h2 className="text-sm font-semibold text-white">Send kudos to…</h2>

      {/* Search input or selected pill */}
      {selectedUser ? (
        <div className="flex items-center gap-2 bg-brand-accent/30 border border-brand-accent rounded-lg px-3 py-2">
          <Avatar className="w-6 h-6 shrink-0">
            {selectedUser.photo_url && (
              <AvatarImage src={selectedUser.photo_url} alt={selectedUser.name} />
            )}
            <AvatarFallback className="text-[10px] bg-brand-accent text-white">
              {initials(selectedUser.name)}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-white flex-1 truncate">{selectedUser.name}</span>
          <button
            onClick={() => {
              setSelectedUser(null)
              setQuery('')
            }}
            className="text-gray-400 hover:text-white text-xs leading-none"
            aria-label="Clear selection"
          >
            ✕
          </button>
        </div>
      ) : (
        <div className="relative">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name…"
            className="bg-brand-dark border-brand-accent text-white placeholder:text-gray-500 focus-visible:ring-brand-orange"
          />
          {results.length > 0 && (
            <ul className="absolute z-20 top-full mt-1 w-full bg-brand-dark border border-brand-accent rounded-lg overflow-hidden shadow-lg">
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-brand-accent/40 transition-colors flex items-center gap-2"
                    onClick={() => {
                      setSelectedUser(r)
                      setResults([])
                      setQuery('')
                    }}
                  >
                    <Avatar className="w-6 h-6 shrink-0">
                      {r.photo_url && <AvatarImage src={r.photo_url} alt={r.name} />}
                      <AvatarFallback className="text-[10px] bg-brand-accent text-white">
                        {initials(r.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-white truncate">{r.name}</span>
                    {r.team_name && (
                      <span className="text-xs text-gray-500 ml-auto shrink-0">{r.team_name}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Write your kudos message…"
        rows={4}
        className="bg-brand-dark border-brand-accent text-white placeholder:text-gray-500 focus-visible:ring-brand-orange resize-none"
      />

      <div className="flex gap-2 mt-auto">
        <Button
          onClick={handleSend}
          disabled={!selectedUser || !message.trim() || loading}
          className="flex-1 bg-brand-orange hover:bg-brand-orange/80 text-white font-semibold"
        >
          {loading ? 'Sending…' : '👏 Send Kudos'}
        </Button>
        <Button
          onClick={onClose}
          variant="outline"
          className="border-brand-accent text-gray-400 hover:text-white hover:border-brand-orange"
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}
