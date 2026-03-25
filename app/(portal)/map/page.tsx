'use client'
import { useEffect, useState } from 'react'
import { useSeason } from '@/lib/context/SeasonContext'
import { ACTIVITY_COLORS } from '@/lib/utils'

interface ActivityDot {
  lat: number
  lng: number
  type: string
}

export default function MapPage() {
  const { activeSeason } = useSeason()
  const [dots, setDots] = useState<ActivityDot[]>([])
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

  useEffect(() => {
    if (!activeSeason) return
    fetch(`/api/map/dots?season_id=${activeSeason.id}`)
      .then(r => r.json())
      .then(d => setDots(d.dots ?? []))
  }, [activeSeason])

  if (!mapboxToken || mapboxToken === 'placeholder_mapbox_token') {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center space-y-3">
        <div className="text-4xl">🗺️</div>
        <h2 className="text-2xl font-bold">Activity Map</h2>
        <p className="text-gray-400">
          Configure NEXT_PUBLIC_MAPBOX_TOKEN in .env to enable the map.
        </p>
        <div className="mt-4 text-sm text-gray-500">
          <p>{dots.length} activities have GPS coordinates for this season.</p>
          <div className="flex gap-4 justify-center mt-2 flex-wrap">
            {Object.entries(ACTIVITY_COLORS)
              .filter(([t]) => t !== 'mixed')
              .map(([type, color]) => (
                <span key={type} className="flex items-center gap-1">
                  <span
                    className="w-3 h-3 rounded-full inline-block"
                    style={{ backgroundColor: color }}
                  />
                  {type}
                </span>
              ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Activity Map</h2>
      <p className="text-gray-400 text-sm">Mapbox map renders here when configured.</p>
    </div>
  )
}
