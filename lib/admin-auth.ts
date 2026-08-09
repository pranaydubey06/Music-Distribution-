const ADMIN_HEADER = 'x-admin-passcode'

/**
 * Verifies the admin passcode sent by the client against the server-only
 * ADMIN_PASSCODE env var. This is a lightweight gate, not a replacement for
 * real authentication — see the README for hardening recommendations.
 */
export function isAdminAuthorized(request: Request): boolean {
  const expected = process.env.ADMIN_PASSCODE
  if (!expected) return false

  const provided = request.headers.get(ADMIN_HEADER)
  if (!provided) return false

  return provided === expected
}

export { ADMIN_HEADER }
