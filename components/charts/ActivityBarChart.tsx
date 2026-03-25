'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { ACTIVITY_COLORS } from '@/lib/utils'

interface ActivityBarChartProps {
  data: { type: string; minutes: number }[]
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { value: number }[] }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm">
      <p className="font-mono font-bold">{payload[0].value} min</p>
    </div>
  )
}

export function ActivityBarChart({ data }: ActivityBarChartProps) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-[200px] text-gray-500 text-sm">
        No activity data yet
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
      >
        <XAxis
          type="number"
          tick={{ fill: '#9CA3AF', fontSize: 11 }}
          axisLine={{ stroke: '#374151' }}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="type"
          tick={{ fill: '#9CA3AF', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={56}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        <Bar dataKey="minutes" radius={[0, 4, 4, 0]}>
          {data.map((entry) => (
            <Cell
              key={entry.type}
              fill={ACTIVITY_COLORS[entry.type] ?? ACTIVITY_COLORS.Other}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
