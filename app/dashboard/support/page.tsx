'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Paperclip, Plus, Send } from 'lucide-react'
import { useArtistSession } from '@/components/dashboard/SessionProvider'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { getFileExtension, formatDateTime } from '@/lib/utils'
import type { TicketWithMessages, TicketMessage } from '@/lib/types'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Field'

type View = 'list' | 'thread' | 'new'

export default function SupportPage() {
  const { artist } = useArtistSession()
  const [view, setView] = useState<View>('list')
  const [tickets, setTickets] = useState<TicketWithMessages[]>([])
  const [selectedTicket, setSelectedTicket] = useState<TicketWithMessages | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    const loadTickets = () => fetch(`/api/tickets?artist_id=${artist.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (!isMounted) return
        const nextTickets = d.tickets ?? []
        setTickets(nextTickets)
        // Keep an opened conversation fresh when an admin replies.
        setSelectedTicket((current) => current ? nextTickets.find((ticket: TicketWithMessages) => ticket.id === current.id) ?? current : null)
        setError(null)
      })
      .catch(() => { if (isMounted) setError('Could not load tickets.') })
      .finally(() => { if (isMounted) setIsLoading(false) })
    void loadTickets()
    const refreshInterval = window.setInterval(() => void loadTickets(), 5000)
    const onFocus = () => void loadTickets()
    window.addEventListener('focus', onFocus)
    return () => { isMounted = false; window.clearInterval(refreshInterval); window.removeEventListener('focus', onFocus) }
  }, [artist.id])

  function handleNewTicket(ticket: TicketWithMessages) {
    setTickets((prev) => [ticket, ...prev])
    setSelectedTicket(ticket)
    setView('thread')
  }

  function handleNewMessage(ticketId: string, message: TicketMessage) {
    setTickets((prev) => prev.map((t) => t.id === ticketId ? { ...t, messages: [...(t.messages ?? []), message] } : t))
    if (selectedTicket?.id === ticketId) {
      setSelectedTicket((prev) => prev ? { ...prev, messages: [...(prev.messages ?? []), message] } : prev)
    }
  }

  return (
    <div className="mx-auto max-w-3xl animate-fade-up">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <p className="inline-block -rotate-2 bg-cobalt px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-white">Get help</p>
          <h1 className="mt-3 font-display text-3xl uppercase text-ink">Support</h1>
        </div>
        {view !== 'new' ? (
          <Button type="button" onClick={() => { setView('new'); setSelectedTicket(null) }}>
            <Plus className="h-3.5 w-3.5" /> New ticket
          </Button>
        ) : null}
      </header>

      {error ? <p className="mb-6 rounded-lg border-[2.5px] border-ink bg-punch px-4 py-3 text-sm font-bold text-white shadow-[3px_3px_0_0_var(--color-ink)]">{error}</p> : null}

      {view === 'new' ? (
        <NewTicketForm artist={artist} onSuccess={handleNewTicket} onCancel={() => setView('list')} />
      ) : view === 'thread' && selectedTicket ? (
        <ThreadView ticket={selectedTicket} artistId={artist.id} onNewMessage={(msg) => handleNewMessage(selectedTicket.id, msg)} onBack={() => setView('list')} />
      ) : isLoading ? (
        <p className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-ink-faint">Loading…</p>
      ) : tickets.length === 0 ? (
        <Card className="px-6 py-12 text-center">
          <p className="font-display text-lg uppercase text-ink">No tickets yet</p>
          <p className="mt-2 text-sm font-medium text-ink-soft">Open a new ticket to get help from the Spilrix team.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {tickets.map((ticket) => (
            <button key={ticket.id} type="button" onClick={() => { setSelectedTicket(ticket); setView('thread') }}
              className="brutal-press flex w-full items-center justify-between gap-3 rounded-xl border-[3px] border-ink bg-white p-4 text-left shadow-[4px_4px_0_0_var(--color-ink)]">
              <div className="min-w-0">
                <p className="truncate font-bold text-ink">{ticket.subject}</p>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-ink-faint">
                  {ticket.messages.length} {ticket.messages.length === 1 ? 'message' : 'messages'} · {formatDateTime(ticket.created_at)}
                </p>
              </div>
              <span className={`stamp-rotate shrink-0 rounded-md border-2 border-ink px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.08em] ${ticket.status === 'Open' ? 'bg-cobalt text-white' : 'bg-lime text-ink'}`}>
                {ticket.status}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ThreadView({ ticket, artistId, onNewMessage, onBack }: { ticket: TicketWithMessages; artistId: string; onNewMessage: (msg: TicketMessage) => void; onBack: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [reply, setReply] = useState('')
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isClosed = ticket.status === 'Closed'

  async function handleReply() {
    if (!reply.trim() && !attachmentFile) return
    setIsSending(true); setError(null)
    try {
      let attachmentUrl: string | null = null, attachmentName: string | null = null
      if (attachmentFile) {
        const supabase = getSupabaseBrowserClient()
        const ext = getFileExtension(attachmentFile.name) || 'bin'
        const path = `${artistId}/${ticket.id}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage.from('attachments').upload(path, attachmentFile, { cacheControl: '3600', upsert: false })
        if (uploadError) throw new Error(uploadError.message)
        attachmentUrl = supabase.storage.from('attachments').getPublicUrl(path).data.publicUrl
        attachmentName = attachmentFile.name
      }
      const response = await fetch(`/api/tickets/${ticket.id}/messages`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artist_id: artistId, message: reply.trim() || '(attachment)', attachment_url: attachmentUrl, attachment_name: attachmentName }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Could not send.')
      onNewMessage(result.message)
      setReply(''); setAttachmentFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not send.') }
    finally { setIsSending(false) }
  }

  return (
    <div className="flex flex-col gap-4">
      <button type="button" onClick={onBack} className="self-start font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink-soft hover:text-ink">← Back to tickets</button>
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b-[3px] border-ink bg-canary px-5 py-4">
          <p className="font-display text-lg uppercase text-ink">{ticket.subject}</p>
          <span className={`stamp-rotate rounded-md border-2 border-ink px-2 py-1 font-mono text-[9px] font-bold uppercase ${ticket.status === 'Open' ? 'bg-cobalt text-white' : 'bg-lime text-ink'}`}>{ticket.status}</span>
        </div>
        <div className="flex flex-col gap-3 p-5">
          {ticket.messages.map((msg) => {
            const isAdmin = msg.sender === 'admin'
            return (
              <div key={msg.id} className={`flex flex-col gap-1 ${isAdmin ? 'items-start' : 'items-end'}`}>
                <div className={`max-w-[85%] rounded-lg border-[2.5px] border-ink px-4 py-2.5 shadow-[2px_2px_0_0_var(--color-ink)] ${isAdmin ? 'bg-cobalt text-white' : 'bg-white text-ink'}`}>
                  <p className="text-sm font-medium leading-relaxed">{msg.message}</p>
                  {msg.attachment_url ? (
                    <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className={`mt-2 flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] underline ${isAdmin ? 'text-white/80' : 'text-ink-soft'}`}>
                      <Paperclip className="h-3 w-3" />{msg.attachment_name ?? 'Attachment'}
                    </a>
                  ) : null}
                </div>
                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.08em] text-ink-faint">{isAdmin ? 'Spilrix team' : 'You'} · {formatDateTime(msg.created_at)}</p>
              </div>
            )
          })}
        </div>
        {!isClosed ? (
          <div className="border-t-[2.5px] border-ink p-5">
            <textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a reply…" rows={3}
              className="w-full rounded-lg border-[2.5px] border-ink bg-paper px-3 py-2 text-sm font-medium text-ink placeholder:text-ink-faint focus:outline-none" />
            {error ? <p className="mt-2 rounded-md border-2 border-ink bg-punch px-3 py-2 text-sm font-bold text-white">{error}</p> : null}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button type="button" isLoading={isSending} disabled={isSending || (!reply.trim() && !attachmentFile)} onClick={handleReply}>
                <Send className="h-3.5 w-3.5" /> Send reply
              </Button>
              <label htmlFor="artist-attach" className="brutal-press flex cursor-pointer items-center gap-1.5 rounded-md border-[2.5px] border-ink bg-white px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-ink shadow-[2px_2px_0_0_var(--color-ink)] hover:bg-paper">
                <Paperclip className="h-3.5 w-3.5" />{attachmentFile ? attachmentFile.name : 'Attach'}
              </label>
              <input ref={fileInputRef} id="artist-attach" type="file" className="sr-only" onChange={(e) => setAttachmentFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>
        ) : (
          <div className="border-t-[2.5px] border-ink px-5 py-4">
            <p className="text-sm font-medium text-ink-soft">This ticket is closed.</p>
          </div>
        )}
      </Card>
    </div>
  )
}

function NewTicketForm({ artist, onSuccess, onCancel }: { artist: { id: string; name: string }; onSuccess: (t: TicketWithMessages) => void; onCancel: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [subject, setSubject] = useState(''), [message, setMessage] = useState(''), [attachmentFile, setAttachmentFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false), [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(null); setIsSubmitting(true)
    try {
      let attachmentUrl: string | null = null, attachmentName: string | null = null
      if (attachmentFile) {
        const supabase = getSupabaseBrowserClient()
        const ext = getFileExtension(attachmentFile.name) || 'bin'
        const path = `${artist.id}/new-${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage.from('attachments').upload(path, attachmentFile, { cacheControl: '3600', upsert: false })
        if (uploadError) throw new Error(uploadError.message)
        attachmentUrl = supabase.storage.from('attachments').getPublicUrl(path).data.publicUrl
        attachmentName = attachmentFile.name
      }
      const response = await fetch('/api/tickets', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artist_id: artist.id, artist_name: artist.name, subject, message, attachment_url: attachmentUrl, attachment_name: attachmentName }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Could not submit.')
      onSuccess(result.ticket as TicketWithMessages)
    } catch (err) { setError(err instanceof Error ? err.message : 'Something went wrong.') }
    finally { setIsSubmitting(false) }
  }

  return (
    <Card className="p-6 md:p-8">
      <h2 className="mb-5 font-display text-xl uppercase text-ink">New support ticket</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Input label="Subject" required value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Release date change request" />
        <Textarea label="Message" required value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Describe your question or issue…" />
        <div>
          <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink-faint">Attachment (optional)</p>
          <label htmlFor="new-ticket-attach" className="flex cursor-pointer items-center gap-2 rounded-lg border-[2.5px] border-dashed border-ink bg-paper px-4 py-3 transition-colors hover:bg-canary/20">
            <Paperclip className="h-4 w-4 text-ink-soft" />
            <span className="text-sm font-medium text-ink">{attachmentFile ? attachmentFile.name : 'Choose a file'}</span>
          </label>
          <input ref={fileInputRef} id="new-ticket-attach" type="file" className="sr-only" onChange={(e) => setAttachmentFile(e.target.files?.[0] ?? null)} />
        </div>
        {error ? <p className="rounded-lg border-[2.5px] border-ink bg-punch px-4 py-3 text-sm font-bold text-white shadow-[3px_3px_0_0_var(--color-ink)]">{error}</p> : null}
        <div className="flex gap-3">
          <Button type="submit" isLoading={isSubmitting} disabled={isSubmitting}>Send to support</Button>
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
        </div>
      </form>
    </Card>
  )
}
