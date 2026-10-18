import { createHash } from 'node:crypto'
import { getHookByToken, start } from 'workflow/api'
import { HookNotFoundError } from 'workflow/errors'
import { subscribeToNewsletter } from '@/workflows/newsletter'
import { newsletterConfig } from '@/lib/newsletter/config'
import { normalizeEmail } from '@/lib/newsletter/domain'
import { ACCEPTED, PRIVATE_HEADERS, readSubmission, sameOrigin } from '@/lib/newsletter/http'

export const runtime = 'nodejs'

export async function GET() {
  return Response.json({ enabled: Boolean(newsletterConfig()) }, { headers: PRIVATE_HEADERS })
}

export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json(
      { error: 'Request not allowed.' },
      { status: 403, headers: PRIVATE_HEADERS }
    )
  const body = await readSubmission(request)
  if (!body)
    return Response.json(
      { error: 'Please submit a valid email address.' },
      { status: 400, headers: PRIVATE_HEADERS }
    )
  if (body.website) return Response.json(ACCEPTED, { status: 202, headers: PRIVATE_HEADERS })
  const email = normalizeEmail(body.email)
  if (!email)
    return Response.json(
      { error: 'Please enter a valid email address.' },
      { status: 400, headers: PRIVATE_HEADERS }
    )
  if (!newsletterConfig())
    return Response.json(
      { error: 'Email signup is temporarily unavailable. Please try again later.' },
      { status: 503, headers: PRIVATE_HEADERS }
    )

  // A durable reservation limits confirmation emails per address per UTC hour.
  // The workflow resolves concurrent starts atomically before any email is sent.
  const fingerprint = createHash('sha256').update(email).digest('hex')
  const key = `newsletter-request:${fingerprint}:${Math.floor(Date.now() / 3_600_000)}`
  try {
    try {
      await getHookByToken(key)
    } catch (error) {
      if (!HookNotFoundError.is(error)) throw error
      await start(subscribeToNewsletter, [email, key])
    }
    return Response.json(ACCEPTED, { status: 202, headers: PRIVATE_HEADERS })
  } catch {
    console.error('Could not queue newsletter subscription')
    return Response.json(
      { error: 'We could not process your request. Please try again shortly.' },
      { status: 503, headers: PRIVATE_HEADERS }
    )
  }
}
