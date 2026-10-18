'use client'

import { useEffect, useRef, useState } from 'react'

export default function SiteViews() {
  const requested = useRef(false)
  const [views, setViews] = useState<number | null>(null)

  useEffect(() => {
    // The server remembers this browser session across reloads and tabs.
    if (requested.current) return
    requested.current = true
    fetch('/api/engagement/views', { method: 'POST', keepalive: true })
      .then((response) => {
        if (!response.ok) throw new Error('Unavailable')
        return response.json()
      })
      .then((result) => {
        if (Number.isSafeInteger(result.views) && result.views >= 0)
          setViews((previous) => Math.max(previous || 0, result.views))
      })
      .catch(() => {
        /* Hide unavailable totals instead of inventing a count. */
      })
  }, [])

  if (views === null) return null
  return (
    <>
      <span aria-hidden="true">•</span>
      <span>{views.toLocaleString('en-US')} visits</span>
    </>
  )
}
