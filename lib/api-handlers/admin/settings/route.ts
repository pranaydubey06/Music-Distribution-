import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/server'
import { isAdminAuthorized } from '@/lib/admin-auth'
import { getAppSettings } from '@/lib/app-settings'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  try {
    const supabase = getSupabaseAdminClient()
    const settings = await getAppSettings(supabase)
    return NextResponse.json({ settings })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected server error.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

interface PatchBody {
  maintenance_mode?: boolean
  max_upload_mb?: number
  allowed_image_formats?: string[]
  allowed_audio_formats?: string[]
}

export async function PATCH(request: Request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  let body: PatchBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  if (
    body.max_upload_mb !== undefined &&
    (typeof body.max_upload_mb !== 'number' || body.max_upload_mb < 1 || body.max_upload_mb > 500)
  ) {
    return NextResponse.json(
      { error: 'max_upload_mb must be a number between 1 and 500.' },
      { status: 400 }
    )
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.maintenance_mode !== undefined) update.maintenance_mode = body.maintenance_mode
  if (body.max_upload_mb !== undefined) update.max_upload_mb = body.max_upload_mb
  if (body.allowed_image_formats !== undefined)
    update.allowed_image_formats = body.allowed_image_formats
  // Audio delivery is intentionally WAV-only. Ignore legacy clients that
  // still submit an editable audio-format list.
  update.allowed_audio_formats = ['wav']

  try {
    const supabase = getSupabaseAdminClient()

    const { data, error } = await supabase
      .from('app_settings')
      .upsert({ id: 'global', ...update })
      .select('maintenance_mode, max_upload_mb, allowed_image_formats, allowed_audio_formats')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ settings: data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected server error.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
