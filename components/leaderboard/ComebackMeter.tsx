'use client'

interface ComebackMeterProps {
  gap: number
  leaderTotal: number
  myTotal: number
}

export function ComebackMeter({ gap }: ComebackMeterProps) {
  return (
    <span className="inline-flex items-center rounded-full border border-brand-accent bg-brand-accent/20 px-2 py-0.5 font-mono text-xs text-brand-gold">
      -{gap.toLocaleString('en-US')} pts behind leader
    </span>
  )
}
