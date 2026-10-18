'use client'

import { useState } from 'react'
import Link from './Link'

export default function NewsletterConfirmation() {
  const [pending, setPending] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [message, setMessage] = useState('')

  async function confirm() {
    setPending(true)
    setMessage('')
    try {
      const token = window.location.hash.slice(1)
      const response = await fetch('/api/newsletter/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Please try again shortly.')
      setConfirmed(true)
      setMessage(result.message)
      window.history.replaceState(null, '', window.location.pathname)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Please try again shortly.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="space-y-5 py-16">
      <h1 className="text-3xl font-extrabold tracking-tight">
        {confirmed ? 'Thanks for confirming' : 'Confirm your subscription'}
      </h1>
      {!confirmed && (
        <>
          <p className="text-gray-600 dark:text-gray-400">
            Click below to join my weekly newsletter. You’ll only get an email when there’s new
            writing to share.
          </p>
          <button
            onClick={confirm}
            disabled={pending}
            className="bg-primary-600 hover:bg-primary-700 focus-visible:outline-primary-500 rounded-lg px-5 py-3 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
          >
            {pending ? 'Confirming…' : 'Confirm subscription'}
          </button>
        </>
      )}
      {message && <p role={confirmed ? 'status' : 'alert'}>{message}</p>}
      <p>
        <Link
          href={confirmed ? '/blog' : '/newsletter'}
          className="text-primary-600 dark:text-primary-400"
        >
          {confirmed ? 'Read the latest posts →' : 'Request a new confirmation link →'}
        </Link>
      </p>
    </div>
  )
}
