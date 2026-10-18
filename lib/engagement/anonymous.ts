import { createHash, randomUUID } from 'node:crypto'

export const REACTION_COOKIE = 'post_reaction'

export function browserToken(cookieValue: string | undefined) {
  return cookieValue &&
    /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(cookieValue)
    ? cookieValue
    : null
}

export function newBrowserToken() {
  return randomUUID()
}

export function postVisitorHash(slug: string, token: string) {
  // Salt each post with its slug so database rows cannot correlate a browser
  // across different posts. No IP, account, email, or raw browser token is stored.
  return createHash('sha256').update(`${slug}\0${token}`).digest('hex')
}
