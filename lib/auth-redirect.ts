/**
 * Detects whether the current URL is a Supabase auth email link that must be
 * handled by a specific page, regardless of where it landed.
 *
 * Supabase links can arrive in two shapes:
 *   PKCE flow:      ?code=xxxx            (+ our own type hint if any)
 *   Implicit flow:  #access_token=…&type=recovery|signup|…
 *
 * If the redirect URL isn't whitelisted in the Supabase dashboard, links fall
 * back to the Site URL (usually /), so the gateway pages use these helpers to
 * forward the user to the right place WITH the params intact.
 */

export function isAuthRecoveryUrl(): boolean {
  if (typeof window === 'undefined') return false
  const { search, hash } = window.location

  // Implicit flow marks recovery explicitly.
  if (hash.includes('type=recovery') || search.includes('type=recovery')) {
    return true
  }

  // PKCE flow: a bare ?code= is ambiguous (recovery vs verification), but
  // verification links carry our own ?verified=1 marker (set via
  // emailRedirectTo at sign-up), so code-without-verified means recovery.
  const params = new URLSearchParams(search)
  return params.has('code') && params.get('verified') !== '1'
}
