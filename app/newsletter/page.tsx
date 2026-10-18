import NewsletterForm from '@/components/NewsletterForm'
import { genPageMetadata } from 'app/seo'

export const metadata = genPageMetadata({
  title: 'Newsletter',
  description:
    'A weekly digest of new writing from Anomitro Paul on software, finance, and the things he is learning.',
})

export default function NewsletterPage() {
  return (
    <div className="max-w-2xl py-10">
      <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Stay in the loop</h1>
      <p className="mt-5 text-lg text-gray-600 dark:text-gray-400">
        I write about building software, understanding finance, and following my curiosity. Get new
        posts in your inbox on Mondays—no email in weeks when I haven’t published.
      </p>
      <NewsletterForm />
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Your email address is used only for this newsletter and stored securely with Resend. You can
        unsubscribe using the link in any issue.
      </p>
    </div>
  )
}
