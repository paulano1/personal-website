import test from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeEmail,
  weeklyWindow,
  selectDigestPosts,
  confirmationExpiry,
  CONFIRMATION_TTL,
  renderDigest,
} from '../lib/newsletter/domain.ts'
import { NewsletterService, NewsletterProviderError } from '../lib/newsletter/service.ts'
import { readSubmission, sameOrigin } from '../lib/newsletter/http.ts'

const config = {
  apiKey: 'fixture-only',
  from: 'Ano <newsletter@example.com>',
  segmentId: 'segment-fixture',
  postalAddress: 'Test postal address',
  siteUrl: 'https://example.com',
}
const ok = (data) => ({ data, error: null })
const missing = { data: null, error: { statusCode: 404 } }
const window = {
  start: '2026-10-03T18:00:00.000Z',
  end: '2026-10-10T18:00:00.000Z',
  key: '2026-10-10',
}
const post = {
  title: '<A & B>',
  summary: '<script>alert(1)</script>',
  slug: 'personal/a-post',
  date: '2026-10-10T00:00:00Z',
}

function fixture() {
  const calls = []
  const record =
    (name, data) =>
    async (...args) => {
      calls.push({ name, args })
      return typeof data === 'function' ? data(...args) : data
    }
  const client = {
    emails: { send: record('email', ok({ id: 'email-1' })) },
    contacts: {
      get: record('get-contact', missing),
      create: record('create-contact', ok({ id: 'contact-1' })),
      update: record('update-contact', ok({ id: 'contact-1' })),
      segments: { add: record('add-segment', ok({ id: 'segment-1' })) },
    },
    broadcasts: {
      list: record('list', ok({ data: [], has_more: false })),
      create: record('create', ok({ id: 'broadcast-1' })),
      get: record('get', ok({ id: 'broadcast-1', status: 'draft' })),
      send: record('send', ok({ id: 'broadcast-1' })),
    },
  }
  return { calls, client, service: new NewsletterService(client, config) }
}

test('normalizes email and rejects invalid values', () => {
  assert.equal(normalizeEmail(' Ano+news@Example.COM '), 'ano+news@example.com')
  for (const email of [
    null,
    {},
    '',
    'ano',
    'a@@example.com',
    'a\n@example.com',
    '<a>@example.com',
    'a'.repeat(255) + '@example.com',
  ])
    assert.equal(normalizeEmail(email), null)
})

test('weekly boundaries follow Pacific time including both DST transitions', () => {
  assert.equal(weeklyWindow(new Date('2026-10-10T18:00:00Z')).end, '2026-10-10T18:00:00.000Z')
  assert.equal(weeklyWindow(new Date('2026-12-05T18:00:00Z')).end, '2026-12-05T19:00:00.000Z')
  const spring = weeklyWindow(new Date('2026-03-14T18:00:00Z'))
  assert.equal((Date.parse(spring.end) - Date.parse(spring.start)) / 3_600_000, 167)
  const autumn = weeklyWindow(new Date('2026-11-07T18:00:00Z'))
  assert.equal((Date.parse(autumn.end) - Date.parse(autumn.start)) / 3_600_000, 169)
  assert.equal(
    weeklyWindow(new Date('2026-10-10T02:00:00Z')).key,
    '2026-10-03',
    'Friday evening Pacific stays in the previous week'
  )
})

test('includes start boundary once, excludes end boundary, drafts, future and invalid dates', () => {
  const selected = selectDigestPosts(
    [
      post,
      { ...post, slug: 'draft', draft: true },
      { ...post, slug: 'start', date: window.start },
      { ...post, slug: 'end', date: window.end },
      { ...post, slug: 'old', date: '2025-01-01' },
      { ...post, slug: 'future', date: '2027-01-01' },
      { ...post, slug: 'bad', date: 'invalid' },
    ],
    window
  )
  assert.deepEqual(
    selected.map((p) => p.slug),
    [post.slug, 'start']
  )
})

test('confirmation tokens must be cryptographic format, unexpired and bounded to 24 hours', () => {
  const now = Date.parse('2026-10-10T18:00:00Z')
  const token = (expiry) => `newsletter-confirm.${'a'.repeat(64)}.${expiry}`
  assert.equal(confirmationExpiry(token(now + CONFIRMATION_TTL), now), now + CONFIRMATION_TTL)
  for (const value of [
    'run_123',
    token(now),
    token(now - 1),
    token(now + CONFIRMATION_TTL + 1),
    null,
  ])
    assert.equal(confirmationExpiry(value, now), null)
})

test('renders escaped HTML, plain text and Resend-managed unsubscribe links', () => {
  const { html, text } = renderDigest([post], config.siteUrl, '<Postal>')
  assert.ok(html.includes('&lt;A &amp; B&gt;'))
  assert.ok(!html.includes('<script>'))
  assert.ok(html.includes('&lt;Postal&gt;'))
  assert.ok(html.includes('{{{RESEND_UNSUBSCRIBE_URL}}}'))
  assert.ok(text.includes('https://example.com/blog/personal/a-post'))
})

test('confirmation email uses idempotency and does not enroll the recipient', async () => {
  const { service, calls } = fixture()
  await service.sendConfirmation('reader@example.com', 'secret-token', 'request-key')
  assert.deepEqual(
    calls.map((c) => c.name),
    ['email']
  )
  assert.equal(calls[0].args[1].idempotencyKey, 'request-key')
  assert.ok(calls[0].args[0].text.includes('/newsletter/confirm#secret-token'))
})

test('confirmed new reader joins only the configured segment', async () => {
  const { service, calls } = fixture()
  await service.enroll('reader@example.com')
  assert.deepEqual(
    calls.map((c) => c.name),
    ['get-contact', 'create-contact']
  )
  assert.deepEqual(calls[1].args[0].segments, [{ id: config.segmentId }])
  assert.equal(calls[1].args[0].unsubscribed, false)
})

test('previously unsubscribed reader requires explicit enrollment after fresh confirmation', async () => {
  const { client, service, calls } = fixture()
  client.contacts.get = async () => ok({ id: 'contact-1', unsubscribed: true })
  await service.enroll('reader@example.com')
  assert.deepEqual(
    calls.map((c) => c.name),
    ['update-contact', 'add-segment']
  )
  assert.equal(calls[0].args[0].unsubscribed, false)
})

test('empty digest makes no provider calls', async () => {
  const { service, calls } = fixture()
  assert.equal(await service.prepareDigest([], window), null)
  assert.equal(calls.length, 0)
})

test('digest is created as a draft addressed to the confirmed subscriber segment', async () => {
  const { service, calls } = fixture()
  assert.equal(await service.prepareDigest([post], window), 'broadcast-1')
  const payload = calls.find((c) => c.name === 'create').args[0]
  assert.equal(payload.send, false)
  assert.equal(payload.segmentId, config.segmentId)
  assert.ok(payload.html.includes('{{{RESEND_UNSUBSCRIBE_URL}}}'))
  assert.ok(!calls.some((c) => c.name === 'send'))
})

test('retry reconciles an existing broadcast across paginated results', async () => {
  const { service, client, calls } = fixture()
  client.broadcasts.list = async ({ after }) =>
    after
      ? ok({ data: [{ id: 'existing', name: `ano-weekly-${window.key}` }], has_more: false })
      : ok({ data: [{ id: 'cursor', name: 'other' }], has_more: true })
  assert.equal(await service.prepareDigest([post], window), 'existing')
  assert.equal(calls.length, 0)
})

test('send retries do not resend queued or sent broadcasts', async () => {
  for (const status of ['sent', 'queued']) {
    const { service, client, calls } = fixture()
    client.broadcasts.get = async () => ok({ status })
    await service.sendDigest('existing')
    assert.ok(!calls.some((c) => c.name === 'send'))
  }
  const { service, calls } = fixture()
  await service.sendDigest('draft')
  assert.deepEqual(
    calls.map((c) => c.name),
    ['get', 'send']
  )
})

test('provider failure is surfaced without leaking recipient details', async () => {
  const { service, client } = fixture()
  client.emails.send = async () => ({
    data: null,
    error: { statusCode: 429, message: 'reader@example.com' },
  })
  await assert.rejects(
    () => service.sendConfirmation('reader@example.com', 'token', 'key'),
    (error) =>
      error instanceof NewsletterProviderError &&
      error.status === 429 &&
      !error.message.includes('reader@example.com')
  )
})

test('HTTP input rejects malformed and oversized bodies including false content length', async () => {
  const request = (body, headers = {}) =>
    new Request('https://example.com/api/newsletter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body,
    })
  assert.deepEqual(await readSubmission(request('{"email":"reader@example.com"}')), {
    email: 'reader@example.com',
  })
  for (const body of [
    'not json',
    'null',
    '[]',
    '"string"',
    JSON.stringify({ email: 'x'.repeat(3000) }),
  ])
    assert.equal(await readSubmission(request(body)), null)
  assert.equal(await readSubmission(request('{}', { 'Content-Type': 'text/plain' })), null)
  assert.equal(await readSubmission(request('x'.repeat(3000), { 'Content-Length': '2' })), null)
})

test('blocks cross-origin browser submissions', () => {
  assert.equal(
    sameOrigin(
      new Request('https://example.com/api/newsletter', {
        headers: { Origin: 'https://evil.example' },
      })
    ),
    false
  )
  assert.equal(
    sameOrigin(
      new Request('https://example.com/api/newsletter', {
        headers: { Origin: 'https://example.com' },
      })
    ),
    true
  )
})

test('origin validation uses the public Host behind the Next.js proxy', () => {
  assert.equal(
    sameOrigin(
      new Request('http://localhost:3000/api/newsletter', {
        headers: { Host: 'www.example.com', Origin: 'https://www.example.com' },
      })
    ),
    true
  )
  assert.equal(
    sameOrigin(
      new Request('http://localhost:3000/api/newsletter', {
        headers: { Host: 'www.example.com', Origin: 'null' },
      })
    ),
    false
  )
})

test('date-only Saturday posts wait for the next digest rather than being missed after send time', () => {
  const saturdayPost = { ...post, date: '2026-10-10' }
  assert.equal(selectDigestPosts([saturdayPost], window).length, 0)
  const next = { start: window.end, end: '2026-10-17T18:00:00.000Z', key: '2026-10-17' }
  assert.equal(selectDigestPosts([saturdayPost], next).length, 1)
})
