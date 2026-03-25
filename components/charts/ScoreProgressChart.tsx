'use client'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface DataPoint {
  week: string
  cumulative: number
  minutes: number
}

interface ScoreProgressChartProps {
  data: DataPoint[]
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-mono font-bold">{p.value.toLocaleString()}</span>
        </p>
      ))}
    </div>
  )
}

export function ScoreProgressChart({ data }: ScoreProgressChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <XAxis
          dataKey="week"
          tick={{ fill: '#9CA3AF', fontSize: 11 }}
          axisLine={{ stroke: '#374151' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#9CA3AF', fontSize: 11 }}
          axisLine={{ stroke: '#374151' }}
          tickLine={false}
          width={40}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ paddingBottom: 0, paddingTop: 4, fontSize: 12, color: '#9CA3AF' }}
          verticalAlign="top"
        />
        <Line
          type="monotone"
          dataKey="cumulative"
          name="Cumulative pts"
          stroke="#E8500A"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: '#E8500A' }}
        />
        <Line
          type="monotone"
          dataKey="minutes"
          name="Weekly minutes"
          stroke="#F5A623"
          strokeWidth={2}
          strokeDasharray="5 3"
          dot={false}
          activeDot={{ r: 4, fill: '#F5A623' }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
