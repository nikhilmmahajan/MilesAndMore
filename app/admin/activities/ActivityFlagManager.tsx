'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Flag, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { StravaActivity } from '@/lib/types'

interface UserSearchResult {
  id: string
  name: string
  photo_url: string | null
}

interface ActivityRow extends StravaActivity {
  flagLoading?: boolean
  flagMessage?: { ok: boolean; text: string }
}

interface Props {
  seasonId: string
}

export function ActivityFlagManager({ seasonId }: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null)
  const [activities, setActivities] = useState<ActivityRow[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [activitiesLoading, setActivitiesLoading] = useState(false)
  const [flagStates, setFlagStates] = useState<Record<string, { loading: boolean; message?: { ok: boolean; text: string } }>>({})

  async function handleSearch() {
    if (!searchQuery.trim()) return
    setSearchLoading(true)
    setSearchResults([])
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`)
      const data = await res.json()
      setSearchResults(data.users ?? data ?? [])
    } catch {
      // silently fail
    } finally {
      setSearchLoading(false)
    }
  }

  async function handleSelectUser(user: UserSearchResult) {
    setSelectedUser(user)
    setSearchResults([])
    setSearchQuery(user.name)
    setActivitiesLoading(true)
    try {
      const res = await fetch(
        `/api/admin/activities?user_id=${user.id}&season_id=${seasonId}`
      )
      const data = await res.json()
      setActivities(data.activities ?? data ?? [])
    } catch {
      setActivities([])
    } finally {
      setActivitiesLoading(false)
    }
  }

  async function handleFlag(activityId: string, currentlyFlagged: boolean) {
    setFlagStates((p) => ({ ...p, [activityId]: { loading: true } }))
    try {
      const res = await fetch('/api/admin/activities/flag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activity_id: activityId, flagged: !currentlyFlagged }),
      })
      const data = await res.json()
      if (!res.ok) {
        setFlagStates((p) => ({
          ...p,
          [activityId]: { loading: false, message: { ok: false, text: data.error ?? 'Failed' } },
        }))
      } else {
        setActivities((p) =>
          p.map((a) => (a.id === activityId ? { ...a, flagged: !currentlyFlagged } : a))
        )
        setFlagStates((p) => ({
          ...p,
          [activityId]: {
            loading: false,
            message: { ok: true, text: !currentlyFlagged ? 'Flagged' : 'Unflagged' },
          },
        }))
      }
    } catch {
      setFlagStates((p) => ({
        ...p,
        [activityId]: { loading: false, message: { ok: false, text: 'Network error' } },
      }))
    }
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex gap-3">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search challenger by name…"
          className="admin-input flex-1"
        />
        <Button
          onClick={handleSearch}
          disabled={searchLoading}
          className="bg-brand-orange hover:bg-brand-orange/80 text-white"
        >
          {searchLoading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
        </Button>
      </div>

      {/* Search results dropdown */}
      {searchResults.length > 0 && (
        <div className="bg-brand-mid border border-brand-accent rounded-md overflow-hidden shadow-lg">
          {searchResults.map((u) => (
            <button
              key={u.id}
              onClick={() => handleSelectUser(u)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-brand-accent text-left transition-colors"
            >
              {u.photo_url ? (
                <img src={u.photo_url} alt={u.name} className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-brand-accent flex items-center justify-center text-xs text-white">
                  {u.name[0]}
                </div>
              )}
              <span className="text-sm text-white">{u.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Activities table */}
      {selectedUser && (
        <div className="space-y-3">
          <h3 className="text-white font-medium flex items-center gap-2">
            Activities for{' '}
            <span className="text-brand-orange">{selectedUser.name}</span>
            {activitiesLoading && <Loader2 size={14} className="animate-spin text-gray-400" />}
          </h3>

          {!activitiesLoading && activities.length === 0 && (
            <p className="text-gray-500 text-sm">No activities found for this season.</p>
          )}

          {activities.length > 0 && (
            <div className="bg-brand-mid border border-brand-accent rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-brand-accent">
                    <th className="text-left text-gray-400 font-medium px-4 py-3">Date</th>
                    <th className="text-left text-gray-400 font-medium px-4 py-3">Type</th>
                    <th className="text-right text-gray-400 font-medium px-4 py-3">Duration</th>
                    <th className="text-right text-gray-400 font-medium px-4 py-3">Distance</th>
                    <th className="text-center text-gray-400 font-medium px-4 py-3">Flagged</th>
                    <th className="text-center text-gray-400 font-medium px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((a) => {
                    const state = flagStates[a.id]
                    return (
                      <tr key={a.id} className="border-b border-brand-accent/40 hover:bg-brand-accent/20">
                        <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                          {formatDate(a.week_start_date, 'MMM d')}
                        </td>
                        <td className="px-4 py-3 text-white">{a.activity_type}</td>
                        <td className="px-4 py-3 text-right text-gray-300">
                          {a.duration_minutes}m
                        </td>
                        <td className="px-4 py-3 text-right text-gray-300">
                          {a.distance_km != null ? `${a.distance_km.toFixed(1)} km` : '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {a.flagged ? (
                            <Badge className="bg-red-700/50 text-red-300 text-xs">Flagged</Badge>
                          ) : (
                            <Badge className="bg-green-700/30 text-green-400 text-xs">OK</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleFlag(a.id, a.flagged)}
                              disabled={state?.loading}
                              className={`text-xs h-7 px-2 ${
                                a.flagged
                                  ? 'bg-green-700/30 hover:bg-green-700/50 text-green-400 border border-green-700/50'
                                  : 'bg-red-700/30 hover:bg-red-700/50 text-red-400 border border-red-700/50'
                              }`}
                            >
                              {state?.loading ? (
                                <Loader2 size={11} className="animate-spin" />
                              ) : (
                                <>
                                  <Flag size={11} className="mr-1" />
                                  {a.flagged ? 'Unflag' : 'Flag'}
                                </>
                              )}
                            </Button>
                            {state?.message && (
                              <span
                                className={`text-xs ${state.message.ok ? 'text-green-400' : 'text-red-400'}`}
                              >
                                {state.message.ok ? (
                                  <CheckCircle size={11} />
                                ) : (
                                  <AlertCircle size={11} />
                                )}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
