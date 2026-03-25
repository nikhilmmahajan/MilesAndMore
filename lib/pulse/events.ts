import { query } from '@/lib/db'
import type { PulseEventType } from '@/lib/types'

interface TriggerPulseEventParams {
  userId: string
  seasonId: string
  eventType: PulseEventType
  content: string
  mediaUrl?: string
  isPinned?: boolean
  metadata?: Record<string, unknown>
}

export async function triggerPulseEvent(params: TriggerPulseEventParams): Promise<void> {
  const { userId, seasonId, eventType, content, mediaUrl, isPinned = false, metadata = {} } = params
  await query(
    `INSERT INTO pulse_posts (user_id, season_id, event_type, content, media_url, is_pinned, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [userId, seasonId, eventType, content, mediaUrl ?? null, isPinned, JSON.stringify(metadata)]
  )
}
