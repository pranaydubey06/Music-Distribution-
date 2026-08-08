import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/log-activity'
import { requireUser } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

interface CreateArtistBody {
  name?: string
  photo_url?: string | null
  /** Supabase Auth user id — links this profile to the auth account. */
  user_id?: string
  email?: string | null
}

export async function POST(request: Request) {
  let body: CreateArtistBody

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const name = body.name?.trim()

  if (!name) {
    return NextResponse.json({ error: 'Artist name is required.' }, { status: 400 })
  }

  if (!body.user_id) {
    return NextResponse.json({ error: 'user_id is required.' }, { status: 400 })
  }

  const auth = await requireUser(request, body.user_id)
  if ('response' in auth) return auth.response

  try {
    const supabase = getSupabaseAdminClient()

    // Idempotent: if this auth user already has a profile (e.g. a retried
    // registration), return the existing one instead of failing on the
    // unique constraint.
    const { data: existing } = await supabase
      .from('artists')
      .select('*')
      .eq('user_id', auth.user.id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ artist: existing })
    }

    const { data, error } = await supabase
      .from('artists')
      .insert({
        name,
        photo_url: body.photo_url ?? null,
        user_id: auth.user.id,
        email: auth.user.email ?? (body.email?.trim() || null),
      })
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await logActivity(supabase, {
      artistId: data.id,
      artistName: data.name,
      action: 'artist_registered',
      detail: `UID ${data.display_id}`,
    })

    return NextResponse.json({ artist: data }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected server error.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('user_id')

  if (!userId) {
    return NextResponse.json({ error: 'user_id query parameter is required.' }, { status: 400 })
  }

  const auth = await requireUser(request, userId)
  if ('response' in auth) return auth.response

  try {
    const supabase = getSupabaseAdminClient()

    const { data, error } = await supabase
      .from('artists')
      .select('*')
      .eq('user_id', auth.user.id)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'No artist profile for this user.' }, { status: 404 })
    }

    return NextResponse.json({ artist: data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected server error.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
