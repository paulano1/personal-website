'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

export default function SiteViews() {
  const pathname = usePathname()
  const lastPath = useRef<string | null>(null)
  const [views, setViews] = useState<number | null>(null)

  useEffect(() => {
    // Count navigation once, including under React Strict Mode's effect replay.
    if (!pathname || lastPath.current === pathname) return
    lastPath.current = pathname
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
  }, [pathname])

  if (views === null) return null
  return (
    <>
      <span aria-hidden="true">•</span>
      <span>{views.toLocaleString('en-US')} views</span>
    </>
  )
}
