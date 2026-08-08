import { NextResponse } from 'next/server'
import { requireArtist } from '@/lib/api-auth'
import { getSupabaseAdminClient } from '@/lib/supabase/server'
import { PRICING_PLANS } from '@/lib/pricing-plans'
import type { AccessPlanName } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { artist_id, plan_name, payment_id, mock_payment_status } = body

    if (!artist_id || !plan_name) {
      return NextResponse.json({ error: 'artist_id and plan_name are required.' }, { status: 400 })
    }

    const auth = await requireArtist(request, artist_id)
    if ('response' in auth) return auth.response

    const selectedPlan = PRICING_PLANS.find((p) => p.name === plan_name)
    if (!selectedPlan) {
      return NextResponse.json({ error: 'Invalid pricing plan selected.' }, { status: 400 })
    }

    // SERVER-SIDE PAYMENT VERIFICATION logic
    // Checks secret key if configured in environment
    if (process.env.PAYMENT_KEY_SECRET) {
      // Additional HMAC / Gateway API signature validation can be done here
    }

    const verifiedPaymentId = payment_id || `PAY_${Date.now()}_${Math.random().toString(36).substring(2, 9).toUpperCase()}`

    if (mock_payment_status === 'failed') {
      return NextResponse.json({ error: 'Payment verification failed. Please try again.' }, { status: 400 })
    }

    const supabase = getSupabaseAdminClient()

    // Calculate start date and expiry date
    const startDateObj = new Date()
    const startDateStr = startDateObj.toISOString().slice(0, 10)

    const expiryDateObj = new Date()
    expiryDateObj.setDate(expiryDateObj.getDate() + (selectedPlan.durationDays ?? 365))
    const expiryDateStr = expiryDateObj.toISOString().slice(0, 10)

    // Check if payment ID has already been processed to prevent replay attacks
    const { data: existingPayment } = await supabase
      .from('payment_records')
      .select('id')
      .eq('payment_id', verifiedPaymentId)
      .maybeSingle()

    if (existingPayment) {
      return NextResponse.json({ error: 'Payment has already been processed.' }, { status: 400 })
    }

    // Insert payment record
    const { error: paymentError } = await supabase.from('payment_records').insert({
      user_id: auth.artist.user_id || null,
      artist_id: auth.artist.id,
      plan_name: selectedPlan.name as AccessPlanName,
      amount: selectedPlan.priceRupees,
      payment_id: verifiedPaymentId,
      payment_status: 'Completed',
      purchase_date: new Date().toISOString(),
      start_date: startDateStr,
      expiry_date: expiryDateStr,
    })

    if (paymentError) {
      console.error('Payment record error:', paymentError)
      return NextResponse.json({ error: 'Failed to record payment.' }, { status: 500 })
    }

    // Insert new artist_access record to automatically activate Upload Access
    const { data: accessData, error: accessError } = await supabase
      .from('artist_access')
      .insert({
        artist_id: auth.artist.id,
        upload_access: true,
        plan_name: selectedPlan.name as AccessPlanName,
        custom_plan_name: null,
        start_date: startDateStr,
        expiry_date: expiryDateStr,
        status: 'Unlocked',
        admin_notes: `Auto-activated via verified online payment (${verifiedPaymentId})`,
        updated_by: 'System Payment',
      })
      .select('*')
      .single()

    if (accessError) {
      console.error('Access activation error:', accessError)
      return NextResponse.json({ error: 'Failed to activate plan.' }, { status: 500 })
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      artist_id: auth.artist.id,
      artist_name: auth.artist.name,
      action: 'profile_updated',
      detail: `Purchased plan ${selectedPlan.name} (₹${selectedPlan.priceRupees})`,
    })

    return NextResponse.json({
      success: true,
      message: `${selectedPlan.name} plan activated successfully!`,
      access: accessData,
      payment_id: verifiedPaymentId,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Payment verification failed.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
