const INVITE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function randomSegment(length: number): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => INVITE_ALPHABET[byte % INVITE_ALPHABET.length]).join('')
}

/** Generate a host-unique 4-4-4 invite code and reserve it in the supplied set. */
export function generateInviteCode(existingCodes: Set<string>): string {
  let code = `${randomSegment(4)}-${randomSegment(4)}-${randomSegment(4)}`
  while (existingCodes.has(code)) {
    code = `${randomSegment(4)}-${randomSegment(4)}-${randomSegment(4)}`
  }
  existingCodes.add(code)
  return code
}
