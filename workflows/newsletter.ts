import { createHook, sleep } from 'workflow'
import type { DigestWindow } from '../lib/newsletter/domain'
import {
  createConfirmation,
  sendConfirmation,
  enrollSubscriber,
  prepareWeeklyDigest,
  deliverWeeklyDigest,
} from '../lib/newsletter/steps'

export async function subscribeToNewsletter(email: string, requestKey: string) {
  'use workflow'
  const claim = createHook({ token: requestKey, experimental_minRetention: '1h' })
  if (await claim.getConflict()) return { status: 'duplicate' }

  const { token, expiresAt } = await createConfirmation()
  using confirmation = createHook<{ confirmed: boolean }>({ token })
  await confirmation.getConflict()
  await sendConfirmation(email, token, requestKey)
  const confirmed = await Promise.race([
    confirmation.then((value) => value.confirmed),
    sleep(new Date(expiresAt)).then(() => false),
  ])
  if (!confirmed) return { status: 'expired' }
  await enrollSubscriber(email)
  return { status: 'subscribed' }
}

export async function weeklyNewsletter(window: DigestWindow) {
  'use workflow'
  // Retention also prevents repeat cron deliveries after the run has completed.
  // Do not use `using`: disposing this hook would release the reservation early.
  const claim = createHook({
    token: `newsletter-digest:${window.key}`,
    experimental_minRetention: '30d',
  })
  if (await claim.getConflict()) return { status: 'duplicate' }
  await sleep(new Date(window.end))
  const id = await prepareWeeklyDigest(window)
  if (!id) return { status: 'no-new-posts' }
  await deliverWeeklyDigest(id)
  return { status: 'sent', broadcastId: id }
}
