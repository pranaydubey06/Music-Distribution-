import type { SupabaseClient } from '@supabase/supabase-js'
import { parseStoragePathFromPublicUrl } from '@/lib/supabase/storage-path'
import type { Track } from '@/lib/types'

/**
 * Finds every release whose scheduled_deletion_at has passed and permanently
 * removes it — DB rows (cascades to tracks) plus the underlying Storage
 * files (cover art + every track's audio).
 *
 * There's no dedicated cron job here on purpose: Vercel's Hobby plan only
 * runs cron jobs once a day with imprecise timing, which isn't a good fit
 * for a 24h/48h deadline. Instead this runs opportunistically at the top of
 * the two main "list releases" routes — in practice that means a release is
 * cleaned up the next time anyone (the artist or the admin) loads a page
 * that reads releases, which for an actively-used app is effectively
 * real-time.
 */
export async function processScheduledDeletions(supabase: SupabaseClient): Promise<void> {
  const { data: overdue, error } = await supabase
    .from('releases')
    .select('*, tracks(*)')
    .not('scheduled_deletion_at', 'is', null)
    .lte('scheduled_deletion_at', new Date().toISOString())

  if (error || !overdue?.length) return

  for (const release of overdue) {
    const { error: deleteError } = await supabase.from('releases').delete().eq('id', release.id)

    if (deleteError) {
      console.error('Scheduled deletion failed for release', release.id, deleteError.message)
      continue
    }

    const urlsToClean = [
      release.cover_art_url,
      ...((release.tracks ?? []) as Track[]).map((track) => track.audio_url),
    ].filter((url): url is string => Boolean(url))

    for (const url of urlsToClean) {
      const parsed = parseStoragePathFromPublicUrl(url)
      if (!parsed) continue

      const { error: storageError } = await supabase.storage
        .from(parsed.bucket)
        .remove([parsed.path])

      if (storageError) {
        console.error('Storage cleanup failed for release', release.id, storageError.message)
      }
    }
  }
}
