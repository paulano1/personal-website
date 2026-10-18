export type EngagementQuery = (
  text: string,
  params?: unknown[]
) => Promise<Record<string, unknown>[]>

function count(value: unknown): number {
  const result = Number(value)
  if (!Number.isSafeInteger(result) || result < 0) throw new Error('Invalid engagement count')
  return result
}

export function createEngagementStore(query: EngagementQuery) {
  return {
    async getViews() {
      const [row] = await query("SELECT value FROM website_metrics WHERE name = 'page_views'")
      if (!row) throw new Error('Engagement database has not been initialized')
      return count(row.value)
    },
    async recordView() {
      const [row] = await query(
        "UPDATE website_metrics SET value = value + 1 WHERE name = 'page_views' RETURNING value"
      )
      if (!row) throw new Error('Engagement database has not been initialized')
      return count(row.value)
    },
    async getLikes(slug: string, visitorHash: string | null) {
      const [row] = await query(
        'SELECT COUNT(*) AS likes, COALESCE(BOOL_OR(visitor_hash = $2), false) AS liked FROM website_post_likes WHERE slug = $1',
        [slug, visitorHash]
      )
      return { likes: count(row.likes), liked: row.liked === true }
    },
    async setLike(slug: string, visitorHash: string, liked: boolean) {
      if (liked) {
        await query(
          'INSERT INTO website_post_likes (slug, visitor_hash) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [slug, visitorHash]
        )
      } else {
        await query('DELETE FROM website_post_likes WHERE slug = $1 AND visitor_hash = $2', [
          slug,
          visitorHash,
        ])
      }
      return this.getLikes(slug, visitorHash)
    },
  }
}
