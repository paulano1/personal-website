import type { Resend } from 'resend'
import type { NewsletterConfig } from './config'
import {
  escapeHtml,
  renderDigest,
  selectDigestPosts,
  type DigestPost,
  type DigestWindow,
} from './domain.ts'

export class NewsletterProviderError extends Error {
  readonly status: number
  constructor(status: number, operation: string) {
    super(`Newsletter provider failed during ${operation} (HTTP ${status})`)
    this.status = status
  }
}

function result<T>(
  response: { data: T | null; error: { statusCode?: number | null } | null },
  operation: string
): T {
  if (response.error || !response.data)
    throw new NewsletterProviderError(response.error?.statusCode || 500, operation)
  return response.data
}

export class NewsletterService {
  private readonly client: Resend
  private readonly config: NewsletterConfig
  constructor(client: Resend, config: NewsletterConfig) {
    this.client = client
    this.config = config
  }

  async sendConfirmation(email: string, token: string, key: string) {
    const url = `${this.config.siteUrl}/newsletter/confirm#${token}`
    const text = `Confirm your subscription to Ano's weekly newsletter:\n\n${url}\n\nThis link expires in 24 hours. If you didn't request this, ignore this email. You will not be subscribed without confirming.`
    const html = `<p>Thanks for your interest in my writing!</p><p><a href="${escapeHtml(url)}">Confirm your subscription</a> to receive my weekly digest of new posts.</p><p>This link expires in 24 hours. If you didn't request this, ignore this email. You won't be subscribed without confirming.</p>`
    result(
      await this.client.emails.send(
        {
          from: this.config.from,
          to: email,
          subject: "Confirm your subscription to Ano's newsletter",
          html,
          text,
        },
        { idempotencyKey: key }
      ),
      'confirmation'
    )
  }

  async enroll(email: string) {
    const existing = await this.client.contacts.get(email)
    if (existing.error?.statusCode === 404) {
      result(
        await this.client.contacts.create({
          email,
          unsubscribed: false,
          segments: [{ id: this.config.segmentId }],
        }),
        'contact creation'
      )
    } else {
      result(existing, 'contact lookup')
      // Re-subscription is permitted only after a fresh confirmation, never at signup.
      result(
        await this.client.contacts.update({ email, unsubscribed: false }),
        'subscription confirmation'
      )
      result(
        await this.client.contacts.segments.add({ email, segmentId: this.config.segmentId }),
        'segment membership'
      )
    }
  }

  async prepareDigest(posts: DigestPost[], window: DigestWindow): Promise<string | null> {
    const selected = selectDigestPosts(posts, window)
    if (!selected.length) return null
    const name = `ano-weekly-${window.key}`
    let after: string | undefined
    do {
      const page = result(
        await this.client.broadcasts.list({ limit: 100, ...(after ? { after } : {}) }),
        'broadcast lookup'
      )
      const existing = page.data.find((broadcast) => broadcast.name === name)
      if (existing) return existing.id
      after = page.has_more ? page.data.at(-1)?.id : undefined
    } while (after)
    const content = renderDigest(selected, this.config.siteUrl, this.config.postalAddress)
    const broadcast = result(
      await this.client.broadcasts.create({
        name,
        segmentId: this.config.segmentId,
        from: this.config.from,
        subject: `Ano's weekly digest · ${window.key}`,
        previewText: selected
          .map((post) => post.title)
          .join(' · ')
          .slice(0, 140),
        ...content,
        send: false,
      }),
      'broadcast creation'
    )
    return broadcast.id
  }

  async sendDigest(id: string) {
    const broadcast = result(await this.client.broadcasts.get(id), 'broadcast status')
    // Recover safely if an earlier send succeeded but its acknowledgement was lost.
    if (broadcast.status === 'sent' || broadcast.status === 'queued') return
    result(await this.client.broadcasts.send(id), 'broadcast delivery')
  }
}
