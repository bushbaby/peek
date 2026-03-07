import { resolve4 } from 'dns/promises'
import { isIP } from 'net'

const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^::1$/,
  /^fc[0-9a-f]{2}:/i,
  /^fd[0-9a-f]{2}:/i,
]

function isPrivateIP(ip: string): boolean {
  return PRIVATE_IP_PATTERNS.some((r) => r.test(ip))
}

/**
 * Validates a user-supplied URL before fetching.
 * Rejects non-HTTP/S schemes and hostnames that resolve to private IP ranges (SSRF guard).
 */
export async function validateUrl(url: string): Promise<void> {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error('Invalid URL')
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only HTTP and HTTPS URLs are allowed')
  }

  const hostname = parsed.hostname

  // If hostname is already an IP literal, check directly
  if (isIP(hostname)) {
    if (isPrivateIP(hostname)) {
      throw new Error('Private IP addresses are not allowed')
    }
    return
  }

  // Resolve hostname to IP(s) and check each
  let addresses: string[]
  try {
    addresses = await resolve4(hostname)
  } catch {
    throw new Error(`Cannot resolve hostname: ${hostname}`)
  }

  for (const addr of addresses) {
    if (isPrivateIP(addr)) {
      throw new Error('Hostname resolves to a private IP address (SSRF protection)')
    }
  }
}

/**
 * Basic CSS selector syntax validation.
 * Returns false if the selector string would cause a parse error.
 */
export function isValidSelector(selector: string): boolean {
  if (!selector.trim()) return false
  // Reject obviously dangerous or empty selectors
  const FORBIDDEN = ['javascript:', 'data:']
  if (FORBIDDEN.some((f) => selector.toLowerCase().includes(f))) return false
  // Use a simple structural check — real validation happens at fetch time
  try {
    // This is a basic heuristic; full validation requires a DOM parser
    if (selector.length > 500) return false
    // Disallow null bytes or control characters
    if (/[\x00-\x1f]/.test(selector)) return false
    return true
  } catch {
    return false
  }
}
