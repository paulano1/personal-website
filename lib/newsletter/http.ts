export async function readSubmission(request: Request): Promise<Record<string, unknown> | null> {
  if (!request.headers.get('content-type')?.includes('application/json')) return null
  if (Number(request.headers.get('content-length')) > 2048) return null
  const reader = request.body?.getReader()
  if (!reader) return null
  let size = 0
  const chunks: Uint8Array[] = []
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > 2048) {
        await reader.cancel()
        return null
      }
      chunks.push(value)
    }
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    return body && typeof body === 'object' && !Array.isArray(body) ? body : null
  } catch {
    return null
  }
}

export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return true
  try {
    const source = new URL(origin)
    const target = new URL(request.url)
    // Next.js can normalize request.url to its internal hostname. The Host
    // header carries the browser-facing host, including behind Vercel's proxy.
    const host = request.headers.get('host') || target.host
    return (
      source.host === host &&
      (source.protocol === 'https:' || (source.protocol === 'http:' && target.protocol === 'http:'))
    )
  } catch {
    return false
  }
}

export const PRIVATE_HEADERS = { 'Cache-Control': 'no-store' }
export const ACCEPTED = {
  message: 'If eligible, a confirmation email is on its way. Check your inbox and spam folder.',
}
