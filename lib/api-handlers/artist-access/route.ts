import { NextResponse } from 'next/server'
import { requireArtist } from '@/lib/api-auth'
import { getSupabaseAdminClient } from '@/lib/supabase/server'
import { getArtistAccessState } from '@/lib/artist-access'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const artistId = new URL(request.url).searchParams.get('artist_id')
  if (!artistId) return NextResponse.json({ error: 'artist_id is required.' }, { status: 400 })
  const auth = await requireArtist(request, artistId)
  if ('response' in auth) return auth.response
  try {
    const access = await getArtistAccessState(getSupabaseAdminClient(), auth.artist.id)
    return NextResponse.json(access)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not load upload access.' }, { status: 500 })
  }
}
