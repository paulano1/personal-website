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
    const value = record ? await store.recordView() : await store.getViews()
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
