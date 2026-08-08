'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Input, Select, Textarea } from '@/components/ui/Field'
import Button from '@/components/ui/Button'
import { UploadCloud, Music, Trash2, ChevronUp, ChevronDown, Check, X } from 'lucide-react'
import { formatDuration } from '../utils'
import { LANGUAGES, MIN_TRACKS_BY_TYPE, MAX_TRACKS_BY_TYPE } from '../types'
import type { TrackData } from '../types'

interface Step4TracksProps {
  tracks: TrackData[]
  releaseType: string
  onAddTrack: () => void
  onRemoveTrack: (key: string) => void
  onReorderTracks: (fromIndex: number, toIndex: number) => void
  onUpdateTrack: (key: string, patch: Partial<TrackData>) => void
  onUploadAudio: (trackKey: string, file: File) => void
  onRemoveAudio: (trackKey: string) => void
  maxAudioUploadMb: number
  errors: string[]
}

export default function Step4Tracks({
  tracks,
  releaseType,
  onAddTrack,
  onRemoveTrack,
  onReorderTracks,
  onUpdateTrack,
  onUploadAudio,
  onRemoveAudio,
  maxAudioUploadMb,
  errors,
}: Step4TracksProps) {
  const minTracks = MIN_TRACKS_BY_TYPE[releaseType as keyof typeof MIN_TRACKS_BY_TYPE] || 1
  const maxTracks = MAX_TRACKS_BY_TYPE[releaseType as keyof typeof MAX_TRACKS_BY_TYPE] || 30
  const [expandedTrack, setExpandedTrack] = useState<string | null>(tracks[0]?.key || null)
  const handleFileUpload = async (trackKey: string, file: File) => {
    onUploadAudio(trackKey, file)
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

      <div className="flex items-center justify-between">
        <h3 className="font-display text-xl uppercase text-ink">Tracks ({tracks.length}/{maxTracks})</h3>
        <Button
          variant="secondary"
          onClick={onAddTrack}
          disabled={tracks.length >= maxTracks}
          className="text-sm"
        >
          <Music className="h-3.5 w-3.5" />
          Add Track
        </Button>
      </div>

      {tracks.length < minTracks && (
        <p className="rounded-lg border-[2.5px] border-ink bg-canary px-4 py-3 text-sm font-bold text-ink shadow-[3px_3px_0_0_var(--color-ink)]">
          {releaseType} requires at least {minTracks} track{tracks.length > 1 ? 's' : ''}. Add {minTracks - tracks.length} more.
        </p>
      )}

      <div className="space-y-4" role="list" aria-label="Tracks">
        {tracks.map((track, index) => (
          <TrackCard
            key={track.key}
            track={track}
            index={index}
            isExpanded={expandedTrack === track.key}
            onToggleExpand={() => setExpandedTrack(expandedTrack === track.key ? null : track.key)}
            onUpdate={(patch) => onUpdateTrack(track.key, patch)}
            onRemove={() => onRemoveTrack(track.key)}
            onMoveUp={() => index > 0 && onReorderTracks(index, index - 1)}
            onMoveDown={() => index < tracks.length - 1 && onReorderTracks(index, index + 1)}
            onUploadAudio={handleFileUpload}
            onRemoveAudio={onRemoveAudio}
            maxAudioUploadMb={maxAudioUploadMb}
            isUploading={false}
            uploadProgress={0}
            uploadError={null}
            canRemove={tracks.length > minTracks}
            isLast={index === tracks.length - 1}
          />
        ))}
      </div>

      {tracks.length === 0 && (
        <div className="rounded-xl border-[2.5px] border-ink/20 bg-paper p-8 text-center">
          <Music className="mx-auto h-12 w-12 text-ink-faint mb-4" />
          <p className="font-display text-lg uppercase text-ink">No tracks yet</p>
          <p className="mt-2 text-sm font-medium text-ink-soft">Add your first track to get started</p>
        </div>
      )}
    </div>
  )
}

interface TrackCardProps {
  track: TrackData
  index: number
  isExpanded: boolean
  onToggleExpand: () => void
  onUpdate: (patch: Partial<TrackData>) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onUploadAudio: (trackKey: string, file: File) => void
  onRemoveAudio: (trackKey: string) => void
  maxAudioUploadMb: number
  isUploading: boolean
  uploadProgress: number
  uploadError: string | null
  canRemove: boolean
  isLast: boolean
}

function TrackCard({
  track,
  index,
  isExpanded,
  onToggleExpand,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  onUploadAudio,
  onRemoveAudio,
  maxAudioUploadMb,
  isUploading,
  uploadProgress,
  uploadError,
  canRemove,
  isLast,
}: TrackCardProps) {
  const [songTitle, setSongTitle] = useState(track.songTitle)
  const [version, setVersion] = useState(track.version || '')
  const [isrc, setIsrc] = useState(track.isrc || '')
  const [language, setLanguage] = useState(track.language)
  const [explicit, setExplicit] = useState(track.explicit)
  const [instrumental, setInstrumental] = useState(track.instrumental)
  const [featuringArtists, setFeaturingArtists] = useState(track.featuringArtists || '')
  const [songwriters, setSongwriters] = useState(track.songwriters.join(', '))
  const [composers, setComposers] = useState(track.composers.join(', '))
  const [producers, setProducers] = useState(track.producers.join(', '))
  const [lyrics, setLyrics] = useState(track.lyrics || '')
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragging(true)
  }
  const handleDragLeave = () => setIsDragging(false)
  const handleDrop = (event: React.DragEvent, trackKey: string) => {
    event.preventDefault()
    setIsDragging(false)
    const file = event.dataTransfer.files[0]
    if (file) onUploadAudio(trackKey, file)
  }
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>, trackKey: string) => {
    const file = event.target.files?.[0]
    if (file) onUploadAudio(trackKey, file)
    event.target.value = ''
  }

  return (
    <div
      className={cn(
        'rounded-xl border-[2.5px] bg-white shadow-[3px_3px_0_0_var(--color-ink)] transition-all duration-200',
        isExpanded ? 'border-ink' : 'border-ink/30',
        isDragging && 'border-cobalt bg-cobalt/5'
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={(e) => handleDrop(e, track.key)}
    >
      {/* Track Header - always visible */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer"
        onClick={onToggleExpand}
      >
        <div className="flex-shrink-0 w-10 flex items-center justify-center font-mono text-xl font-bold text-ink">
          {index + 1}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-display text-lg uppercase text-ink truncate">
              {songTitle || `Track ${index + 1}`}
            </h4>
            {track.audioFile || track.audioPreviewUrl ? (
              <span className="flex items-center gap-1 rounded bg-lime px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-ink">
                <Check className="h-2.5 w-2.5" />
                Ready
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded bg-punch px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-white">
                <X className="h-2.5 w-2.5" />
                No Audio
              </span>
            )}
          </div>
          {version && (
            <p className="font-mono text-[10px] text-ink-faint truncate">Version: {version}</p>
          )}
        </div>

        {track.audioPreviewUrl && !track.audioFile && track.duration && (
          <div className="flex items-center gap-3 text-sm text-ink-faint">
            <Music className="h-4 w-4" />
            <span className="font-mono">{formatDuration(track.duration)}</span>
          </div>
        )}

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={onMoveUp} disabled={index === 0} aria-label="Move up">
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onMoveDown} disabled={isLast} aria-label="Move down">
            <ChevronDown className="h-4 w-4" />
          </Button>
          {canRemove && (
            <Button variant="ghost" size="sm" onClick={onRemove} className="text-punch hover:bg-punch/10" aria-label="Remove track">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onToggleExpand} className="text-ink-faint hover:bg-ink/5" aria-label={isExpanded ? 'Collapse' : 'Expand'}>
            <ChevronDown className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-180')} />
          </Button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t-[2.5px] border-ink/20 p-4 space-y-4 animate-fade-up">
          {/* Audio Upload */}
          <div className="space-y-3">
            <label className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-ink">
              Audio File
            </label>

            <div
              className={cn(
                'relative rounded-lg border-[2.5px] p-6 transition-colors',
                track.audioFile ? 'border-lime bg-lime/10' : 'border-ink/30 hover:border-cobalt',
                isDragging && 'border-cobalt bg-cobalt/5'
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, track.key)}
            >
              <input
                type="file"
                accept=".wav,audio/wav,audio/x-wav"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={(e) => handleFileSelect(e, track.key)}
                disabled={isUploading}
              />

              {track.audioFile ? (
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Music className="h-5 w-5 text-lime" />
                      <span className="font-medium text-ink truncate">{track.audioFile.name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-ink-soft">
                      <span className="font-mono">{(track.audioFile.size / 1024 / 1024).toFixed(1)} MB</span>
                      {track.duration && <span className="font-mono">{formatDuration(track.duration)}</span>}
                    </div>
                    {isUploading && (
                      <div className="mt-2 h-2 bg-ink/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-canary transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    )}
                    {uploadError && (
                      <p className="mt-2 text-sm font-bold text-punch">{uploadError}</p>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => onRemoveAudio(track.key)} className="text-punch">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="text-center">
                  <UploadCloud className="mx-auto h-10 w-10 text-ink-faint mb-2" />
                  <p className="font-medium text-ink">Drag & drop or click to upload</p>
                  <p className="font-mono text-[10px] text-ink-faint mt-1">
                    WAV only • Max {maxAudioUploadMb} MB
                  </p>
                </div>
              )}

              {track.audioPreviewUrl && !track.audioFile && (
                <audio controls className="w-full mt-3" src={track.audioPreviewUrl} />
              )}
            </div>
          </div>

          {/* Track Metadata Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Input
              label="Song Title *"
              required
              value={songTitle}
              onChange={(e) => {
                setSongTitle(e.target.value)
                onUpdate({ songTitle: e.target.value })
              }}
              placeholder="Track title"
            />

            <Input
              label="Version"
              value={version}
              onChange={(e) => {
                setVersion(e.target.value)
                onUpdate({ version: e.target.value || undefined })
              }}
              placeholder="Radio Edit, Acoustic, etc."
            />

            <Input
              label="ISRC"
              value={isrc}
              onChange={(e) => {
                const val = e.target.value.toUpperCase()
                setIsrc(val)
                onUpdate({ isrc: val || undefined })
              }}
              placeholder="US-ABC-23-12345"
              pattern="[A-Z]{2}[A-Z0-9]{3}\\d{2}\\d{5}"
            />

            <Select
              label="Language *"
              required
              value={language}
              onChange={(e) => {
                setLanguage(e.target.value)
                onUpdate({ language: e.target.value })
              }}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.name}>
                  {lang.name}
                </option>
              ))}
            </Select>

            <div className="flex items-center gap-3 pt-5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={explicit}
                  onChange={(e) => {
                    setExplicit(e.target.checked)
                    onUpdate({ explicit: e.target.checked })
                  }}
                  className="h-4 w-4 border-2 border-ink accent-cobalt"
                />
                <span className="font-mono text-[11px] font-bold uppercase text-ink">Explicit</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer ml-auto">
                <input
                  type="checkbox"
                  checked={instrumental}
                  onChange={(e) => {
                    setInstrumental(e.target.checked)
                    onUpdate({ instrumental: e.target.checked })
                  }}
                  className="h-4 w-4 border-2 border-ink accent-cobalt"
                />
                <span className="font-mono text-[11px] font-bold uppercase text-ink">Instrumental</span>
              </label>
            </div>
          </div>

          {/* Contributors */}
          <div className="space-y-4 pt-4 border-t-[2.5px] border-ink/20">
            <h5 className="font-display text-base uppercase text-ink">Contributors</h5>

            <Input
              label="Featuring Artists"
              value={featuringArtists}
              onChange={(e) => {
                setFeaturingArtists(e.target.value)
                onUpdate({ featuringArtists: e.target.value || undefined })
              }}
              placeholder="Comma separated"
            />

            <Textarea
              label="Songwriters"
              value={songwriters}
              onChange={(e) => {
                setSongwriters(e.target.value)
                onUpdate({ songwriters: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })
              }}
              placeholder="One per line or comma separated"
              rows={2}
            />

            <Textarea
              label="Composers"
              value={composers}
              onChange={(e) => {
                setComposers(e.target.value)
                onUpdate({ composers: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })
              }}
              placeholder="One per line or comma separated"
              rows={2}
            />

            <Textarea
              label="Producers"
              value={producers}
              onChange={(e) => {
                setProducers(e.target.value)
                onUpdate({ producers: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })
              }}
              placeholder="One per line or comma separated"
              rows={2}
            />
          </div>

          {/* Lyrics */}
          <div className="pt-4 border-t-[2.5px] border-ink/20">
            <Textarea
              label="Lyrics (Optional)"
              value={lyrics}
              onChange={(e) => {
                setLyrics(e.target.value)
                onUpdate({ lyrics: e.target.value || undefined })
              }}
              placeholder="Full lyrics..."
              rows={6}
            />
          </div>
        </div>
      )}
    </div>
  )
}
