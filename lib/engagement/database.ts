import { neon } from '@neondatabase/serverless'
import { createEngagementStore } from './store'

export function engagementStore() {
  if (!process.env.DATABASE_URL) return null
  const sql = neon(process.env.DATABASE_URL)
  return createEngagementStore((text, params) => sql.query(text, params))
}
