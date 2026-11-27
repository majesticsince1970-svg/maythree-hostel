/** Identity of one public-form submission, created once per form session. */
export interface ApplicationSubmission {
  id: string
  refNo: string
}

function randomUint32(): number {
  const values = new Uint32Array(1)
  crypto.getRandomValues(values)
  return values[0]
}

/** RFC 4122 v4 UUID; falls back to getRandomValues where randomUUID is unavailable (plain-http LAN testing). */
function randomUuid(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/**
 * Application reference such as HST-2026-048213: the current year in India and six random
 * digits. The database keeps ref_no unique; a clash is retried with a new number.
 */
export function generateApplicationRefNo(now: Date = new Date()): string {
  const year = now.toLocaleString('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric' })
  return `HST-${year}-${String(randomUint32() % 1_000_000).padStart(6, '0')}`
}

export function newApplicationSubmission(): ApplicationSubmission {
  return { id: randomUuid(), refNo: generateApplicationRefNo() }
}
