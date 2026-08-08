import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/server'
import { parseStoragePathFromPublicUrl } from '@/lib/supabase/storage-path'
import { logActivity } from '@/lib/log-activity'
import type { ReleaseType, Track } from '@/lib/types'
import { requireArtist } from '@/lib/api-auth'
import { getArtistAccessState } from '@/lib/artist-access'

export const dynamic = 'force-dynamic'

const VALID_RELEASE_TYPES: ReleaseType[] = ['Single', 'EP', 'Album']
const EDITABLE_STATUSES = ['Draft', 'Pending Review', 'Needs Changes', 'Rejected']

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

interface EditBody {
  artist_id?: string
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
  /** Optional explicit target status (only 'Draft' or 'Pending Review' are honored). */
  status?: 'Draft' | 'Pending Review'
  tracks?: IncomingTrack[]
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  let body: EditBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { artist_id, title, cover_art_url, release_date, tracks } = body
  const releaseType = body.release_type as ReleaseType

  if (!artist_id || !title?.trim()) {
    return NextResponse.json({ error: 'artist_id and title are required.' }, { status: 400 })
  }

  const auth = await requireArtist(request, artist_id)
  if ('response' in auth) return auth.response

  if (!releaseType || !VALID_RELEASE_TYPES.includes(releaseType)) {
    return NextResponse.json(
      { error: `release_type must be one of: ${VALID_RELEASE_TYPES.join(', ')}` },
      { status: 400 }
    )
  }

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

  try {
    const supabase = getSupabaseAdminClient()

    // Only the owning artist can edit, and only while it's still Draft,
    // Pending Review, or Rejected — this isn't real auth, but it matches
    // the rest of the app's model and stops an approved/live release from
    // being silently rewritten.
    const { data: existing, error: fetchError } = await supabase
      .from('releases')
      .select('*, tracks(*)')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Release not found.' }, { status: 404 })
    }

    if (existing.artist_id !== auth.artist.id) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 })
    }

    if (!EDITABLE_STATUSES.includes(existing.status)) {
      return NextResponse.json(
        { error: 'Only a draft, pending, needs-changes, or rejected release can be edited.' },
        { status: 400 }
      )
    }

    // Resulting status: an explicit target wins; otherwise a rejected or
    // needs-changes release resubmits to Pending Review, and a draft/pending
    // one keeps its current status (editing it doesn't change where it stands).
    const nextStatus =
      body.status === 'Draft' || body.status === 'Pending Review'
        ? body.status
        : existing.status === 'Rejected' || existing.status === 'Needs Changes'
          ? 'Pending Review'
          : existing.status

    // Resubmission can also happen through the edit endpoint, so it must use
    // the same entitlement gate as the dedicated submit endpoint.
    if (nextStatus === 'Pending Review' && existing.status !== 'Pending Review') {
      const entitlement = await getArtistAccessState(supabase, auth.artist.id)
      if (!entitlement.active) {
        return NextResponse.json(
          { error: entitlement.expired ? 'Subscription Expired. Please contact support to renew.' : 'Upload access is locked.' },
          { status: 403 }
        )
      }
    }

    // The status-page editor is intentionally smaller than the upload wizard.
    // Preserve wizard-only metadata unless this request explicitly supplies it.
    const { data: release, error: updateError } = await supabase
      .from('releases')
      .update({
        title: title.trim(),
        version: body.version === undefined ? existing.version : body.version?.trim() || null,
        release_type: releaseType,
        cover_art_url: cover_art_url ?? null,
        release_date: release_date || null,
        original_release_date: body.original_release_date === undefined ? existing.original_release_date : body.original_release_date || null,
        primary_genre: body.primary_genre === undefined ? existing.primary_genre : body.primary_genre?.trim() || null,
        secondary_genre: body.secondary_genre === undefined ? existing.secondary_genre : body.secondary_genre?.trim() || null,
        language: body.language === undefined ? existing.language : body.language?.trim() || null,
        record_label: body.record_label === undefined ? existing.record_label : body.record_label?.trim() || null,
        primary_artist_spotify_url: body.primary_artist_spotify_url === undefined ? existing.primary_artist_spotify_url : body.primary_artist_spotify_url?.trim() || null,
        featuring_artists: body.featuring_artists === undefined ? existing.featuring_artists : body.featuring_artists?.trim() || null,
        featuring_artist_spotify_urls: body.featuring_artist_spotify_urls === undefined ? existing.featuring_artist_spotify_urls : body.featuring_artist_spotify_urls?.trim() || null,
        distribution_platforms: body.distribution_platforms === undefined
          ? existing.distribution_platforms
          : Array.isArray(body.distribution_platforms)
          ? body.distribution_platforms.filter((platform) => typeof platform === 'string' && platform.trim()).map((platform) => platform.trim())
          : [],
        copyright: body.copyright?.trim() || null,
        status: nextStatus,
        rejection_reason: null,
        admin_note: null,
      })
      .eq('id', id)
      .select('*')
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Full replace of the track list: simplest correct way to handle
    // additions, removals, and edits in one save.
    const { error: deleteTracksError } = await supabase
      .from('tracks')
      .delete()
      .eq('release_id', id)

    if (deleteTracksError) {
      return NextResponse.json({ error: deleteTracksError.message }, { status: 500 })
    }

    const previousTracks = ((existing.tracks ?? []) as IncomingTrack[]).sort(
      (a, b) => ((a as IncomingTrack & { track_number?: number }).track_number ?? 0) - ((b as IncomingTrack & { track_number?: number }).track_number ?? 0)
    )
    const { data: insertedTracks, error: tracksError } = await supabase
      .from('tracks')
      .insert(
        tracks.map((track, index) => {
          const previous = previousTracks[index]
          return ({
          release_id: id,
          track_number: index + 1,
          song_title: track.song_title!.trim(),
          version: track.version === undefined ? previous?.version ?? null : track.version?.trim() || null,
          genre: track.genre?.trim() || null,
          audio_url: track.audio_url,
          duration: track.duration === undefined ? previous?.duration ?? null : Number.isFinite(track.duration) ? Math.max(0, Math.round(track.duration!)) : null,
          explicit: track.explicit ?? false,
          instrumental: track.instrumental === undefined ? previous?.instrumental ?? false : track.instrumental,
          isrc: track.isrc === undefined ? previous?.isrc ?? null : track.isrc?.trim() || null,
          language: track.language === undefined ? previous?.language ?? null : track.language?.trim() || null,
          featuring_artists: track.featuring_artists === undefined ? previous?.featuring_artists ?? null : track.featuring_artists?.trim() || null,
          songwriter: track.songwriter?.trim() || null,
          composer: track.composer === undefined ? previous?.composer ?? null : track.composer?.trim() || null,
          producer: track.producer === undefined ? previous?.producer ?? null : track.producer?.trim() || null,
          lyrics: track.lyrics?.trim() || null,
          })
        })
      )
      .select('*')

    if (tracksError) {
      return NextResponse.json({ error: tracksError.message }, { status: 500 })
    }

    await logActivity(supabase, {
      artistId: auth.artist.id,
      artistName: release.artist_name,
      action: 'release_edited',
      detail: `${release.title} (${release.release_type}) — now ${release.status}`,
    })

    return NextResponse.json({ release: { ...release, tracks: insertedTracks } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected server error.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const artistId = searchParams.get('artist_id')

  if (!artistId) {
    return NextResponse.json({ error: 'artist_id query parameter is required.' }, { status: 400 })
  }

  const auth = await requireArtist(request, artistId)
  if ('response' in auth) return auth.response

  try {
    const supabase = getSupabaseAdminClient()

    const { data: release, error: fetchError } = await supabase
      .from('releases')
      .select('*, tracks(*)')
      .eq('id', id)
      .single()

    if (fetchError || !release) {
      return NextResponse.json({ error: 'Release not found.' }, { status: 404 })
    }

    if (release.artist_id !== auth.artist.id) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 })
    }

    // Artists can only remove their own work before it's been reviewed —
    // anything already in the pipeline needs the admin's scheduled-deletion
    // flow instead, which gives a grace period.
    if (!['Draft', 'Pending Review'].includes(release.status)) {
      return NextResponse.json(
        { error: 'Only a draft or pending release can be deleted directly.' },
        { status: 400 }
      )
    }

    const { error: deleteError } = await supabase.from('releases').delete().eq('id', id)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
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
        console.error('Storage cleanup failed for release', id, storageError.message)
      }
    }

    await logActivity(supabase, {
      artistId: auth.artist.id,
      artistName: release.artist_name,
      action: 'release_deleted',
      detail: `${release.title} (${release.release_type})`,
    })

    return NextResponse.json({ release })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected server error.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
