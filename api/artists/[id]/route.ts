import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/log-activity'
import { requireArtist } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const auth = await requireArtist(request, id)
  if ('response' in auth) return auth.response

  try {
    const supabase = getSupabaseAdminClient()

    const { data, error } = await supabase.from('artists').select('*').eq('id', id).single()

    if (error || !data) {
      return NextResponse.json({ error: 'Artist not found.' }, { status: 404 })
    }

    return NextResponse.json({ artist: data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected server error.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

interface UpdateArtistBody {
  name?: string
  photo_url?: string | null
  instagram_url?: string | null
  youtube_url?: string | null
  spotify_url?: string | null
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const auth = await requireArtist(request, id)
  if ('response' in auth) return auth.response

  let body: UpdateArtistBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Name is required.' }, { status: 400 })
  }

  try {
    const supabase = getSupabaseAdminClient()

    const { data, error } = await supabase
      .from('artists')
      .update({
        name: body.name.trim(),
        photo_url: body.photo_url ?? null,
        instagram_url: body.instagram_url?.trim() || null,
        youtube_url: body.youtube_url?.trim() || null,
        spotify_url: body.spotify_url?.trim() || null,
      })
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await logActivity(supabase, {
      artistId: id,
      artistName: data.name,
      action: 'profile_updated',
    })

    return NextResponse.json({ artist: data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected server error.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
