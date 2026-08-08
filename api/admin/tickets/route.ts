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

    const { data, error } = await supabase
      .from('tickets')
      .select('*, messages:ticket_messages(*)')
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const tickets = (data ?? []).map((t) => ({
      ...t,
      messages: [...(t.messages ?? [])].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ),
    }))

    return NextResponse.json({ tickets })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error.' }, { status: 500 })
  }
}
