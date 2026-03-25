import { cookies } from 'next/headers'
import { getOne } from './db'
import type { User } from './types'

export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = cookies()
    const userId = cookieStore.get('almaden_user_id')?.value
    if (!userId) return null
    return await getOne<User>('SELECT * FROM users WHERE id = $1', [userId])
  } catch {
    return null
  }
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')
  return user
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser()
  if (!user.is_admin) throw new Error('Admin access required')
  return user
}

export function setSessionCookie(userId: string, headers: Headers): void {
  const isProduction = process.env.NODE_ENV === 'production'
  const cookieValue = [
    `almaden_user_id=${userId}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=2592000`,
    isProduction ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ')
  headers.append('Set-Cookie', cookieValue)
}

export function clearSessionCookie(headers: Headers): void {
  headers.append(
    'Set-Cookie',
    'almaden_user_id=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
  )
}
