'use client'

import { useState, useEffect } from 'react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import type { PulsePost } from '@/lib/types'
import { timeAgo } from '@/lib/utils'

const EVENT_META: Record<string, { emoji: string; label: string; labelColor: string }> = {
  cotw_winner:      { emoji: '🏆', label: 'Champion',         labelColor: 'text-yellow-400' },
  coaches_corner:   { emoji: '📣', label: "Coach's Corner",   labelColor: 'text-blue-400' },
  hot_streak:       { emoji: '🔥', label: 'Hot Streak',       labelColor: 'text-orange-400' },
  streak_complete:  { emoji: '✅', label: 'Streak',           labelColor: 'text-green-400' },
  cotw_submission:  { emoji: '💪', label: 'COTW',             labelColor: 'text-purple-400' },
  milestone:        { emoji: '🎯', label: 'Milestone',        labelColor: 'text-cyan-400' },
  kudos_received:   { emoji: '👏', label: 'Kudos',            labelColor: 'text-pink-400' },
  story:            { emoji: '📝', label: 'Story',            labelColor: 'text-gray-400' },
  announcement:     { emoji: '📢', label: 'Announcement',     labelColor: 'text-orange-400' },
  rivalry_started:  { emoji: '⚔️', label: 'Rivalry',          labelColor: 'text-red-400' },
}

const REACTION_EMOJIS = ['🔥', '💪', '👏', '❤️', '🎉']

type Post = PulsePost & { name: string; photo_url: string | null }

function getStoredReactions(postId: string): Set<string> {
  try {
    const raw = localStorage.getItem(`almaden_reactions_${postId}`)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}

function saveStoredReactions(postId: string, reacted: Set<string>) {
  try {
    localStorage.setItem(`almaden_reactions_${postId}`, JSON.stringify([...reacted]))
  } catch {}
}

export function PulseCard({ post }: { post: Post }) {
  const meta = EVENT_META[post.event_type] ?? { emoji: '📝', label: post.event_type, labelColor: 'text-gray-400' }

  const [reactions, setReactions] = useState<Record<string, number>>(post.reactions ?? {})
  const [reacted, setReacted] = useState<Set<string>>(new Set())

  useEffect(() => {
    setReacted(getStoredReactions(post.id))
  }, [post.id])

  async function handleReact(emoji: string) {
    const alreadyReacted = reacted.has(emoji)

    // Optimistic update
    setReactions((prev) => ({
      ...prev,
      [emoji]: Math.max(0, (prev[emoji] ?? 0) + (alreadyReacted ? -1 : 1)),
    }))

    const nextReacted = new Set(reacted)
    if (alreadyReacted) {
      nextReacted.delete(emoji)
    } else {
      nextReacted.add(emoji)
    }
    setReacted(nextReacted)
    saveStoredReactions(post.id, nextReacted)

    try {
      await fetch('/api/pulse/react', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: post.id, emoji }),
      })
    } catch {
      // Silent fail — optimistic state remains
    }
  }

  const initials = post.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div
      className={`bg-brand-dark border rounded-xl p-3 space-y-2 ${
        post.is_pinned ? 'border-brand-orange' : 'border-brand-accent'
      }`}
    >
      {post.is_pinned && (
        <p className="text-xs text-brand-orange font-medium">📌 Pinned — Coach's Corner</p>
      )}

      {/* Top row */}
      <div className="flex items-center gap-2">
        <Avatar className="w-7 h-7 shrink-0">
          {post.photo_url && <AvatarImage src={post.photo_url} alt={post.name} />}
          <AvatarFallback className="text-[10px] bg-brand-accent text-white">{initials}</AvatarFallback>
        </Avatar>

        <span className="text-2xl leading-none">{meta.emoji}</span>

        <span className="font-semibold text-sm text-white truncate flex-1">{post.name}</span>

        <span
          className={`shrink-0 text-xs rounded-full px-2 py-0.5 bg-brand-accent/40 ${meta.labelColor} font-medium`}
        >
          {meta.label}
        </span>

        <span className="shrink-0 text-xs text-gray-500">{timeAgo(post.created_at)}</span>
      </div>

      {/* Content */}
      <p className="text-sm text-gray-300 leading-snug">{post.content}</p>

      {/* Media */}
      {post.media_url && (
        <img
          src={post.media_url}
          alt="Post media"
          className="w-full rounded-lg max-h-40 object-cover"
        />
      )}

      {/* Reactions */}
      <div className="flex gap-1 flex-wrap">
        {REACTION_EMOJIS.map((emoji) => {
          const count = reactions[emoji] ?? 0
          const active = reacted.has(emoji)
          return (
            <button
              key={emoji}
              onClick={() => handleReact(emoji)}
              className={`flex items-center gap-1 text-xs rounded-full px-2 py-0.5 transition-colors ${
                active
                  ? 'bg-brand-orange/20 border border-brand-orange text-white'
                  : 'bg-brand-accent/30 border border-brand-accent/50 text-gray-400 hover:border-brand-orange/50 hover:text-white'
              }`}
            >
              <span>{emoji}</span>
              {count > 0 && <span>{count}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
