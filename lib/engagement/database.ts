import { neon } from '@neondatabase/serverless'
import { createEngagementStore } from './store'

export function engagementStore() {
  const connectionString = process.env.DATABASE_URL || process.env.PERSONAL_WEBSITE_POSTGRES_URL
  if (!connectionString) return null
  const sql = neon(connectionString)
  return createEngagementStore((text, params) => sql.query(text, params))
}
