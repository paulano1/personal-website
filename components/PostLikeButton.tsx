'use client'

import { useEffect, useState } from 'react'

export default function PostLikeButton({ slug }: { slug: string }) {
  const [reaction, setReaction] = useState<{ likes: number; liked: boolean } | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/engagement/likes?slug=${encodeURIComponent(slug)}`, {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then((response) => {
        if (!response.ok) throw new Error('Unavailable')
        return response.json()
      })
      .then(setReaction)
      .catch(() => {
        /* Keep the page clean when engagement storage is unavailable. */
      })
    return () => controller.abort()
  }, [slug])

  async function toggle() {
    if (!reaction || pending) return
    setPending(true)
    setError(false)
    try {
      const response = await fetch('/api/engagement/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, liked: !reaction.liked }),
      })
      if (!response.ok) throw new Error('Unavailable')
      setReaction(await response.json())
    } catch {
      setError(true)
    } finally {
      setPending(false)
    }
  }

  if (!reaction) return null
  return (
    <div className="flex items-center gap-3 pb-6">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={reaction.liked}
        aria-label={`${reaction.liked ? 'Unlike' : 'Like'} this post (${reaction.likes} likes)`}
        className={`hover:text-primary-600 focus-visible:outline-primary-500 inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 ${reaction.liked ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'}`}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill={reaction.liked ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.5"
          className="h-4 w-4"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"
          />
        </svg>
        <span aria-live="polite">{reaction.likes.toLocaleString('en-US')}</span>
      </button>
      {error && (
        <span role="alert" className="text-xs text-gray-500 dark:text-gray-400">
          Couldn’t save. Try again.
        </span>
      )}
    </div>
  )
}
