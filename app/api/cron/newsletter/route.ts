import { timingSafeEqual } from 'node:crypto'
import { getHookByToken, start } from 'workflow/api'
import { HookNotFoundError } from 'workflow/errors'
import { allBlogs } from 'contentlayer/generated'
import { weeklyNewsletter } from '@/workflows/newsletter'
import { newsletterConfig } from '@/lib/newsletter/config'
import { renderDigest, selectDigestPosts, weeklyWindow } from '@/lib/newsletter/domain'
import { PRIVATE_HEADERS } from '@/lib/newsletter/http'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret)
    return Response.json(
      { error: 'Cron is not configured.' },
      { status: 503, headers: PRIVATE_HEADERS }
    )
  const actual = Buffer.from(request.headers.get('authorization') || '')
  const expected = Buffer.from(`Bearer ${secret}`)
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    return Response.json({ error: 'Unauthorized.' }, { status: 401, headers: PRIVATE_HEADERS })
  const config = newsletterConfig()
  if (!config) return Response.json({ status: 'disabled' }, { headers: PRIVATE_HEADERS })
  const window = weeklyWindow(new Date())
  if (new URL(request.url).searchParams.get('preview') === 'true') {
    const posts = selectDigestPosts(allBlogs, window)
    return Response.json(
      {
        window,
        postCount: posts.length,
        ...renderDigest(posts, config.siteUrl, config.postalAddress),
      },
      { headers: PRIVATE_HEADERS }
    )
  }
  try {
    try {
      await getHookByToken(`newsletter-digest:${window.key}`)
      return Response.json(
        { status: 'already-queued', week: window.key },
        { headers: PRIVATE_HEADERS }
      )
    } catch (error) {
      if (!HookNotFoundError.is(error)) throw error
    }
    await start(weeklyNewsletter, [window])
    return Response.json(
      { status: 'queued', week: window.key },
      { status: 202, headers: PRIVATE_HEADERS }
    )
  } catch {
    console.error('Could not queue weekly newsletter')
    return Response.json(
      { error: 'Could not queue weekly newsletter.' },
      { status: 503, headers: PRIVATE_HEADERS }
    )
  }
}
