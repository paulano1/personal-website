import siteMetadata from '../../data/siteMetadata'

export function newsletterConfig() {
  const apiKey = process.env.RESEND_API_KEY
  const segmentId = process.env.RESEND_SEGMENT_ID
  const from = process.env.NEWSLETTER_FROM
  const postalAddress = process.env.NEWSLETTER_POSTAL_ADDRESS
  if (
    process.env.NEWSLETTER_ENABLED !== 'true' ||
    !apiKey ||
    !segmentId ||
    !from ||
    !postalAddress
  ) {
    return null
  }
  return {
    apiKey,
    segmentId,
    from,
    postalAddress,
    siteUrl: siteMetadata.siteUrl.replace(/\/$/, ''),
  }
}
export type NewsletterConfig = NonNullable<ReturnType<typeof newsletterConfig>>
