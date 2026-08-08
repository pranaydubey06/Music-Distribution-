import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let adminClient: SupabaseClient | null = null

/**
 * Server-only Supabase client, built lazily on first use.
 *
 * Uses the SERVICE ROLE key, which bypasses Row Level Security. This file
 * must never be imported from a "use client" component — only from Route
 * Handlers under /app/api/**, which run exclusively on the server. Built
 * lazily (rather than at module scope) so a missing env var never breaks
 * `next build`; it only throws if a request actually reaches a handler
 * without the variable configured.
 */
export function getSupabaseAdminClient(): SupabaseClient {
  if (adminClient) return adminClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY on the server.'
    )
  }

  adminClient = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  return adminClient
}
