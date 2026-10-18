import NewsletterForm from '@/components/NewsletterForm'
import { genPageMetadata } from 'app/seo'

export const metadata = genPageMetadata({
  title: 'Newsletter',
  description:
    'A weekly digest of new writing from Anomitro Paul on software, finance, and the things he is learning.',
})

export default function NewsletterPage() {
  return (
    <div>
      <div className="space-y-2 border-b border-gray-200 pt-6 pb-8 md:space-y-5 dark:border-gray-700">
        <h1 className="text-3xl leading-9 font-extrabold tracking-tight text-gray-900 sm:text-4xl sm:leading-10 md:text-6xl md:leading-14 dark:text-gray-100">
          Newsletter
        </h1>
        <p className="text-lg leading-7 text-gray-500 dark:text-gray-400">
          New posts in your inbox, once a week. Unsubscribe anytime.
        </p>
      </div>
      <div className="max-w-lg py-6 sm:py-10">
        <NewsletterForm />
      </div>
    </div>
  )
}
