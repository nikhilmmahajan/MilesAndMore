'use client'

import { useState, useCallback } from 'react'

export type ToastVariant = 'default' | 'destructive' | 'success'

export interface Toast {
  id: string
  title?: string
  description?: string
  variant?: ToastVariant
}

export interface ToastInput {
  title?: string
  description?: string
  variant?: ToastVariant
}

let globalToastHandler: ((input: ToastInput) => void) | null = null

export function registerToastHandler(handler: (input: ToastInput) => void) {
  globalToastHandler = handler
}

export function toast(input: ToastInput) {
  if (globalToastHandler) {
    globalToastHandler(input)
  }
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((input: ToastInput) => {
    const id = Math.random().toString(36).slice(2)
    const newToast: Toast = { id, variant: 'default', ...input }
    setToasts((prev) => [...prev, newToast])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return { toasts, toast: addToast, dismiss }
}
