import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/server'
import { isAdminAuthorized } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  try {
    const supabase = getSupabaseAdminClient()

    const [
      { count: totalArtists },
      { count: totalReleases },
      { count: pendingReleases },
      { count: liveReleases },
      { count: rejectedReleases },
      { count: openTickets },
      { data: recentReleases },
    ] = await Promise.all([
      supabase.from('artists').select('*', { count: 'exact', head: true }),
      supabase.from('releases').select('*', { count: 'exact', head: true }).neq('status', 'Draft'),
      supabase.from('releases').select('*', { count: 'exact', head: true }).eq('status', 'Pending Review'),
      supabase.from('releases').select('*', { count: 'exact', head: true }).eq('status', 'Live'),
      supabase.from('releases').select('*', { count: 'exact', head: true }).eq('status', 'Rejected'),
      supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', 'Open'),
      supabase
        .from('releases')
        .select('id, title, release_type, artist_name, status, cover_art_url, created_at')
        .neq('status', 'Draft')
        .order('created_at', { ascending: false })
        .limit(8),
    ])

    return NextResponse.json({
      stats: {
        totalArtists: totalArtists ?? 0,
        totalReleases: totalReleases ?? 0,
        pendingReleases: pendingReleases ?? 0,
        liveReleases: liveReleases ?? 0,
        rejectedReleases: rejectedReleases ?? 0,
        openTickets: openTickets ?? 0,
      },
      recentReleases: recentReleases ?? [],
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected server error.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
