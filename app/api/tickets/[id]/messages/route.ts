import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/server'
import { requireArtist } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: ticketId } = await params

  let body: { artist_id?: string; message?: string; attachment_url?: string | null; attachment_name?: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  if (!body.artist_id || !body.message?.trim()) {
    return NextResponse.json({ error: 'artist_id and message are required.' }, { status: 400 })
  }

  const auth = await requireArtist(request, body.artist_id)
  if ('response' in auth) return auth.response

  try {
    const supabase = getSupabaseAdminClient()

    const { data: ticket, error: fetchError } = await supabase
      .from('tickets')
      .select('id, artist_id, status')
      .eq('id', ticketId)
      .single()

    if (fetchError || !ticket) return NextResponse.json({ error: 'Ticket not found.' }, { status: 404 })
    if (ticket.artist_id !== auth.artist.id) return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 })
    if (ticket.status === 'Closed') {
      return NextResponse.json({ error: 'This ticket is closed. It must be reopened before you can reply.' }, { status: 400 })
    }

    const { data: message, error } = await supabase
      .from('ticket_messages')
      .insert({
        ticket_id: ticketId,
        sender: 'artist',
        message: body.message.trim(),
        attachment_url: body.attachment_url ?? null,
        attachment_name: body.attachment_name ?? null,
      })
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ message }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error.' }, { status: 500 })
  }
}
