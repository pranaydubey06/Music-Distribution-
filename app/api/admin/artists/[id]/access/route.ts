import { NextResponse } from 'next/server'
import { isAdminAuthorized } from '@/lib/admin-auth'
import { getSupabaseAdminClient } from '@/lib/supabase/server'
import { getArtistAccessState } from '@/lib/artist-access'
import type { AccessPlanName } from '@/lib/types'

export const dynamic = 'force-dynamic'

const PLANS: AccessPlanName[] = ['Single Release', '1 Month Unlimited', '6 Months Unlimited', '1 Year Unlimited', 'Custom']

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminAuthorized(request)) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  try {
    const { id } = await params
    const supabase = getSupabaseAdminClient()
    const current = await getArtistAccessState(supabase, id)
    const { data: history, error } = await supabase
      .from('artist_access').select('*').eq('artist_id', id).order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return NextResponse.json({ ...current, history: history ?? [] })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not load access.' }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminAuthorized(request)) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  try {
    const body = await request.json()
    const { id } = await params
    const unlocked = Boolean(body.upload_access)
    const planName = body.plan_name as AccessPlanName | undefined
    if (unlocked && (!planName || !PLANS.includes(planName))) {
      return NextResponse.json({ error: 'Choose a valid plan.' }, { status: 400 })
    }
    if (unlocked && !body.expiry_date) {
      return NextResponse.json({ error: 'An expiry date is required to unlock access.' }, { status: 400 })
    }
    if (planName === 'Custom' && !String(body.custom_plan_name ?? '').trim()) {
      return NextResponse.json({ error: 'Enter the custom plan name.' }, { status: 400 })
    }
    const supabase = getSupabaseAdminClient()
    const { data: artist } = await supabase.from('artists').select('id').eq('id', id).maybeSingle()
    if (!artist) return NextResponse.json({ error: 'Artist not found.' }, { status: 404 })
    const status = unlocked ? 'Unlocked' : 'Locked'
    const { data, error } = await supabase.from('artist_access').insert({
      artist_id: id,
      upload_access: unlocked,
      plan_name: planName ?? null,
      custom_plan_name: planName === 'Custom' ? String(body.custom_plan_name).trim() : null,
      start_date: unlocked ? (body.start_date || new Date().toISOString().slice(0, 10)) : null,
      expiry_date: unlocked ? body.expiry_date : null,
      status,
      admin_notes: String(body.admin_notes ?? '').trim() || null,
      updated_by: 'Admin',
    }).select('*').single()
    if (error) throw new Error(error.message)
    return NextResponse.json({ access: data })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not save access.' }, { status: 500 })
  }
}
