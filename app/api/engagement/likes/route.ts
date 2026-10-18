import { NextRequest, NextResponse } from 'next/server'
import { allBlogs } from 'contentlayer/generated'
import { engagementStore } from '@/lib/engagement/database'
import {
  browserToken,
  newBrowserToken,
  postVisitorHash,
  REACTION_COOKIE,
} from '@/lib/engagement/anonymous'
import { PRIVATE_HEADERS, readSubmission, sameOrigin } from '@/lib/newsletter/http'

export const runtime = 'nodejs'
const published = new Set(allBlogs.filter((post) => !post.draft).map((post) => post.slug))
const unavailable = () =>
  NextResponse.json(
    { error: 'Likes are temporarily unavailable.' },
    { status: 503, headers: PRIVATE_HEADERS }
  )

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug')
  if (!slug || !published.has(slug))
    return NextResponse.json(
      { error: 'Post not found.' },
      { status: 404, headers: PRIVATE_HEADERS }
    )
  try {
    const store = engagementStore()
    if (!store) return unavailable()
    const token = browserToken(request.cookies.get(REACTION_COOKIE)?.value)
    const result = await store.getLikes(slug, token ? postVisitorHash(slug, token) : null)
    return NextResponse.json(result, { headers: PRIVATE_HEADERS })
  } catch {
    console.error('Could not read post likes')
    return unavailable()
  }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request))
    return NextResponse.json(
      { error: 'Request not allowed.' },
      { status: 403, headers: PRIVATE_HEADERS }
    )
  const body = await readSubmission(request)
  if (
    !body ||
    typeof body.slug !== 'string' ||
    !published.has(body.slug) ||
    typeof body.liked !== 'boolean'
  )
    return NextResponse.json(
      { error: 'Invalid post reaction.' },
      { status: 400, headers: PRIVATE_HEADERS }
    )
  try {
    const store = engagementStore()
    if (!store) return unavailable()
    const existing = browserToken(request.cookies.get(REACTION_COOKIE)?.value)
    const token = existing || newBrowserToken()
    const result = await store.setLike(body.slug, postVisitorHash(body.slug, token), body.liked)
    const response = NextResponse.json(result, { headers: PRIVATE_HEADERS })
    if (!existing)
      response.cookies.set(REACTION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 365 * 24 * 60 * 60,
      })
    return response
  } catch {
    console.error('Could not update post likes')
    return unavailable()
  }
}
