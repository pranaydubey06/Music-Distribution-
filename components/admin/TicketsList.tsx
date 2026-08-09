'use client'

import { useRef, useState } from 'react'
import { Check, ChevronDown, Paperclip, RotateCcw, Send, Ticket } from 'lucide-react'
import type { TicketWithMessages, TicketStatus, TicketMessage } from '@/lib/types'
import { formatDateTime, getFileExtension } from '@/lib/utils'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Alert from '@/components/ui/Alert'
import EmptyState from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'

interface TicketsListProps {
  tickets: TicketWithMessages[]
  passcode: string
  onStatusChange: (ticketId: string, status: TicketStatus) => void
  onNewMessage: (ticketId: string, message: TicketMessage) => void
}

export default function TicketsList({
  tickets,
  passcode,
  onStatusChange,
  onNewMessage,
}: TicketsListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (tickets.length === 0) {
    return (
      <EmptyState
        icon={Ticket}
        title="No support tickets"
        message="Tickets raised by artists will show up here. When a conversation starts, you can reply and resolve it from this view."
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {tickets.map((ticket) => (
        <TicketCard
          key={ticket.id}
          ticket={ticket}
          passcode={passcode}
          isExpanded={expandedId === ticket.id}
          onToggle={() => setExpandedId((prev) => (prev === ticket.id ? null : ticket.id))}
          onStatusChange={onStatusChange}
          onNewMessage={onNewMessage}
        />
      ))}
    </div>
  )
}

function TicketCard({
  ticket,
  passcode,
  isExpanded,
  onToggle,
  onStatusChange,
  onNewMessage,
}: {
  ticket: TicketWithMessages
  passcode: string
  isExpanded: boolean
  onToggle: () => void
  onStatusChange: (ticketId: string, status: TicketStatus) => void
  onNewMessage: (ticketId: string, message: TicketMessage) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [reply, setReply] = useState('')
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [isTogglingStatus, setIsTogglingStatus] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isOpen = ticket.status === 'Open'

  async function handleReply() {
    if (!reply.trim() && !attachmentFile) return
    setIsSending(true)
    setError(null)

    try {
      let attachmentUrl: string | null = null
      let attachmentName: string | null = null

      if (attachmentFile) {
        const supabase = getSupabaseBrowserClient()
        const ext = getFileExtension(attachmentFile.name) || 'bin'
        const path = `admin/${ticket.id}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(path, attachmentFile, { cacheControl: '3600', upsert: false })
        if (uploadError) throw new Error(uploadError.message)
        attachmentUrl = supabase.storage.from('attachments').getPublicUrl(path).data.publicUrl
        attachmentName = attachmentFile.name
      }

      const response = await fetch(`/api/admin/tickets/${ticket.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-passcode': passcode,
        },
        body: JSON.stringify({
          message: reply.trim() || '(attachment)',
          attachment_url: attachmentUrl,
          attachment_name: attachmentName,
        }),
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Could not send reply.')

      onNewMessage(ticket.id, result.message)
      setReply('')
      setAttachmentFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send reply.')
    } finally {
      setIsSending(false)
    }
  }

  async function handleToggleStatus() {
    setIsTogglingStatus(true)
    const newStatus: TicketStatus = isOpen ? 'Closed' : 'Open'
    try {
      const response = await fetch(`/api/admin/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-passcode': passcode },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!response.ok) throw new Error('Status update failed')
      onStatusChange(ticket.id, newStatus)
    } catch {
      setError('Could not update ticket status.')
    } finally {
      setIsTogglingStatus(false)
    }
  }

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-paper"
      >
        <div className="min-w-0">
          <p className="truncate font-display text-sm uppercase tracking-tight text-ink">{ticket.subject}</p>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-ink-faint">
            {ticket.messages.length} {ticket.messages.length === 1 ? 'message' : 'messages'} ·{' '}
            {formatDateTime(ticket.created_at)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant={isOpen ? 'cobalt' : 'lime'} stamp>
            {ticket.status}
          </Badge>
          <ChevronDown
            className={cn('h-4 w-4 shrink-0 text-ink-faint transition-transform', isExpanded && 'rotate-180')}
            aria-hidden="true"
          />
        </div>
      </button>

      {isExpanded ? (
        <div className="border-t-[2.5px] border-ink">
          <div className="flex flex-col gap-3 p-4">
            {ticket.messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
          </div>

          {error ? (
            <div className="px-4 pb-3">
              <Alert variant="error">{error}</Alert>
            </div>
          ) : null}

          {isOpen ? (
            <div className="border-t-[2.5px] border-ink p-4">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Write a reply…"
                rows={3}
                className="w-full rounded-lg border-[2.5px] border-ink bg-paper px-3 py-2 text-sm font-medium text-ink placeholder:text-ink-faint transition-shadow focus:shadow-[3px_3px_0_0_var(--color-cobalt)] focus:outline-none"
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  isLoading={isSending}
                  disabled={isSending || (!reply.trim() && !attachmentFile)}
                  onClick={handleReply}
                >
                  <Send className="h-3.5 w-3.5" />
                  Send reply
                </Button>
                <label
                  htmlFor={`attach-admin-${ticket.id}`}
                  className="brutal-press flex cursor-pointer items-center gap-1.5 rounded-md border-[2.5px] border-ink bg-white px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-ink shadow-[2px_2px_0_0_var(--color-ink)] transition-colors hover:bg-paper"
                >
                  <Paperclip className="h-3.5 w-3.5" />
                  {attachmentFile ? attachmentFile.name : 'Attach'}
                </label>
                <input
                  ref={fileInputRef}
                  id={`attach-admin-${ticket.id}`}
                  type="file"
                  className="sr-only"
                  onChange={(e) => setAttachmentFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
          ) : null}

          <div className="border-t-[2.5px] border-ink p-4">
            <Button
              type="button"
              variant={isOpen ? 'primary' : 'ghost'}
              isLoading={isTogglingStatus}
              disabled={isTogglingStatus}
              onClick={handleToggleStatus}
            >
              {isOpen ? (
                <><Check className="h-3.5 w-3.5" /> Resolve ticket</>
              ) : (
                <><RotateCcw className="h-3.5 w-3.5" /> Reopen ticket</>
              )}
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  )
}

function MessageBubble({ message }: { message: TicketMessage }) {
  const isAdmin = message.sender === 'admin'
  return (
    <div className={cn('flex flex-col gap-1', isAdmin ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-lg border-[2.5px] border-ink px-4 py-2.5 shadow-[2px_2px_0_0_var(--color-ink)]',
          isAdmin ? 'bg-cobalt text-white' : 'bg-white text-ink'
        )}
      >
        <p className="text-sm font-medium leading-relaxed">{message.message}</p>
        {message.attachment_url ? (
          <a
            href={message.attachment_url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'mt-2 flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] underline',
              isAdmin ? 'text-white/80' : 'text-ink-soft'
            )}
          >
            <Paperclip className="h-3 w-3" />
            {message.attachment_name ?? 'Attachment'}
          </a>
        ) : null}
      </div>
      <p className="font-mono text-[9px] font-bold uppercase tracking-[0.08em] text-ink-faint">
        {isAdmin ? 'Admin' : 'Artist'} · {formatDateTime(message.created_at)}
      </p>
    </div>
  )
}
