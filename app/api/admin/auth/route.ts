import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  let body: { passcode?: string }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const expected = process.env.ADMIN_PASSCODE

  if (!expected) {
    return NextResponse.json(
      { error: 'ADMIN_PASSCODE is not configured on the server.' },
      { status: 500 }
    )
  }

  if (body.passcode === expected) {
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Incorrect passcode.' }, { status: 401 })
}
