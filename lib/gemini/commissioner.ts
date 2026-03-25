// Gemini Commissioner — placeholder until API key is configured

import { getMany } from '@/lib/db'

export interface CommissionerMessage {
  role: 'user' | 'model'
  text: string
}

async function buildContext(seasonId: string): Promise<string> {
  const [topRows] = await Promise.all([
    getMany<{ name: string; total: number; rank: number }>(
      `SELECT u.name, sc.total, sc.rank
       FROM score_cache sc JOIN users u ON u.id = sc.user_id
       WHERE sc.season_id = $1 ORDER BY sc.rank ASC LIMIT 10`,
      [seasonId]
    ),
  ])

  const leaderboard = topRows
    .map((r) => `${r.rank}. ${r.name} — ${r.total.toLocaleString()} pts`)
    .join('\n')

  return `You are the Almaden Fit AF League Commissioner — knowledgeable, playful, and slightly trash-talking.
Current Season Leaderboard (Top 10):
${leaderboard}

Answer fitness questions, provide encouragement, and banter with challengers.`
}

export async function askCommissioner(
  messages: CommissionerMessage[],
  seasonId: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || apiKey === 'placeholder_gemini_api_key') {
    return "The Commissioner is warming up! Configure GEMINI_API_KEY in .env to enable AI chat. For now: keep grinding, the leaderboard doesn't lie! 🏅"
  }

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai')
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const systemCtx = await buildContext(seasonId)
    const chat = model.startChat({
      history: messages.slice(0, -1).map((m) => ({
        role: m.role,
        parts: [{ text: m.text }],
      })),
      systemInstruction: systemCtx,
    })

    const last = messages[messages.length - 1]
    const result = await chat.sendMessage(last.text)
    return result.response.text()
  } catch (err) {
    console.error('Gemini error:', err)
    return "The Commissioner's connection is spotty. Try again in a moment!"
  }
}
