'use client'
import { useEffect, useRef, useState } from 'react'
import { useSeason } from '@/lib/context/SeasonContext'

interface Message {
  role: 'user' | 'model'
  text: string
}

const GREETING: Message = {
  role: 'model',
  text: "Hey! 🏅 I'm the Commissioner. Ask me about the leaderboard, streaks, or just chat fitness!",
}

export function CommissionerWidget() {
  const { activeSeason } = useSeason()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Show greeting when first opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([GREETING])
    }
  }, [isOpen, messages.length])

  // Auto-scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  async function handleSend() {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = { role: 'user', text }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/commissioner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages,
          season_id: activeSeason?.id,
        }),
      })
      const data = await res.json()
      setMessages(prev => [
        ...prev,
        { role: 'model', text: data.reply ?? "Sorry, I couldn't get a response." },
      ])
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'model', text: 'Connection error. Please try again.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleSend()
  }

  return (
    <>
      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-80 h-[460px] rounded-2xl bg-brand-mid border border-brand-accent shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-brand-accent">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">🏅 Commissioner</span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                <span className="text-green-400 text-xs">Online</span>
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white transition-colors text-lg leading-none"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={
                    msg.role === 'user'
                      ? 'bg-brand-orange rounded-2xl rounded-tr-none px-3 py-2 text-sm max-w-[80%]'
                      : 'bg-brand-dark border border-brand-accent rounded-2xl rounded-tl-none px-3 py-2 text-sm max-w-[80%]'
                  }
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <p className="text-gray-500 text-sm italic">Commissioner is thinking…</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 pb-3 pt-2 border-t border-brand-accent flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask the Commissioner…"
              disabled={loading}
              className="flex-1 bg-brand-dark border border-brand-accent rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-orange placeholder:text-gray-600 disabled:opacity-50 transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="bg-brand-orange hover:bg-orange-600 disabled:opacity-40 text-white text-sm font-semibold px-3 py-2 rounded-xl transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="w-14 h-14 bg-brand-orange rounded-full fixed bottom-6 right-6 z-50 shadow-xl flex items-center justify-center text-2xl hover:scale-105 transition-transform"
        aria-label="Open Commissioner"
      >
        🏅
      </button>
    </>
  )
}
