import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/server'
import { isAdminAuthorized } from '@/lib/admin-auth'
import { logActivity } from '@/lib/log-activity'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const { id } = await params

  try {
    const supabase = getSupabaseAdminClient()

    const { data, error } = await supabase
      .from('releases')
      .update({ scheduled_deletion_at: null, deletion_reason: null })
      .eq('id', id)
      .select('*, tracks(*)')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await logActivity(supabase, {
      artistId: data.artist_id,
      artistName: data.artist_name,
      action: 'release_deletion_cancelled',
      detail: data.title,
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
