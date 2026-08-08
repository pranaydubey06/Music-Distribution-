import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/server'
import { isAdminAuthorized } from '@/lib/admin-auth'
import { logActivity } from '@/lib/log-activity'
import type { ReleaseStatus, ActivityAction } from '@/lib/types'

export const dynamic = 'force-dynamic'

const VALID_STATUSES: ReleaseStatus[] = [
  'Pending Review',
  'Needs Changes',
  'Approved',
  'Sent to Platforms',
  'Live',
  'Rejected',
]

const STATUS_ACTION_MAP: Record<string, ActivityAction> = {
  Approved: 'release_approved',
  Rejected: 'release_rejected',
  'Needs Changes': 'release_needs_changes',
  'Sent to Platforms': 'release_sent',
  Live: 'release_live',
}

interface PatchBody {
  status?: string
  rejection_reason?: string | null
  admin_note?: string | null
  spotify_url?: string | null
  apple_music_url?: string | null
  youtube_url?: string | null
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const { id } = await params

  let body: PatchBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  if (!body.status || !VALID_STATUSES.includes(body.status as ReleaseStatus)) {
    return NextResponse.json(
      { error: `status must be one of: ${VALID_STATUSES.join(', ')}` },
      { status: 400 }
    )
  }

  if (body.status === 'Needs Changes' && !body.admin_note?.trim()) {
    return NextResponse.json(
      { error: 'A note for the artist is required when requesting changes.' },
      { status: 400 }
    )
  }

  const update: Record<string, unknown> = { status: body.status }
  update.rejection_reason = body.status === 'Rejected' ? body.rejection_reason ?? null : null
  update.admin_note =
    body.status === 'Needs Changes' ? body.admin_note?.trim() ?? null : null

  if (body.status === 'Live') {
    update.spotify_url = body.spotify_url ?? null
    update.apple_music_url = body.apple_music_url ?? null
    update.youtube_url = body.youtube_url ?? null
  }

  try {
    const supabase = getSupabaseAdminClient()

    const { data, error } = await supabase
      .from('releases')
      .update(update)
      .eq('id', id)
      .select('*, tracks(*)')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const action = STATUS_ACTION_MAP[body.status]
    if (action) {
      await logActivity(supabase, {
        artistId: data.artist_id,
        artistName: data.artist_name,
        action,
        detail:
          body.status === 'Rejected' && body.rejection_reason
            ? `${data.title} — Reason: ${body.rejection_reason}`
            : body.status === 'Needs Changes' && body.admin_note
              ? `${data.title} — Note: ${body.admin_note}`
              : data.title,
      })
    }

    return NextResponse.json({
      release: {
        ...data,
        tracks: [...(data.tracks ?? [])].sort((a, b) => a.track_number - b.track_number),
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected server error.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
