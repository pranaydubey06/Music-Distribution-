import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/server'
import { isAdminAuthorized } from '@/lib/admin-auth'
import { logActivity } from '@/lib/log-activity'
import type { TicketStatus } from '@/lib/types'

export const dynamic = 'force-dynamic'

const VALID_STATUSES: TicketStatus[] = ['Open', 'Closed']

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const { id } = await params

  let body: { status?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  if (!body.status || !VALID_STATUSES.includes(body.status as TicketStatus)) {
    return NextResponse.json(
      { error: `status must be one of: ${VALID_STATUSES.join(', ')}` },
      { status: 400 }
    )
  }

  try {
    const supabase = getSupabaseAdminClient()

    const { data, error } = await supabase
      .from('tickets')
      .update({ status: body.status })
      .eq('id', id)
      .select('*, messages:ticket_messages(*)')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await logActivity(supabase, {
      artistId: data.artist_id,
      artistName: data.artist_name,
      action: body.status === 'Closed' ? 'ticket_resolved' : 'ticket_reopened',
      detail: data.subject,
    })

    return NextResponse.json({
      ticket: {
        ...data,
        messages: [...(data.messages ?? [])].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        ),
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected server error.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
