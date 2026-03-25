'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Users, UserCheck, AlertCircle, CheckCircle } from 'lucide-react'
import type { Team, User } from '@/lib/types'

interface TeamWithMembers extends Team {
  members: { user_id: string; name: string; photo_url: string | null }[]
}

interface Props {
  unassigned: User[]
  teams: TeamWithMembers[]
  seasonId: string
}

export function TeamsManager({ unassigned: initialUnassigned, teams: initialTeams, seasonId }: Props) {
  const [unassigned, setUnassigned] = useState(initialUnassigned)
  const [teams, setTeams] = useState(initialTeams)
  const [selections, setSelections] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [messages, setMessages] = useState<Record<string, { ok: boolean; text: string }>>({})

  async function handleAssign(userId: string, userName: string) {
    const teamId = selections[userId]
    if (!teamId) return
    setLoading((p) => ({ ...p, [userId]: true }))
    setMessages((p) => ({ ...p, [userId]: undefined as never }))
    try {
      const res = await fetch('/api/admin/teams/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, team_id: teamId, season_id: seasonId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessages((p) => ({ ...p, [userId]: { ok: false, text: data.error ?? 'Failed' } }))
      } else {
        const team = teams.find((t) => t.id === teamId)
        // Remove from unassigned
        setUnassigned((p) => p.filter((u) => u.id !== userId))
        // Add to team members
        setTeams((p) =>
          p.map((t) =>
            t.id === teamId
              ? { ...t, members: [...t.members, { user_id: userId, name: userName, photo_url: null }] }
              : t
          )
        )
        setMessages((p) => ({ ...p, [userId]: { ok: true, text: `Assigned to ${team?.name}` } }))
      }
    } catch {
      setMessages((p) => ({ ...p, [userId]: { ok: false, text: 'Network error' } }))
    } finally {
      setLoading((p) => ({ ...p, [userId]: false }))
    }
  }

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Unassigned */}
      <Card className="bg-brand-mid border-brand-accent">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <Users size={16} className="text-brand-gold" />
            Unassigned Challengers
            <Badge className="bg-brand-accent text-gray-300 text-xs ml-1">{unassigned.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {unassigned.length === 0 && (
            <p className="text-gray-500 text-sm">All challengers are assigned!</p>
          )}
          {unassigned.map((user) => (
            <div key={user.id} className="space-y-1">
              <div className="flex items-center gap-3">
                {user.photo_url ? (
                  <img
                    src={user.photo_url}
                    alt={user.name}
                    className="w-7 h-7 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-brand-accent flex items-center justify-center text-xs text-white">
                    {user.name[0]}
                  </div>
                )}
                <span className="text-sm text-white flex-1 truncate">{user.name}</span>
                <select
                  value={selections[user.id] ?? ''}
                  onChange={(e) => setSelections((p) => ({ ...p, [user.id]: e.target.value }))}
                  className="admin-input text-xs py-1 flex-shrink-0"
                >
                  <option value="">— Team —</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  onClick={() => handleAssign(user.id, user.name)}
                  disabled={!selections[user.id] || loading[user.id]}
                  className="bg-brand-orange hover:bg-brand-orange/80 text-white text-xs h-7 px-2"
                >
                  {loading[user.id] ? '…' : 'Assign'}
                </Button>
              </div>
              {messages[user.id] && (
                <div
                  className={`flex items-center gap-1 text-xs ml-10 ${messages[user.id].ok ? 'text-green-400' : 'text-red-400'}`}
                >
                  {messages[user.id].ok ? <CheckCircle size={11} /> : <AlertCircle size={11} />}
                  {messages[user.id].text}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Teams */}
      <div className="space-y-4">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <UserCheck size={16} className="text-brand-orange" />
          Teams
        </h2>
        {teams.map((team) => (
          <Card
            key={team.id}
            className="bg-brand-mid border-brand-accent"
            style={{ borderLeftColor: team.color, borderLeftWidth: 4 }}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm flex items-center justify-between">
                <span style={{ color: team.color }}>{team.name}</span>
                <Badge className="bg-brand-accent text-gray-300 text-xs">
                  {team.members.length} members
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {team.members.length === 0 && (
                  <span className="text-gray-500 text-xs">No members yet</span>
                )}
                {team.members.map((m) => (
                  <span
                    key={m.user_id}
                    className="px-2 py-0.5 rounded-full text-xs bg-brand-accent text-gray-200"
                  >
                    {m.name}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
