import { cookies } from 'next/headers'
import { engagementStore } from '@/lib/engagement/database'
import { PRIVATE_HEADERS, sameOrigin } from '@/lib/newsletter/http'

export const runtime = 'nodejs'

async function views(record: boolean) {
  try {
    const store = engagementStore()
    if (!store)
      return Response.json(
        { error: 'View count is unavailable.' },
        { status: 503, headers: PRIVATE_HEADERS }
      )
    const cookieStore = await cookies()
    const alreadyCounted = cookieStore.get('site_visit')?.value === '1'
    const value = record && !alreadyCounted ? await store.recordView() : await store.getViews()
    if (record && !alreadyCounted) {
      cookieStore.set('site_visit', '1', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      })
    }
    return Response.json({ views: value }, { headers: PRIVATE_HEADERS })
  } catch {
    console.error('Could not read or update the site view count')
    return Response.json(
      { error: 'View count is unavailable.' },
      { status: 503, headers: PRIVATE_HEADERS }
    )
  }
}

export async function GET() {
  return views(false)
}
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json(
      { error: 'Request not allowed.' },
      { status: 403, headers: PRIVATE_HEADERS }
    )
  return views(true)
}
