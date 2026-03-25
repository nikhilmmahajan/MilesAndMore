'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { Season } from '@/lib/types'

interface SeasonContextValue {
  activeSeason: Season | null
  setActiveSeason: (s: Season) => void
  seasons: Season[]
}

const SeasonContext = createContext<SeasonContextValue>({
  activeSeason: null,
  setActiveSeason: () => {},
  seasons: [],
})

export function SeasonProvider({
  children,
  initialSeasons,
}: {
  children: ReactNode
  initialSeasons: Season[]
}) {
  const getDefault = (): Season | null => {
    return initialSeasons.find((s) => s.status === 'active') ?? initialSeasons[0] ?? null
  }

  const [seasons] = useState<Season[]>(initialSeasons)
  const [activeSeason, setActiveSeasonState] = useState<Season | null>(getDefault)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('almaden_active_season_id')
      if (stored) {
        const found = initialSeasons.find((s) => s.id === stored)
        if (found) setActiveSeasonState(found)
      }
    } catch {}
  }, [initialSeasons])

  const setActiveSeason = (s: Season) => {
    setActiveSeasonState(s)
    try {
      localStorage.setItem('almaden_active_season_id', s.id)
    } catch {}
  }

  return (
    <SeasonContext.Provider value={{ activeSeason, setActiveSeason, seasons }}>
      {children}
    </SeasonContext.Provider>
  )
}

export function useSeason() {
  return useContext(SeasonContext)
}
