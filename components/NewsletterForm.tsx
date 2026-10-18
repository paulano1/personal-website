'use client'

import { useEffect, useId, useState, type FormEvent } from 'react'

export default function NewsletterForm() {
  const id = useId()
  const [available, setAvailable] = useState<boolean | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    fetch(`${process.env.BASE_PATH || ''}/api/newsletter`, {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then((response) => {
        if (!response.ok) throw new Error('Unavailable')
        return response.json()
      })
      .then((result) => setAvailable(result.enabled === true))
      .catch(() => {
        if (!controller.signal.aborted) setAvailable(false)
      })
    return () => controller.abort()
  }, [])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function subscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    setPending(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch(`${process.env.BASE_PATH || ''}/api/newsletter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.get('email'), website: data.get('website') }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Please try again shortly.')
      setMessage(result.message)
      form.reset()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Something went wrong. Please try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <section
      className="my-10 rounded-2xl border border-gray-200 p-6 sm:p-8 dark:border-gray-800"
      aria-labelledby={`${id}-title`}
    >
      <h2 id={`${id}-title`} className="text-2xl font-bold tracking-tight">
        A little more from Ano
      </h2>
      <p className="mt-3 text-gray-600 dark:text-gray-400">
        New writing on software, finance, and the things I’m learning. One weekly email when there’s
        something new.
      </p>
      {available === true ? (
        <form onSubmit={subscribe} className="mt-5" aria-busy={pending}>
          <label htmlFor={`${id}-email`} className="mb-2 block text-sm font-medium">
            Email address
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id={`${id}-email`}
              name="email"
              type="email"
              required
              autoComplete="email"
              maxLength={254}
              placeholder="you@example.com"
              disabled={pending}
              aria-describedby={`${id}-help`}
              className="focus:border-primary-500 focus:ring-primary-500 min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:ring-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
            <button
              type="submit"
              disabled={pending}
              className="bg-primary-600 hover:bg-primary-700 focus-visible:outline-primary-500 rounded-lg px-5 py-3 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-60"
            >
              {pending ? 'Subscribing…' : 'Subscribe'}
            </button>
          </div>
          <div className="absolute -left-[10000px]" aria-hidden="true">
            <label htmlFor={`${id}-website`}>Leave this field empty</label>
            <input
              id={`${id}-website`}
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
            />
          </div>
          <p id={`${id}-help`} className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            We’ll email a confirmation link first. Unsubscribe anytime with one click.
          </p>
          {message && (
            <p role="status" className="mt-4 text-sm text-green-700 dark:text-green-400">
              {message}
            </p>
          )}
          {error && (
            <p role="alert" className="mt-4 text-sm text-red-700 dark:text-red-400">
              {error}
            </p>
          )}
        </form>
      ) : (
        <p role="status" className="mt-5 text-sm text-gray-500 dark:text-gray-400">
          {available === null ? (
            'Loading signup…'
          ) : (
            <>
              Signups are opening soon. In the meantime,{' '}
              <a href="/feed.xml" className="text-primary-600 dark:text-primary-400 underline">
                follow the RSS feed
              </a>
              .
            </>
          )}
        </p>
      )}
    </section>
  )
}
