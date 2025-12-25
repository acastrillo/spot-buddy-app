type HeaderValue = string | string[] | undefined
type HeaderSource = Headers | Record<string, HeaderValue>

function readHeader(headers: HeaderSource, name: string): string | undefined {
  if (headers instanceof Headers) {
    return headers.get(name) ?? undefined
  }

  const raw = headers[name] ?? headers[name.toLowerCase()]
  if (Array.isArray(raw)) {
    return raw[0]
  }
  return raw
}

export function getRequestIp(headers?: HeaderSource | null): string {
  if (!headers) return 'unknown'

  const forwardedFor = readHeader(headers, 'x-forwarded-for')
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]?.trim()
    if (first) return first
  }

  const realIp =
    readHeader(headers, 'x-real-ip') ||
    readHeader(headers, 'cf-connecting-ip') ||
    readHeader(headers, 'true-client-ip')

  return realIp?.trim() || 'unknown'
}
