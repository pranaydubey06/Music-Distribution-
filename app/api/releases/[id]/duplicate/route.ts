import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/server'
import { parseStoragePathFromPublicUrl } from '@/lib/supabase/storage-path'
import { logActivity } from '@/lib/log-activity'
import { requireArtist } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

/**
 * Copies a Storage object to a new path under the same bucket and returns
 * its public URL. Falls back to the original URL if anything about it
 * can't be parsed/copied — better to share a reference than to lose the
 * file from the duplicate entirely.
 */
async function copyStorageFile(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  url: string | null
): Promise<string | null> {
  if (!url) return null

  const parsed = parseStoragePathFromPublicUrl(url)
  if (!parsed) return url

  const newPath = `${parsed.path}-copy-${Date.now()}`
  const { error } = await supabase.storage.from(parsed.bucket).copy(parsed.path, newPath)

  if (error) {
    console.error('Storage copy failed, duplicate will reference the original file:', error.message)
    return url
  }

  return supabase.storage.from(parsed.bucket).getPublicUrl(newPath).data.publicUrl
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  let body: { artist_id?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  if (!body.artist_id) {
    return NextResponse.json({ error: 'artist_id is required.' }, { status: 400 })
  }

  const auth = await requireArtist(request, body.artist_id)
  if ('response' in auth) return auth.response

  try {
    const supabase = getSupabaseAdminClient()

    const { data: original, error: fetchError } = await supabase
      .from('releases')
      .select('*, tracks(*)')
      .eq('id', id)
      .single()

    if (fetchError || !original) {
      return NextResponse.json({ error: 'Release not found.' }, { status: 404 })
    }

    if (original.artist_id !== auth.artist.id) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 })
    }

    // Independent file copies — so deleting the original later doesn't
    // break the duplicate's audio/cover art.
    const copiedCoverArtUrl = await copyStorageFile(supabase, original.cover_art_url)

    const originalTracks = [...(original.tracks ?? [])].sort(
      (a, b) => a.track_number - b.track_number
    )

    const copiedTrackUrls = await Promise.all(
      originalTracks.map((track) => copyStorageFile(supabase, track.audio_url))
    )

    const { data: copy, error: copyError } = await supabase
      .from('releases')
      .insert({
        artist_id: original.artist_id,
        artist_name: original.artist_name,
        title: `${original.title} (Copy)`,
        version: original.version,
        release_type: original.release_type,
        cover_art_url: copiedCoverArtUrl,
        release_date: original.release_date,
        original_release_date: original.original_release_date,
        primary_genre: original.primary_genre,
        secondary_genre: original.secondary_genre,
        language: original.language,
        record_label: original.record_label,
        primary_artist_spotify_url: original.primary_artist_spotify_url,
        featuring_artists: original.featuring_artists,
        featuring_artist_spotify_urls: original.featuring_artist_spotify_urls,
        distribution_platforms: original.distribution_platforms ?? [],
        copyright: original.copyright,
        status: 'Draft',
      })
      .select('*')
      .single()

    if (copyError) {
      return NextResponse.json({ error: copyError.message }, { status: 500 })
    }

    const { data: copiedTracks, error: tracksError } = await supabase
      .from('tracks')
      .insert(
        originalTracks.map((track, index) => ({
          release_id: copy.id,
          track_number: index + 1,
          song_title: track.song_title,
          version: track.version,
          genre: track.genre,
          audio_url: copiedTrackUrls[index],
          duration: track.duration,
          explicit: track.explicit,
          instrumental: track.instrumental,
          isrc: track.isrc,
          language: track.language,
          featuring_artists: track.featuring_artists,
          songwriter: track.songwriter,
          composer: track.composer,
          producer: track.producer,
          lyrics: track.lyrics,
        }))
      )
      .select('*')

    if (tracksError) {
      await supabase.from('releases').delete().eq('id', copy.id)
      return NextResponse.json({ error: tracksError.message }, { status: 500 })
    }

    await logActivity(supabase, {
      artistId: auth.artist.id,
      artistName: original.artist_name,
      action: 'release_duplicated',
      detail: `"${original.title}" → "${copy.title}" (${copy.release_type})`,
    })

    return NextResponse.json(
      { release: { ...copy, tracks: copiedTracks } },
      { status: 201 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected server error.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
