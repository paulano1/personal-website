import assert from 'node:assert/strict'

const origin = process.env.SMOKE_ORIGIN || 'http://127.0.0.1:3000'
const checks = [
  ['/', 200, 'I go by Ano.'],
  ['/about', 200, 'I go by Ano.'],
  ['/newsletter', 200, 'Stay in the loop'],
  ['/newsletter/confirm', 200, 'Confirm your subscription'],
  ['/projects', 200, 'Opioid Addiction Recovery'],
  ['/blog', 200, 'Why Mercor'],
  ['/blog/personal/why-mercor', 200, 'Hiring Inefficiencies'],
  ['/blog/personal/durable-executions', 200, 'Durable Execution'],
  ['/tags', 200, 'finance'],
  ['/tags/finance', 200, 'Finance'],
  ['/blog/page/1', 200, 'All Posts'],
  ['/blog/page/999', 404, ''],
  ['/blog/does-not-exist', 404, ''],
  ['/search.json', 200, 'why-mercor'],
  ['/feed.xml', 200, '<rss'],
  ['/sitemap.xml', 200, 'https://www.anomitropaul.com/blog/'],
  ['/robots.txt', 200, 'Sitemap:'],
]

for (const [path, status, content] of checks) {
  const response = await fetch(new URL(path, origin), { signal: AbortSignal.timeout(30_000) })
  assert.equal(response.status, status, `${path}: HTTP status`)
  const body = await response.text()
  assert.ok(body.includes(content), `${path}: expected content ${JSON.stringify(content)}`)
  console.log(`PASS ${path} (${status})`)
}

// These checks never enqueue mail or a digest and need no credentials.
const availability = await fetch(new URL('/api/newsletter', origin))
assert.equal(availability.status, 200, 'Newsletter availability endpoint')
assert.equal(typeof (await availability.json()).enabled, 'boolean')
assert.ok(availability.headers.get('cache-control')?.includes('no-store'))
const invalidSignup = await fetch(new URL('/api/newsletter', origin), {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'not-an-email' }),
})
assert.equal(invalidSignup.status, 400, 'Invalid signup is rejected before provider access')
const invalidConfirmation = await fetch(new URL('/api/newsletter/confirm', origin), {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token: 'invalid' }),
})
assert.equal(invalidConfirmation.status, 410, 'Invalid confirmation token is rejected')
console.log('PASS newsletter availability and safe input rejection')

const home = await fetch(new URL('/', origin)).then((response) => response.text())
const stylesheets = [...home.matchAll(/href="([^\"]+\.css(?:\?[^\"]*)?)"/g)].map((match) =>
  match[1].replaceAll('&amp;', '&')
)
assert.ok(stylesheets.length, 'Home page links a stylesheet')
let hasFont = false
for (const path of new Set(stylesheets)) {
  const url = new URL(path, origin)
  const response = await fetch(url)
  assert.equal(response.status, 200, `${path}: stylesheet loads`)
  const css = await response.text()
  for (const match of css.matchAll(/url\(["']?([^\s)"']+\.woff2)["']?\)/g)) {
    const font = await fetch(new URL(match[1], url))
    assert.equal(font.status, 200, 'Self-hosted font loads')
    hasFont = true
  }
}
assert.ok(hasFont, 'Self-hosted font is linked from the stylesheet')
console.log('PASS stylesheets and self-hosted fonts')
console.log(`Passed ${checks.length} route checks and static asset checks against ${origin}`)
