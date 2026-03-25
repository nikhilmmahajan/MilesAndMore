'use client'

import { useState, useEffect, useCallback } from 'react'
import { PenLine } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useSeason } from '@/lib/context/SeasonContext'
import type { PulsePost } from '@/lib/types'
import { PulseCard } from './PulseCard'
import { KudosComposer } from './KudosComposer'
import { StoryComposer } from './StoryComposer'

type PostWithUser = PulsePost & { name: string; photo_url: string | null }

export function PulseFeed() {
  const { activeSeason } = useSeason()
  const [posts, setPosts] = useState<PostWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showKudos, setShowKudos] = useState(false)
  const [showStory, setShowStory] = useState(false)

  const fetchPosts = useCallback(async () => {
    if (!activeSeason) return
    try {
      const res = await fetch(`/api/pulse/feed?season_id=${activeSeason.id}`)
      if (res.ok) {
        const data = await res.json()
        setPosts(Array.isArray(data.posts) ? data.posts : [])
      }
    } catch {}
    setLoading(false)
  }, [activeSeason])

  useEffect(() => {
    setLoading(true)
    fetchPosts()
  }, [fetchPosts])

  useEffect(() => {
    const interval = setInterval(fetchPosts, 30_000)
    return () => clearInterval(interval)
  }, [fetchPosts])

  return (
    <aside className="relative w-80 border-l border-brand-accent bg-brand-mid flex-col hidden lg:flex h-screen shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-brand-accent flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
          <span className="font-bold text-white">The Pulse</span>
        </div>
        <button
          onClick={() => setShowStory(true)}
          className="text-gray-400 hover:text-brand-orange transition-colors p-1 rounded-md hover:bg-brand-accent/30"
          aria-label="Write a story"
        >
          <PenLine className="w-4 h-4" />
        </button>
      </div>

      {/* Kudos quick-send bar */}
      <div className="p-3 border-b border-brand-accent">
        <button
          className="w-full text-left text-sm text-gray-500 bg-brand-dark border border-brand-accent rounded-lg px-3 py-2 hover:border-brand-orange/60 hover:text-gray-400 transition-colors"
          onClick={() => setShowKudos(true)}
        >
          👏 Send kudos to a teammate…
        </button>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl bg-brand-accent/20" />
          ))
        ) : posts.length === 0 ? (
          <p className="text-center text-gray-500 text-sm mt-8">
            🏁 Nothing yet — be the first to post!
          </p>
        ) : (
          posts.map((post) => <PulseCard key={post.id} post={post} />)
        )}
      </div>

      {/* Kudos overlay */}
      {showKudos && activeSeason && (
        <div className="absolute inset-0 bg-brand-mid z-10 p-4 flex flex-col">
          <KudosComposer
            seasonId={activeSeason.id}
            onClose={() => {
              setShowKudos(false)
              fetchPosts()
            }}
          />
        </div>
      )}

      {/* Story overlay */}
      {showStory && activeSeason && (
        <div className="absolute inset-0 bg-brand-mid z-10 p-4 flex flex-col">
          <StoryComposer
            seasonId={activeSeason.id}
            onClose={() => {
              setShowStory(false)
              fetchPosts()
            }}
          />
        </div>
      )}
    </aside>
  )
}
