import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/server'
import { processScheduledDeletions } from '@/lib/process-scheduled-deletions'
import { logActivity } from '@/lib/log-activity'
import { requireArtist } from '@/lib/api-auth'
import { getArtistAccessState } from '@/lib/artist-access'
import type { ReleaseType } from '@/lib/types'

export const dynamic = 'force-dynamic'

const VALID_RELEASE_TYPES: ReleaseType[] = ['Single', 'EP', 'Album']

interface IncomingTrack {
  song_title?: string
  version?: string | null
  genre?: string | null
  audio_url?: string
  duration?: number | null
  explicit?: boolean
  instrumental?: boolean
  isrc?: string | null
  language?: string | null
  featuring_artists?: string | null
  songwriter?: string | null
  composer?: string | null
  producer?: string | null
  lyrics?: string | null
}

interface CreateReleaseBody {
  artist_id?: string
  artist_name?: string
  title?: string
  version?: string | null
  release_type?: string
  cover_art_url?: string | null
  release_date?: string | null
  original_release_date?: string | null
  primary_genre?: string | null
  secondary_genre?: string | null
  language?: string | null
  record_label?: string | null
  primary_artist_spotify_url?: string | null
  featuring_artists?: string | null
  featuring_artist_spotify_urls?: string | null
  distribution_platforms?: string[]
  copyright?: string | null
  /** Defaults to 'Pending Review'. Only 'Draft' may be passed explicitly. */
  status?: 'Draft' | 'Pending Review'
  tracks?: IncomingTrack[]
}

export async function POST(request: Request) {
  let body: CreateReleaseBody

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { artist_id, artist_name, title, cover_art_url, release_date, tracks } = body
  const releaseType = body.release_type as ReleaseType

  if (!artist_id || !artist_name?.trim() || !title?.trim()) {
    return NextResponse.json(
      { error: 'artist_id, artist_name, and title are required.' },
      { status: 400 }
    )
  }

  const auth = await requireArtist(request, artist_id)
  if ('response' in auth) return auth.response

  // Server-side entitlement check: a hidden/disabled button must never be the
  // only protection for release uploads.
  const entitlement = await getArtistAccessState(getSupabaseAdminClient(), auth.artist.id)
  if (!entitlement.active) {
    return NextResponse.json({ error: entitlement.expired ? 'Subscription Expired. Please contact support to renew.' : 'Upload access is locked.' }, { status: 403 })
  }

  if (!releaseType || !VALID_RELEASE_TYPES.includes(releaseType)) {
    return NextResponse.json(
      { error: `release_type must be one of: ${VALID_RELEASE_TYPES.join(', ')}` },
      { status: 400 }
    )
  }

  const status = body.status === 'Draft' ? 'Draft' : 'Pending Review'

  if (!tracks || tracks.length === 0) {
    return NextResponse.json({ error: 'At least one track is required.' }, { status: 400 })
  }

  for (const track of tracks) {
    if (!track.song_title?.trim() || !track.audio_url) {
      return NextResponse.json(
        { error: 'Every track needs a song_title and audio_url.' },
        { status: 400 }
      )
    }
  }

  const supabase = getSupabaseAdminClient()

  try {
    const { data: release, error: releaseError } = await supabase
      .from('releases')
      .insert({
        artist_id: auth.artist.id,
        artist_name: auth.artist.name,
        title: title.trim(),
        version: body.version?.trim() || null,
        release_type: releaseType,
        cover_art_url: cover_art_url ?? null,
        release_date: release_date || null,
        original_release_date: body.original_release_date || null,
        primary_genre: body.primary_genre?.trim() || null,
        secondary_genre: body.secondary_genre?.trim() || null,
        language: body.language?.trim() || null,
        record_label: body.record_label?.trim() || null,
        primary_artist_spotify_url: body.primary_artist_spotify_url?.trim() || null,
        featuring_artists: body.featuring_artists?.trim() || null,
        featuring_artist_spotify_urls: body.featuring_artist_spotify_urls?.trim() || null,
        distribution_platforms: Array.isArray(body.distribution_platforms)
          ? body.distribution_platforms.filter((platform) => typeof platform === 'string' && platform.trim()).map((platform) => platform.trim())
          : [],
        copyright: body.copyright?.trim() || null,
        status,
      })
      .select('*')
      .single()

    if (releaseError) {
      return NextResponse.json({ error: releaseError.message }, { status: 500 })
    }

    const { data: insertedTracks, error: tracksError } = await supabase
      .from('tracks')
      .insert(
        tracks.map((track, index) => ({
          release_id: release.id,
          track_number: index + 1,
          song_title: track.song_title!.trim(),
          version: track.version?.trim() || null,
          genre: track.genre?.trim() || null,
          audio_url: track.audio_url,
          duration: Number.isFinite(track.duration) ? Math.max(0, Math.round(track.duration!)) : null,
          explicit: track.explicit ?? false,
          instrumental: track.instrumental ?? false,
          isrc: track.isrc?.trim() || null,
          language: track.language?.trim() || null,
          featuring_artists: track.featuring_artists?.trim() || null,
          songwriter: track.songwriter?.trim() || null,
          composer: track.composer?.trim() || null,
          producer: track.producer?.trim() || null,
          lyrics: track.lyrics?.trim() || null,
        }))
      )
      .select('*')

    if (tracksError) {
      // Roll back the release so we don't leave an empty, track-less project behind.
      await supabase.from('releases').delete().eq('id', release.id)
      return NextResponse.json({ error: tracksError.message }, { status: 500 })
    }

    await logActivity(supabase, {
      artistId: auth.artist.id,
      artistName: auth.artist.name,
      action: release.status === 'Draft' ? 'release_submitted' : 'release_submitted',
      detail: `${release.title} (${release.release_type}) — ${release.status}`,
    })

    return NextResponse.json(
      { release: { ...release, tracks: insertedTracks } },
      { status: 201 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected server error.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const artistId = searchParams.get('artist_id')

  if (!artistId) {
    return NextResponse.json({ error: 'artist_id query parameter is required.' }, { status: 400 })
  }

  const auth = await requireArtist(request, artistId)
  if ('response' in auth) return auth.response

  try {
    const supabase = getSupabaseAdminClient()

    await processScheduledDeletions(supabase)

    const { data, error } = await supabase
      .from('releases')
      .select('*, tracks(*)')
      .eq('artist_id', auth.artist.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const releases = (data ?? []).map((release) => ({
      ...release,
      tracks: [...(release.tracks ?? [])].sort((a, b) => a.track_number - b.track_number),
    }))

    return NextResponse.json({ releases })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected server error.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
