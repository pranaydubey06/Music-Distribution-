import type { SupabaseClient } from '@supabase/supabase-js'
import type { ActivityAction } from '@/lib/types'

interface LogOptions {
  artistId?: string | null
  artistName?: string | null
  action: ActivityAction
  detail?: string | null
}

/**
 * Inserts one activity_log row. Fire-and-forget: always resolves, never
 * throws. A logging failure must never break the actual action being logged.
 */
export async function logActivity(
  supabase: SupabaseClient,
  options: LogOptions
): Promise<void> {
  try {
    await supabase.from('activity_logs').insert({
      artist_id: options.artistId ?? null,
      artist_name: options.artistName ?? null,
      action: options.action,
      detail: options.detail ?? null,
    })
  } catch (err) {
    console.error('Activity logging failed (non-fatal):', err)
  }
}
