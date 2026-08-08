import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/server'
import { isAdminAuthorized } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const { id: ticketId } = await params

  let body: { message?: string; attachment_url?: string | null; attachment_name?: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  if (!body.message?.trim()) {
    return NextResponse.json({ error: 'message is required.' }, { status: 400 })
  }

  try {
    const supabase = getSupabaseAdminClient()

    const { data: message, error } = await supabase
      .from('ticket_messages')
      .insert({
        ticket_id: ticketId,
        sender: 'admin',
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
