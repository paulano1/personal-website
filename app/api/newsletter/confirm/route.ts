import { resumeHook } from 'workflow/api'
import { HookNotFoundError } from 'workflow/errors'
import { newsletterConfig } from '@/lib/newsletter/config'
import { confirmationExpiry } from '@/lib/newsletter/domain'
import { PRIVATE_HEADERS, readSubmission, sameOrigin } from '@/lib/newsletter/http'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json(
      { error: 'Request not allowed.' },
      { status: 403, headers: PRIVATE_HEADERS }
    )
  const body = await readSubmission(request)
  // The secret token is generated with crypto.randomBytes inside a step and sent
  // only to the mailbox owner. It is distinct from a predictable workflow/run ID.
  if (!confirmationExpiry(body?.token))
    return Response.json(
      { error: 'This link has expired or is invalid. Please subscribe again.' },
      { status: 410, headers: PRIVATE_HEADERS }
    )
  if (!newsletterConfig())
    return Response.json(
      { error: 'Confirmation is temporarily unavailable. Please try again later.' },
      { status: 503, headers: PRIVATE_HEADERS }
    )
  try {
    await resumeHook(body!.token as string, { confirmed: true })
    return Response.json(
      { message: "Thanks for confirming! We're adding you to the weekly newsletter." },
      { status: 202, headers: PRIVATE_HEADERS }
    )
  } catch (error) {
    if (HookNotFoundError.is(error))
      return Response.json(
        { error: 'This link has expired or has already been used.' },
        { status: 410, headers: PRIVATE_HEADERS }
      )
    console.error('Could not confirm newsletter subscription')
    return Response.json(
      { error: 'We could not confirm your subscription. Please try again shortly.' },
      { status: 503, headers: PRIVATE_HEADERS }
    )
  }
}
