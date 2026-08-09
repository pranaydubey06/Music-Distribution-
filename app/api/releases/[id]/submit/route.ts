import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/log-activity'
import { requireArtist } from '@/lib/api-auth'
import { getArtistAccessState } from '@/lib/artist-access'

export const dynamic = 'force-dynamic'

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
    const entitlement = await getArtistAccessState(supabase, auth.artist.id)
    if (!entitlement.active) {
      return NextResponse.json({ error: entitlement.expired ? 'Subscription Expired. Please contact support to renew.' : 'Upload access is locked.' }, { status: 403 })
    }

    const { data: existing, error: fetchError } = await supabase
      .from('releases')
      .select('id, artist_id, status')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Release not found.' }, { status: 404 })
    }

    if (existing.artist_id !== auth.artist.id) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 })
    }

    if (existing.status !== 'Draft') {
      return NextResponse.json({ error: 'Only a draft can be submitted.' }, { status: 400 })
    }

    const { data: release, error: updateError } = await supabase
      .from('releases')
      .update({ status: 'Pending Review' })
      .eq('id', id)
      .select('*, tracks(*)')
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    await logActivity(supabase, {
      artistId: auth.artist.id,
      artistName: release.artist_name,
      action: 'release_submitted',
      detail: `${release.title} (${release.release_type})`,
    })

    return NextResponse.json({
      release: {
        ...release,
        tracks: [...(release.tracks ?? [])].sort((a, b) => a.track_number - b.track_number),
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected server error.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
