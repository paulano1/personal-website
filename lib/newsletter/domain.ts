export const CONFIRMATION_TTL = 24 * 60 * 60 * 1000
const TIME_ZONE = 'America/Los_Angeles'

export type DigestPost = {
  title: string
  summary?: string
  slug: string
  date: string
  draft?: boolean
}
export type DigestWindow = { start: string; end: string; key: string }

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const email = value.trim().toLowerCase()
  if (email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) return null
  return email
}

// The UTC cron runs at 18:00 Saturday; in winter the workflow waits until 19:00.
// Construct each boundary separately so DST weeks can have 167 or 169 hours.
function elevenPacific(date: Date): Date {
  const candidate = new Date(date)
  candidate.setUTCHours(18, 0, 0, 0)
  const hour = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    hour: '2-digit',
    hourCycle: 'h23',
  }).format(candidate)
  if (hour !== '11') candidate.setUTCHours(19)
  return candidate
}

export function weeklyWindow(now: Date): DigestWindow {
  const localDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
  const saturday = new Date(`${localDate}T00:00:00Z`)
  saturday.setUTCDate(saturday.getUTCDate() - ((saturday.getUTCDay() + 1) % 7))
  const end = elevenPacific(saturday)
  saturday.setUTCDate(saturday.getUTCDate() - 7)
  return {
    start: elevenPacific(saturday).toISOString(),
    end: end.toISOString(),
    key: end.toISOString().slice(0, 10),
  }
}

export function selectDigestPosts(posts: DigestPost[], window: DigestWindow): DigestPost[] {
  return posts
    .filter((post) => {
      // Date-only frontmatter has no publish time. Wait until that UTC day
      // ends so a post published after Saturday's send is not missed forever.
      const date = Date.parse(
        /^\d{4}-\d{2}-\d{2}$/.test(post.date) ? `${post.date}T23:59:59.999Z` : post.date
      )
      return !post.draft && date >= Date.parse(window.start) && date < Date.parse(window.end)
    })
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date) || a.slug.localeCompare(b.slug))
    .map(({ title, summary, slug, date }) => ({ title, summary, slug, date }))
}

export function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!
  )
}

export function confirmationExpiry(token: unknown, now = Date.now()): number | null {
  if (typeof token !== 'string') return null
  const match = /^newsletter-confirm\.([a-f0-9]{64})\.(\d{13})$/.exec(token)
  if (!match) return null
  const expiresAt = Number(match[2])
  return expiresAt > now && expiresAt <= now + CONFIRMATION_TTL ? expiresAt : null
}

export function renderDigest(posts: DigestPost[], siteUrl: string, postalAddress: string) {
  const unsubscribe = '{{{RESEND_UNSUBSCRIBE_URL}}}'
  const link = (slug: string) =>
    `${siteUrl}/blog/${slug.split('/').map(encodeURIComponent).join('/')}`
  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;line-height:1.7;color:#171717;max-width:600px;margin:32px auto;padding:0 20px"><p>ANO'S NEWSLETTER</p><h1>This week on the blog</h1><p>New writing on software, finance, and the things I'm learning.</p>${posts.map((post) => `<article><h2><a href="${escapeHtml(link(post.slug))}">${escapeHtml(post.title)}</a></h2><p>${escapeHtml(post.summary || '')}</p><p><a href="${escapeHtml(link(post.slug))}">Read the post →</a></p></article>`).join('')}<hr><p>You're receiving this because you confirmed your subscription at <a href="${escapeHtml(siteUrl)}/newsletter">${escapeHtml(siteUrl)}</a>.</p><p><a href="${unsubscribe}">Unsubscribe</a></p><p>${escapeHtml(postalAddress)}</p></body></html>`
  const text = `This week on Ano's blog\n\n${posts.map((post) => `${post.title}\n${post.summary || ''}\n${link(post.slug)}`).join('\n\n')}\n\nUnsubscribe: ${unsubscribe}\n${postalAddress}`
  return { html, text }
}
