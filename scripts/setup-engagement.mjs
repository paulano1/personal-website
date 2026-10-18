import { neon } from '@neondatabase/serverless'
import { readFile } from 'node:fs/promises'

if (!process.env.DATABASE_URL) {
  if (process.argv.includes('--if-configured'))
    console.log('Engagement database not configured; skipping initialization.')
  else {
    console.error('Configure DATABASE_URL securely before initializing engagement storage.')
    process.exitCode = 1
  }
} else {
  try {
    const sql = neon(process.env.DATABASE_URL)
    const source = await readFile(
      new URL('../db/migrations/001_engagement.sql', import.meta.url),
      'utf8'
    )
    const statements = source
      .split(';')
      .map((statement) => statement.trim())
      .filter(Boolean)
    await sql.transaction(statements.map((statement) => sql.query(statement)))
    console.log(
      'Engagement storage initialized. The initial view seed is 1,000; existing counts were preserved.'
    )
  } catch {
    console.error(
      'Could not initialize engagement storage. Verify the database connection and permissions.'
    )
    process.exitCode = 1
  }
}
