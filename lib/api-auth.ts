import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/server'

/**
 * Resolves the signed-in Supabase user to the one artist profile they own.
 * Never trust an artist_id supplied by the browser: API routes use this
 * helper before reading or changing artist-owned data.
 */
export async function requireArtist(request: Request, claimedArtistId?: string) {
  const authorization = request.headers.get('authorization')
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]

  if (!token) {
    return { response: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) }
  }

  const supabase = getSupabaseAdminClient()
  const { data: authData, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authData.user) {
    return { response: NextResponse.json({ error: 'Invalid or expired session.' }, { status: 401 }) }
  }

  const { data: artist, error: artistError } = await supabase
    .from('artists')
    .select('*')
    .eq('user_id', authData.user.id)
    .maybeSingle()

  if (artistError || !artist) {
    return { response: NextResponse.json({ error: 'Artist profile not found.' }, { status: 403 }) }
  }

  if (claimedArtistId && artist.id !== claimedArtistId) {
    return { response: NextResponse.json({ error: 'Unauthorized.' }, { status: 403 }) }
  }

  return { artist, user: authData.user }
}

export async function requireUser(request: Request, claimedUserId?: string) {
  const authorization = request.headers.get('authorization')
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token) return { response: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) }

  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) return { response: NextResponse.json({ error: 'Invalid or expired session.' }, { status: 401 }) }
  if (claimedUserId && data.user.id !== claimedUserId) {
    return { response: NextResponse.json({ error: 'Unauthorized.' }, { status: 403 }) }
  }
  return { user: data.user }
}
