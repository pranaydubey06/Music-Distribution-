import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/server'
import { isAdminAuthorized } from '@/lib/admin-auth'
import { processScheduledDeletions } from '@/lib/process-scheduled-deletions'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  try {
    const supabase = getSupabaseAdminClient()

    await processScheduledDeletions(supabase)

    const { data, error } = await supabase
      .from('releases')
      .select('*, tracks(*)')
      .neq('status', 'Draft')
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
