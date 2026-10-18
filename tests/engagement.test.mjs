import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { Pool } from 'pg'
import { createEngagementStore } from '../lib/engagement/store.ts'
import { browserToken, newBrowserToken, postVisitorHash } from '../lib/engagement/anonymous.ts'

test('anonymous reactions use random tokens and different hashes for each post', () => {
  const token = newBrowserToken()
  assert.equal(browserToken(token), token)
  assert.notEqual(token, newBrowserToken())
  for (const bad of [undefined, '', 'email@example.com', 'not-a-uuid', token + 'x'])
    assert.equal(browserToken(bad), null)
  const first = postVisitorHash('personal/first', token)
  assert.match(first, /^[a-f0-9]{64}$/)
  assert.equal(first, postVisitorHash('personal/first', token))
  assert.notEqual(first, postVisitorHash('personal/second', token))
  assert.ok(!first.includes(token))
})

test(
  'Postgres stores seeded views and idempotent anonymous likes',
  { skip: !process.env.TEST_DATABASE_URL },
  async (t) => {
    const url = new URL(process.env.TEST_DATABASE_URL)
    assert.ok(
      ['127.0.0.1', 'localhost', '::1', '[::1]'].includes(url.hostname),
      'Integration tests must use an isolated local database'
    )
    const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL, max: 10 })
    const query = async (text, params) => (await pool.query(text, params)).rows
    const store = createEngagementStore(query)
    const migration = await readFile(
      new URL('../db/migrations/001_engagement.sql', import.meta.url),
      'utf8'
    )
    try {
      await pool.query('DROP TABLE IF EXISTS website_post_likes, website_metrics')
      await pool.query(migration)
      await t.test('counter starts at exactly 1,000', async () =>
        assert.equal(await store.getViews(), 1000)
      )
      await t.test('concurrent page views increment atomically without lost updates', async () => {
        const values = await Promise.all(Array.from({ length: 40 }, () => store.recordView()))
        assert.equal(new Set(values).size, 40)
        assert.equal(await store.getViews(), 1040)
      })
      await t.test('rerunning setup preserves existing totals', async () => {
        await pool.query(migration)
        assert.equal(await store.getViews(), 1040)
      })
      const slug = 'personal/test-post'
      const first = postVisitorHash(slug, newBrowserToken())
      const second = postVisitorHash(slug, newBrowserToken())
      await t.test('new post has zero likes', async () =>
        assert.deepEqual(await store.getLikes(slug, null), { likes: 0, liked: false })
      )
      await t.test('repeated and concurrent likes from one browser count once', async () => {
        await Promise.all(Array.from({ length: 20 }, () => store.setLike(slug, first, true)))
        assert.deepEqual(await store.getLikes(slug, first), { likes: 1, liked: true })
      })
      await t.test('different browsers count separately and maintain their own state', async () => {
        assert.deepEqual(await store.setLike(slug, second, true), { likes: 2, liked: true })
        assert.deepEqual(await store.getLikes(slug, null), { likes: 2, liked: false })
      })
      await t.test('unlike is idempotent and removes only that browser’s reaction', async () => {
        await Promise.all(Array.from({ length: 10 }, () => store.setLike(slug, first, false)))
        assert.deepEqual(await store.getLikes(slug, first), { likes: 1, liked: false })
        assert.deepEqual(await store.getLikes(slug, second), { likes: 1, liked: true })
      })
      await t.test('post counts are isolated and SQL input stays parameterized', async () => {
        const unusual = "post'); DROP TABLE website_metrics; --"
        await store.setLike(unusual, first, true)
        assert.deepEqual(await store.getLikes(unusual, first), { likes: 1, liked: true })
        assert.deepEqual(await store.getLikes(slug, second), { likes: 1, liked: true })
        assert.equal(await store.getViews(), 1040)
      })
    } finally {
      await pool.end()
    }
  }
)
