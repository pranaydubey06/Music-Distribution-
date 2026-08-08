'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  Camera,
  Check,
  Copy,
  Disc3,
  LogOut,
  PlaySquare,
  Pencil,
  User as UserIcon,
  X,
} from 'lucide-react'
import { useArtistSession } from '@/components/dashboard/SessionProvider'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { getFileExtension, formatDate, slugify } from '@/lib/utils'
import type { Artist } from '@/lib/types'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'

interface ProfilePanelProps {
  onClose: () => void
}

export default function ProfilePanel({ onClose }: ProfilePanelProps) {
  const { artist, signOut, updateArtist } = useArtistSession()

  const [profile, setProfile] = useState<Artist | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let isMounted = true

    fetch(`/api/artists/${artist.id}`)
      .then((res) => res.json())
      .then((result) => {
        if (isMounted) setProfile(result.artist ?? null)
      })
      .catch(() => {
        if (isMounted) setError('Could not load your profile.')
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [artist.id])

  function handleCopyUid() {
    if (!profile) return
    navigator.clipboard.writeText(String(profile.display_id)).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  function handleUpdated(updated: Artist) {
    setProfile(updated)
    setIsEditing(false)
    updateArtist({ name: updated.name, photo_url: updated.photo_url })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 px-4 py-8"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md">
        <Card className="animate-fade-up max-h-[85vh] overflow-y-auto p-6 md:p-8">
          <div className="mb-5 flex items-center justify-between">
            <p className="font-display text-xl uppercase text-ink">Profile</p>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="brutal-press flex h-9 w-9 items-center justify-center rounded-md border-2 border-ink bg-white text-ink transition-colors hover:bg-punch hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {isLoading ? (
            <p className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-ink-faint">
              Loading…
            </p>
          ) : error || !profile ? (
            <p className="rounded-md border-2 border-ink bg-punch px-4 py-3 text-sm font-bold text-white">
              {error ?? 'Profile not found.'}
            </p>
          ) : isEditing ? (
            <EditProfileForm
              profile={profile}
              onSaved={handleUpdated}
              onCancel={() => setIsEditing(false)}
            />
          ) : (
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-4">
                {profile.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.photo_url}
                    alt={profile.name}
                    className="h-16 w-16 rounded-full border-[2.5px] border-ink object-cover"
                  />
                ) : (
                  <span className="flex h-16 w-16 items-center justify-center rounded-full border-[2.5px] border-ink bg-canary">
                    <UserIcon className="h-6 w-6 text-ink" />
                  </span>
                )}
                <div>
                  <p className="font-display text-lg uppercase text-ink">{profile.name}</p>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">
                    Member since {formatDate(profile.created_at)}
                  </p>
                </div>
              </div>

              <div>
                <p className="mb-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">
                  Your UID
                </p>
                <button
                  type="button"
                  onClick={handleCopyUid}
                  className="brutal-press flex w-full items-center justify-between rounded-md border-[2.5px] border-ink bg-paper px-3 py-2.5 transition-shadow"
                >
                  <span className="font-mono text-lg font-bold text-ink">
                    {profile.display_id}
                  </span>
                  <span className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase text-ink-soft">
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" /> Copy
                      </>
                    )}
                  </span>
                </button>
              </div>

              {profile.instagram_url || profile.youtube_url || profile.spotify_url ? (
                <div className="flex flex-wrap gap-2">
                  {profile.instagram_url ? (
                    <SocialLink href={profile.instagram_url} icon={Camera} label="Instagram" />
                  ) : null}
                  {profile.youtube_url ? (
                    <SocialLink href={profile.youtube_url} icon={PlaySquare} label="YouTube" />
                  ) : null}
                  {profile.spotify_url ? (
                    <SocialLink href={profile.spotify_url} icon={Disc3} label="Spotify" />
                  ) : null}
                </div>
              ) : null}

              <div className="flex gap-3">
                <Button type="button" variant="ghost" onClick={() => setIsEditing(true)}>
                  <Pencil className="h-3.5 w-3.5" />
                  Edit profile
                </Button>
                <Button type="button" variant="danger" onClick={signOut}>
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

function SocialLink({
  href,
  icon: Icon,
  label,
}: {
  href: string
  icon: typeof Camera
  label: string
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="brutal-press flex items-center gap-1.5 rounded-md border-2 border-ink bg-white px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-ink shadow-[2px_2px_0_0_var(--color-ink)] transition-colors hover:bg-cobalt hover:text-white"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </a>
  )
}

function EditProfileForm({
  profile,
  onSaved,
  onCancel,
}: {
  profile: Artist
  onSaved: (updated: Artist) => void
  onCancel: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(profile.name)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(profile.photo_url)
  const [instagram, setInstagram] = useState(profile.instagram_url ?? '')
  const [youtube, setYoutube] = useState(profile.youtube_url ?? '')
  const [spotify, setSpotify] = useState(profile.spotify_url ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handlePhotoChange(file: File | null) {
    setPhotoFile(file)
    setPreview(file ? URL.createObjectURL(file) : profile.photo_url)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Name cannot be empty.')
      return
    }

    setIsSaving(true)

    try {
      let photoUrl = profile.photo_url

      if (photoFile) {
        const supabase = getSupabaseBrowserClient()
        const extension = getFileExtension(photoFile.name) || 'jpg'
        const path = `${slugify(trimmedName)}-${Date.now()}.${extension}`

        const { error: uploadError } = await supabase.storage
          .from('profiles')
          .upload(path, photoFile, { cacheControl: '3600', upsert: false })
        if (uploadError) throw new Error(uploadError.message)

        photoUrl = supabase.storage.from('profiles').getPublicUrl(path).data.publicUrl
      }

      const response = await fetch(`/api/artists/${profile.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          photo_url: photoUrl,
          instagram_url: instagram,
          youtube_url: youtube,
          spotify_url: spotify,
        }),
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Could not save changes.')

      onSaved(result.artist as Artist)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <label
          htmlFor="edit-photo"
          className="flex h-16 w-16 cursor-pointer items-center justify-center overflow-hidden rounded-full border-[2.5px] border-dashed border-ink bg-paper"
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Preview" className="h-full w-full object-cover" />
          ) : (
            <UserIcon className="h-6 w-6 text-ink-faint" />
          )}
        </label>
        <input
          ref={fileInputRef}
          id="edit-photo"
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => handlePhotoChange(e.target.files?.[0] ?? null)}
        />
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">
          Tap photo to change
        </p>
      </div>

      <Input label="Name" required value={name} onChange={(e) => setName(e.target.value)} />
      <Input
        label="Instagram"
        hint="optional"
        value={instagram}
        onChange={(e) => setInstagram(e.target.value)}
        placeholder="https://instagram.com/yourname"
      />
      <Input
        label="YouTube"
        hint="optional"
        value={youtube}
        onChange={(e) => setYoutube(e.target.value)}
        placeholder="https://youtube.com/@yourname"
      />
      <Input
        label="Spotify"
        hint="optional"
        value={spotify}
        onChange={(e) => setSpotify(e.target.value)}
        placeholder="https://open.spotify.com/artist/..."
      />

      {error ? (
        <p className="rounded-md border-2 border-ink bg-punch px-3 py-2 text-sm font-bold text-white">
          {error}
        </p>
      ) : null}

      <div className="flex gap-3">
        <Button type="submit" isLoading={isSaving} disabled={isSaving}>
          Save changes
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
