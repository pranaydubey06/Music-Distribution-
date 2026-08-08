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
    const { data: payments, error } = await supabase
      .from('payment_records')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)

    return NextResponse.json({ payments: payments ?? [] })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not fetch payments.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
