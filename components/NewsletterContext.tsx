'use client'

import { createContext } from 'react'

export const NewsletterContext = createContext<{
  openSubscribe: () => void
  rememberSubscription: () => void
} | null>(null)
