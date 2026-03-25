'use client'

import { useSeason } from '@/lib/context/SeasonContext'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

export function SeasonSelector() {
  const { seasons, activeSeason, setActiveSeason } = useSeason()

  if (!seasons.length) return null

  return (
    <Select
      value={activeSeason?.id ?? ''}
      onValueChange={(id) => {
        const found = seasons.find((s) => s.id === id)
        if (found) setActiveSeason(found)
      }}
    >
      <SelectTrigger className="h-8 text-xs">
        <SelectValue placeholder="Select season" />
      </SelectTrigger>
      <SelectContent>
        {seasons.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            <span className="flex items-center gap-2">
              {s.name}
              {s.status === 'active' && (
                <Badge variant="live" className="text-[10px] px-1.5 py-0">
                  ● LIVE
                </Badge>
              )}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
