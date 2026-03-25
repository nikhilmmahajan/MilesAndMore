'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast, registerToastHandler, type ToastInput } from '@/components/ui/use-toast'

export function Toaster() {
  const { toasts, toast, dismiss } = useToast()

  React.useEffect(() => {
    registerToastHandler(toast)
  }, [toast])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'relative flex flex-col gap-1 rounded-xl border p-4 shadow-lg text-sm',
            'animate-in slide-in-from-bottom-2 fade-in-0',
            t.variant === 'destructive'
              ? 'border-red-600 bg-red-950 text-red-200'
              : t.variant === 'success'
              ? 'border-green-700 bg-green-950 text-green-200'
              : 'border-brand-accent bg-brand-mid text-white'
          )}
        >
          <button
            onClick={() => dismiss(t.id)}
            className="absolute top-2 right-2 text-gray-400 hover:text-white transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
          {t.title && <p className="font-semibold pr-6">{t.title}</p>}
          {t.description && <p className="text-gray-300 text-xs">{t.description}</p>}
        </div>
      ))}
    </div>
  )
}
