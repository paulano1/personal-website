import { Resend } from 'resend'

async function main() {
  if (!process.env.RESEND_API_KEY || !process.env.NEWSLETTER_FROM) {
    throw new Error(
      'Securely configure RESEND_API_KEY and NEWSLETTER_FROM before running this helper.'
    )
  }
  const resend = new Resend(process.env.RESEND_API_KEY)
  const sender = process.env.NEWSLETTER_FROM.match(/<([^<>]+)>/)?.[1] || process.env.NEWSLETTER_FROM
  const domain = sender.trim().split('@')[1]?.toLowerCase()
  if (!domain) throw new Error('NEWSLETTER_FROM must contain a valid sender address.')
  const domains = await resend.domains.list()
  if (domains.error)
    throw new Error('Could not read Resend domains. Check key permissions in Resend.')
  if (
    !domains.data.data.some(
      (item) => item.name.toLowerCase() === domain && item.status === 'verified'
    )
  ) {
    throw new Error(
      'The sender domain is not verified in Resend. Complete domain verification first.'
    )
  }
  const name = "Ano's newsletter"
  let after
  do {
    const response = await resend.segments.list({ limit: 100, ...(after ? { after } : {}) })
    if (response.error) throw new Error('Could not list Resend segments. Check key permissions.')
    const existing = response.data.data.find((segment) => segment.name === name)
    if (existing) {
      console.log(`RESEND_SEGMENT_ID=${existing.id}`)
      return
    }
    after = response.data.has_more ? response.data.data.at(-1)?.id : undefined
  } while (after)
  const created = await resend.segments.create({ name })
  if (created.error) throw new Error('Could not create the newsletter segment in Resend.')
  console.log(`RESEND_SEGMENT_ID=${created.data.id}`)
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
