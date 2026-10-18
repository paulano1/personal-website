import { randomBytes } from 'node:crypto'
import { Resend } from 'resend'
import { FatalError, RetryableError } from 'workflow'
import { allBlogs } from 'contentlayer/generated'
import { newsletterConfig } from './config'
import { CONFIRMATION_TTL, type DigestWindow } from './domain'
import { NewsletterProviderError, NewsletterService } from './service'

function service() {
  const config = newsletterConfig()
  if (!config) throw new FatalError('Newsletter delivery is not configured or has been disabled')
  return new NewsletterService(new Resend(config.apiKey), config)
}

async function providerOperation<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    if (error instanceof NewsletterProviderError) {
      if (error.status < 500 && error.status !== 429 && error.status !== 409)
        throw new FatalError(error.message)
      throw new RetryableError(error.message, { retryAfter: '1m' })
    }
    throw error
  }
}

export async function createConfirmation() {
  'use step'
  const expiresAt = Date.now() + CONFIRMATION_TTL
  // Use the platform CSPRNG in a step, not the workflow's deterministic RNG.
  return { token: `newsletter-confirm.${randomBytes(32).toString('hex')}.${expiresAt}`, expiresAt }
}

export async function sendConfirmation(email: string, token: string, key: string) {
  'use step'
  await providerOperation(() => service().sendConfirmation(email, token, key))
}

export async function enrollSubscriber(email: string) {
  'use step'
  await providerOperation(() => service().enroll(email))
}

export async function prepareWeeklyDigest(window: DigestWindow) {
  'use step'
  return providerOperation(() => service().prepareDigest(allBlogs, window))
}

export async function deliverWeeklyDigest(id: string) {
  'use step'
  await providerOperation(() => service().sendDigest(id))
}
