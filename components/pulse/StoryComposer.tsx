'use client'

import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

interface StoryComposerProps {
  seasonId: string
  onClose: () => void
}

export function StoryComposer({ seasonId, onClose }: StoryComposerProps) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)

  async function handlePost() {
    if (!content.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/pulse/story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim(), season_id: seasonId }),
      })
      if (res.ok) onClose()
    } catch {}
    setLoading(false)
  }

  return (
    <div className="flex flex-col gap-3 h-full">
      <h2 className="text-sm font-semibold text-white">📝 Share Your Story</h2>

      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="How did your workout go? Share with the community…"
        rows={5}
        className="bg-brand-dark border-brand-accent text-white placeholder:text-gray-500 focus-visible:ring-brand-orange resize-none flex-1"
      />

      <div className="flex gap-2 mt-auto">
        <Button
          onClick={handlePost}
          disabled={!content.trim() || loading}
          className="flex-1 bg-brand-orange hover:bg-brand-orange/80 text-white font-semibold"
        >
          {loading ? 'Posting…' : '📝 Post'}
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
