'use client'

import { useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { NewsletterContext } from './NewsletterContext'
import {
  Dialog,
  DialogBackdrop,
  DialogDescription,
  DialogPanel,
  DialogTitle,
} from '@headlessui/react'
import NewsletterForm from './NewsletterForm'

const PROMPT_KEY = 'newsletter-prompt-handled-v1'

export default function NewsletterSubscribe({
  variant = 'profile',
}: {
  variant?: 'profile' | 'text'
}) {
  const newsletter = useContext(NewsletterContext)
  const pathname = usePathname()
  if (variant === 'text' && pathname?.startsWith('/newsletter')) return null
  return (
    <button
      type="button"
      onClick={newsletter?.openSubscribe}
      aria-haspopup="dialog"
      className={
        variant === 'text'
          ? 'text-primary-600 hover:text-primary-700 focus-visible:outline-primary-500 dark:text-primary-400 mb-5 text-sm focus-visible:outline-2 focus-visible:outline-offset-2'
          : 'bg-primary-600 hover:bg-primary-700 focus-visible:outline-primary-500 mb-4 rounded-full px-5 py-2 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2'
      }
    >
      {variant === 'text' ? 'Subscribe to the newsletter' : 'Subscribe'}
    </button>
  )
}

export function NewsletterProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handled = useRef(false)
  const startedAt = useRef<number | null>(null)
  const automatic = useRef(false)

  const clearTimer = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }, [])

  const remember = useCallback(
    (reason: 'dismissed' | 'subscribed') => {
      handled.current = true
      clearTimer()
      try {
        localStorage.setItem(PROMPT_KEY, reason)
      } catch {
        /* Retain suppression in memory if storage is unavailable. */
      }
    },
    [clearTimer]
  )

  const openSubscribe = useCallback(() => {
    clearTimer()
    automatic.current = false
    setOpen(true)
  }, [clearTimer])

  const rememberSubscription = useCallback(() => remember('subscribed'), [remember])
  const dismiss = useCallback(() => {
    remember('dismissed')
    setOpen(false)
  }, [remember])

  useEffect(() => {
    if (startedAt.current === null) startedAt.current = Date.now()
    try {
      if (localStorage.getItem(PROMPT_KEY)) handled.current = true
    } catch {
      /* Use in-memory state. */
    }
    // Readers already signing up or confirming should not get an overlapping prompt.
    if (handled.current || pathname?.startsWith('/newsletter')) return
    timer.current = setTimeout(
      () => {
        if (handled.current) return
        automatic.current = true
        setOpen(true)
      },
      Math.max(0, 3000 - (Date.now() - startedAt.current))
    )
    return clearTimer
  }, [pathname, clearTimer])

  useEffect(() => {
    function syncDismissal(event: StorageEvent) {
      if (event.key !== PROMPT_KEY || !event.newValue) return
      handled.current = true
      clearTimer()
      if (automatic.current) setOpen(false)
    }
    window.addEventListener('storage', syncDismissal)
    return () => window.removeEventListener('storage', syncDismissal)
  }, [clearTimer])

  return (
    <NewsletterContext.Provider value={{ openSubscribe, rememberSubscription }}>
      {children}
      <Dialog open={open} onClose={dismiss} className="fixed inset-0 z-50">
        <DialogBackdrop className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        <div className="fixed inset-0 flex items-center justify-center overflow-y-auto p-4">
          <DialogPanel className="relative my-auto w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl sm:p-8 dark:border-gray-800 dark:bg-gray-950">
            <button
              type="button"
              onClick={dismiss}
              aria-label="Close subscription dialog"
              className="focus-visible:outline-primary-500 absolute top-4 right-4 rounded-md p-2 text-gray-500 hover:text-gray-900 focus-visible:outline-2 dark:text-gray-400 dark:hover:text-white"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="h-5 w-5"
              >
                <path d="m6 6 12 12M6 18 18 6" />
              </svg>
            </button>
            <DialogTitle className="pr-8 text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              Subscribe to my newsletter
            </DialogTitle>
            <DialogDescription className="mt-3 text-gray-600 dark:text-gray-400">
              New writing on software, finance, and the things I’m learning. One weekly email when
              there’s something new.
            </DialogDescription>
            <NewsletterForm />
          </DialogPanel>
        </div>
      </Dialog>
    </NewsletterContext.Provider>
  )
}
