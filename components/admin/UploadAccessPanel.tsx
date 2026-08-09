'use client'

import { useCallback, useEffect, useState } from 'react'
import { CalendarDays, ChevronDown, Lock, Unlock, UserCheck } from 'lucide-react'
import type { AccessPlanName, ArtistAccess } from '@/lib/types'
import { formatDate, formatDateTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Switch from '@/components/ui/Switch'
import Badge from '@/components/ui/Badge'
import Alert from '@/components/ui/Alert'
import { Input, Select, Textarea } from '@/components/ui/Field'

const PLANS: AccessPlanName[] = [
  'Single Release',
  '1 Month Unlimited',
  '6 Months Unlimited',
  '1 Year Unlimited',
  'Custom',
]

function today() {
  return new Date().toISOString().slice(0, 10)
}

interface UploadAccessPanelProps {
  artistId: string
  passcode: string
}

export default function UploadAccessPanel({ artistId, passcode }: UploadAccessPanelProps) {
  const [current, setCurrent] = useState<ArtistAccess | null>(null)
  const [history, setHistory] = useState<ArtistAccess[]>([])
  const [enabled, setEnabled] = useState(false)
  const [plan, setPlan] = useState<AccessPlanName>('Single Release')
  const [customPlan, setCustomPlan] = useState('')
  const [expiry, setExpiry] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function fetchAccess() {
      const res = await fetch(`/api/admin/artists/${artistId}/access`, {
        headers: { 'x-admin-passcode': passcode },
      })
      if (!res.ok || cancelled) return
      const data = await res.json()
      if (cancelled) return
      setCurrent(data.access ?? null)
      setHistory(data.history ?? [])
      if (data.access) {
        setEnabled(data.active)
        setPlan(data.access.plan_name ?? 'Single Release')
        setCustomPlan(data.access.custom_plan_name ?? '')
        setExpiry(data.access.expiry_date ?? '')
        setNotes(data.access.admin_notes ?? '')
      }
    }

    void fetchAccess()
    return () => { cancelled = true }
  }, [artistId, passcode])

  const reload = useCallback(async () => {
    const res = await fetch(`/api/admin/artists/${artistId}/access`, {
      headers: { 'x-admin-passcode': passcode },
    })
    if (!res.ok) return
    const data = await res.json()
    setCurrent(data.access ?? null)
    setHistory(data.history ?? [])
    if (data.access) {
      setEnabled(data.active)
      setPlan(data.access.plan_name ?? 'Single Release')
      setCustomPlan(data.access.custom_plan_name ?? '')
      setExpiry(data.access.expiry_date ?? '')
      setNotes(data.access.admin_notes ?? '')
    }
  }, [artistId, passcode])

  async function save(force?: boolean) {
    const unlock = force ?? enabled
    setBusy(true)
    setMessage(null)

    const res = await fetch(`/api/admin/artists/${artistId}/access`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-passcode': passcode,
      },
      body: JSON.stringify({
        upload_access: unlock,
        plan_name: plan,
        custom_plan_name: customPlan,
        start_date: today(),
        expiry_date: expiry,
        admin_notes: notes,
      }),
    })

    const data = await res.json()
    setBusy(false)

    if (!res.ok) {
      setMessage(data.error ?? 'Could not save access.')
      return
    }

    setMessage(unlock ? 'Upload access unlocked and saved.' : 'Upload access locked.')
    setEnabled(unlock)
    await reload()
  }

  function handleToggleDetails() {
    setShowDetails((prev) => !prev)
  }

  return (
    <div>
      {/* Section Header */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm border-2 border-ink bg-lime" aria-hidden="true" />
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-ink-faint">
            Upload access
          </p>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleToggleDetails}
          className="h-8 px-3 text-[10px] gap-1.5"
        >
          <ChevronDown
            className={cn('h-3.5 w-3.5 transition-transform duration-200', showDetails && 'rotate-180')}
            aria-hidden="true"
          />
          {showDetails ? 'Hide Upload Access' : 'Show Upload Access'}
        </Button>
      </div>

      {/* Collapsible Panel */}
      <div
        className="overflow-hidden transition-all duration-300 ease-out"
        style={{
          maxHeight: showDetails ? '2000px' : '0',
          opacity: showDetails ? 1 : 0,
          marginTop: showDetails ? '8px' : '0',
          marginBottom: showDetails ? '0' : '0',
        }}
      >
        <Card className="p-4 md:p-5">
          {/* Header */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b-[2.5px] border-dashed border-ink/30 pb-3">
            <div>
              <p className="font-display text-lg uppercase tracking-tight">Manual upload entitlement</p>
              <p className="text-xs font-medium text-ink-soft">
                Every save is retained in the access history.
              </p>
            </div>
            <Badge variant={current && enabled ? 'lime' : 'punch'}>
              {current && enabled ? 'Unlocked' : 'Locked'}
            </Badge>
          </div>

          {/* Form Fields - More Compact */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Upload Toggle */}
              <div className="flex items-center justify-between rounded-lg border-[2.5px] border-ink bg-paper p-2.5">
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.12em]">Upload Access</p>
                  <p className="mt-0.5 text-sm font-bold">{enabled ? 'Unlocked' : 'Locked'}</p>
                </div>
                <Switch
                  label="Toggle upload access"
                  variant="success"
                  checked={enabled}
                  onChange={setEnabled}
                />
              </div>

              <Select
                label="Plan Name"
                value={plan}
                onChange={(e) => setPlan(e.target.value as AccessPlanName)}
                className="w-full"
              >
                {PLANS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>

              {plan === 'Custom' ? (
                <Input
                  label="Custom Plan Name"
                  value={customPlan}
                  onChange={(e) => setCustomPlan(e.target.value)}
                />
              ) : null}

              <Input
                label="Access Expiry"
                type="date"
                min={today()}
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
              />

              <Textarea
                label="Admin Notes"
                placeholder={"Paid via UPI\nManual Activation\nSpecial Offer"}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-20"
              />
            </div>

            {/* Right Column - Access History */}
            <div className="rounded-lg border-[2.5px] border-ink bg-paper p-3">
              <div className="mb-3 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-ink-faint" aria-hidden="true" />
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.13em] text-ink-faint">
                  Access History
                </p>
              </div>

              {history.length ? (
                <div className="max-h-[380px] space-y-2.5 overflow-auto pr-1 scrollbar-thin">
                  {history.map((row) => (
                    <div key={row.id} className="border-2 border-ink bg-white p-2.5">
                      <div className="flex justify-between gap-2">
                        <p className="font-bold text-sm">
                          {row.plan_name === 'Custom'
                            ? row.custom_plan_name
                            : row.plan_name ?? 'No plan'}
                        </p>
                        <Badge variant={row.upload_access ? 'lime' : 'punch'} className="!text-[9px]">
                          {row.status}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-ink-soft">
                        {formatDate(row.start_date)} → {formatDate(row.expiry_date)}
                      </p>
                      <p className="mt-0.5 font-mono text-[9px] uppercase text-ink-faint">
                        {row.updated_by ?? 'Admin'} · {formatDateTime(row.updated_at)}
                      </p>
                      {row.admin_notes ? (
                        <p className="mt-1.5 text-xs font-medium">{row.admin_notes}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm font-medium text-ink-soft py-4 text-center">
                  No access updates yet. New artists are locked by default.
                </p>
              )}
            </div>
          </div>

          {/* Messages & Actions - More Compact */}
          {message ? (
            <div className="mt-3">
              <Alert variant={message.toLowerCase().includes('locked') ? 'warning' : 'success'} className="text-sm">
                {message}
              </Alert>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              isLoading={busy}
              onClick={() => void save()}
              className="flex-1 min-w-[140px]"
            >
              <UserCheck className="h-3.5 w-3.5" />
              Save Changes
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={busy}
              onClick={() => void save(false)}
              className="flex-1 min-w-[120px]"
            >
              <Lock className="h-3.5 w-3.5" />
              Lock Now
            </Button>
            <Button
              type="button"
               variant="secondary"
              disabled={busy}
              onClick={() => void save(true)}
              className="flex-1 min-w-[120px]"
            >
              <Unlock className="h-3.5 w-3.5" />
              Unlock Now
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}