'use client'

import { Input, Select } from '@/components/ui/Field'
import Button from '@/components/ui/Button'
import { Plus, Trash2 } from 'lucide-react'
import { LANGUAGES, GENRES, RELEASE_TYPES, MIN_TRACKS_BY_TYPE } from '../types'
import type { ReleaseInfoData } from '../types'

interface Step1ReleaseInfoProps {
  data: ReleaseInfoData
  onChange: (patch: Partial<ReleaseInfoData>) => void
  errors: string[]
  minTracks: number
}

function getLocalTodayIso() {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 10)
}

export default function Step1ReleaseInfo({ data, onChange, errors, minTracks }: Step1ReleaseInfoProps) {
  // Empty trailing slots are intentionally retained. This lets a newly added
  // (but not yet filled) row remain visible in the controlled form.
  const featuringArtists = data.featuringArtists
    ? data.featuringArtists.split(',').map((artist) => artist.trim())
    : ['']
  const featuringUrls = data.featuringArtistSpotifyUrls
    ? data.featuringArtistSpotifyUrls.split('\n').map((url) => url.trim())
    : ['']

  const featuringCredits = Array.from(
    { length: Math.max(featuringArtists.length, featuringUrls.length, 1) },
    (_, index) => ({ artist: featuringArtists[index] || '', spotifyUrl: featuringUrls[index] || '' })
  )

  const updateFeaturingCredits = (credits: Array<{ artist: string; spotifyUrl: string }>) => {
    onChange({
      featuringArtists: credits.map((credit) => credit.artist.trim()).join(', ') || undefined,
      featuringArtistSpotifyUrls: credits.map((credit) => credit.spotifyUrl.trim()).join('\n') || undefined,
    })
  }

  return (
    <div className="space-y-6 animate-fade-up">
      {errors.length > 0 && (
        <div className="rounded-lg border-[2.5px] border-ink bg-punch px-4 py-3 text-sm font-bold text-white shadow-[3px_3px_0_0_var(--color-ink)]">
          <p className="mb-2 font-display text-lg">Please fix the following:</p>
          <ul className="space-y-1 list-disc list-inside">
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <section className="space-y-4">
        <h3 className="font-display text-xl uppercase text-ink">Release Type & Title <span className="font-mono text-xs text-ink-faint">({minTracks}+ track{minTracks === 1 ? '' : 's'} required)</span></h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Select
            label="Release Type"
            required
            value={data.releaseType}
            onChange={(e) => onChange({ releaseType: e.target.value as ReleaseInfoData['releaseType'] })}
            error={!data.releaseType && 'Required'}
          >
            {RELEASE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type} {type !== 'Single' && `(${MIN_TRACKS_BY_TYPE[type]}+ tracks)`}
              </option>
            ))}
          </Select>

          <Input
            label="Release Title"
            required
            value={data.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="e.g., Midnight Echoes"
            error={!data.title && 'Required'}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Version (Optional)"
            value={data.version || ''}
            onChange={(e) => onChange({ version: e.target.value || undefined })}
            placeholder="Radio Edit, Deluxe, Acoustic, etc."
          />

          <Input
            label="Primary Artist"
            required
            value={data.primaryArtist}
            onChange={(e) => onChange({ primaryArtist: e.target.value })}
            placeholder="Artist name"
            error={!data.primaryArtist && 'Required'}
          />
        </div>
      </section>

      <section className="space-y-4 pt-6 border-t-[2.5px] border-ink">
        <h3 className="font-display text-xl uppercase text-ink">Artist Links (Optional)</h3>
        <Input
          label="Primary Artist Spotify Profile URL"
          type="url"
          value={data.primaryArtistSpotifyUrl || ''}
          onChange={(e) => onChange({ primaryArtistSpotifyUrl: e.target.value || undefined })}
          placeholder="https://open.spotify.com/artist/..."
        />

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-ink">Featuring artists</p>
              <p className="mt-1 text-xs text-ink-faint">Add each featured artist with their matching Spotify profile.</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => updateFeaturingCredits([...featuringCredits, { artist: '', spotifyUrl: '' }])}
            >
              <Plus className="h-3.5 w-3.5" />
              Add artist
            </Button>
          </div>

          {featuringCredits.map((credit, index) => (
            <div key={index} className="rounded-xl border-[2.5px] border-ink bg-white p-4 shadow-[3px_3px_0_0_var(--color-ink)]">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">
                  Featuring artist {index + 1}
                </p>
                {featuringCredits.length > 1 && (
                  <button
                    type="button"
                    onClick={() => updateFeaturingCredits(featuringCredits.filter((_, creditIndex) => creditIndex !== index))}
                    className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase text-punch hover:underline"
                    aria-label={`Remove featuring artist ${index + 1}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </button>
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Featuring Artist"
                  value={credit.artist}
                  onChange={(e) => updateFeaturingCredits(featuringCredits.map((item, creditIndex) => creditIndex === index ? { ...item, artist: e.target.value } : item))}
                  placeholder="Artist name"
                />
                <Input
                  label="Spotify Profile URL"
                  type="url"
                  value={credit.spotifyUrl}
                  onChange={(e) => updateFeaturingCredits(featuringCredits.map((item, creditIndex) => creditIndex === index ? { ...item, spotifyUrl: e.target.value } : item))}
                  placeholder="https://open.spotify.com/artist/..."
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4 pt-6 border-t-[2.5px] border-ink">
        <h3 className="font-display text-xl uppercase text-ink">Release Dates</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Release Date"
            type="date"
            required
            value={data.releaseDate}
            onChange={(e) => onChange({ releaseDate: e.target.value })}
            min={getLocalTodayIso()}
            error={!data.releaseDate && 'Required'}
          />

          <Input
            label="Original Release Date (Optional)"
            type="date"
            value={data.originalReleaseDate || ''}
            onChange={(e) => onChange({ originalReleaseDate: e.target.value || undefined })}
            placeholder="For re-releases"
          />
        </div>
      </section>

      <section className="space-y-4 pt-6 border-t-[2.5px] border-ink">
        <h3 className="font-display text-xl uppercase text-ink">Genres & Language</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Select
            label="Primary Genre"
            required
            value={data.primaryGenre}
            onChange={(e) => onChange({ primaryGenre: e.target.value })}
            error={!data.primaryGenre && 'Required'}
          >
            {GENRES.map((genre) => (
              <option key={genre} value={genre}>
                {genre}
              </option>
            ))}
          </Select>

          <Select
            label="Secondary Genre (Optional)"
            value={data.secondaryGenre || ''}
            onChange={(e) => onChange({ secondaryGenre: e.target.value || undefined })}
          >
            <option value="">— Select —</option>
            {GENRES.map((genre) => (
              <option key={genre} value={genre}>
                {genre}
              </option>
            ))}
          </Select>
        </div>

        <Select
          label="Language"
          required
          value={data.language}
          onChange={(e) => onChange({ language: e.target.value })}
          error={!data.language && 'Required'}
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.name}>
              {lang.name}
            </option>
          ))}
        </Select>
      </section>

      <section className="space-y-4 pt-6 border-t-[2.5px] border-ink">
        <h3 className="font-display text-xl uppercase text-ink">Label (Optional)</h3>
        <Input
          label="Record Label"
          value={data.recordLabel || ''}
          onChange={(e) => onChange({ recordLabel: e.target.value || undefined })}
          placeholder="Your label name"
        />
      </section>

      <div className="pt-4 flex justify-end">
        <Button
          type="button"
          variant="secondary"
          onClick={() => onChange({ releaseDate: getLocalTodayIso() })}
        >
          Set Release Date to Today
        </Button>
      </div>
    </div>
  )
}
