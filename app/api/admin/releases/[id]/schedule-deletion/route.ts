import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/server'
import { isAdminAuthorized } from '@/lib/admin-auth'
import { logActivity } from '@/lib/log-activity'

export const dynamic = 'force-dynamic'

const VALID_HOURS = [24, 48]

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const { id } = await params

  let body: { reason?: string; hours?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  if (!body.reason?.trim()) {
    return NextResponse.json({ error: 'A reason is required.' }, { status: 400 })
  }

  if (!body.hours || !VALID_HOURS.includes(body.hours)) {
    return NextResponse.json(
      { error: `hours must be one of: ${VALID_HOURS.join(', ')}` },
      { status: 400 }
    )
  }

  try {
    const supabase = getSupabaseAdminClient()

    const deadline = new Date(Date.now() + body.hours * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('releases')
      .update({ scheduled_deletion_at: deadline, deletion_reason: body.reason.trim() })
      .eq('id', id)
      .select('*, tracks(*)')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await logActivity(supabase, {
      artistId: data.artist_id,
      artistName: data.artist_name,
      action: 'release_deletion_scheduled',
      detail: `${data.title} — ${body.hours}h window. Reason: ${body.reason}`,
    })

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
