import NewsletterConfirmation from '@/components/NewsletterConfirmation'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Confirm your subscription',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

export default function ConfirmNewsletterPage() {
  return <NewsletterConfirmation />
}
