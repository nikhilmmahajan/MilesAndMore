import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, startOfISOWeek, parseISO } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatScore(n: number): string {
  return n.toLocaleString('en-US')
}

export function formatRank(rank: number): string {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return `#${rank}`
}

export function formatDelta(prev: number | null, curr: number): { symbol: string; color: string; diff: number } | null {
  if (prev === null) return null
  const diff = prev - curr
  if (diff === 0) return { symbol: '—', color: 'text-gray-500', diff: 0 }
  if (diff > 0) return { symbol: `▲${diff}`, color: 'text-green-400', diff }
  return { symbol: `▼${Math.abs(diff)}`, color: 'text-red-400', diff }
}

export function timeAgo(date: string | Date): string {
  return formatDistanceToNow(typeof date === 'string' ? parseISO(date) : date, {
    addSuffix: true,
  })
}

export function formatDate(date: string | Date, fmt = 'MMM d'): string {
  return format(typeof date === 'string' ? parseISO(date) : date, fmt)
}

export function getMondayOfWeek(date: Date = new Date()): Date {
  return startOfISOWeek(date)
}

export function getMondayString(date: Date = new Date()): string {
  return format(startOfISOWeek(date), 'yyyy-MM-dd')
}

export function normaliseActivityType(type: string): string {
  const map: Record<string, string> = {
    Run: 'Run', VirtualRun: 'Run',
    Walk: 'Walk',
    Hike: 'Hike',
    Ride: 'Ride', VirtualRide: 'Ride', EBikeRide: 'Ride',
    Swim: 'Swim',
    WeightTraining: 'Workout', Workout: 'Workout',
    Yoga: 'Yoga', Pilates: 'Yoga',
    Rowing: 'Rowing',
  }
  return map[type] ?? 'Other'
}

export const ACTIVITY_COLORS: Record<string, string> = {
  Run: '#E8500A',
  Walk: '#27AE60',
  Ride: '#2980B9',
  Hike: '#F5A623',
  Swim: '#8E44AD',
  Workout: '#C0392B',
  Yoga: '#16A085',
  Rowing: '#2C3E50',
  Other: '#888888',
  mixed: '#888888',
}
