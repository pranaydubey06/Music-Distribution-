'use client'

import { useCallback, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import Button from '@/components/ui/Button'
import { Upload, Image as ImageIcon, AlertCircle, CheckCircle } from 'lucide-react'
import { COVER_ART_REQUIREMENTS } from '../types'
import type { CoverArtData } from '../types'

interface Step2CoverArtProps {
  data: CoverArtData
  onFileSelect: (file: File) => void
  onRemove: () => void
}

export default function Step2CoverArt({ data, onFileSelect, onRemove }: Step2CoverArtProps) {
  const [isDragActive, setIsDragActive] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = useCallback((file: File): string | null => {
    if (!COVER_ART_REQUIRED_TYPES.includes(file.type)) {
      return 'File must be JPG or PNG'
    }
    if (file.size > COVER_ART_REQUIREMENTS.maxSizeMB * 1024 * 1024) {
      return `File size must be under ${COVER_ART_REQUIREMENTS.maxSizeMB} MB`
    }
    return null
  }, [])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true)
    } else if (e.type === 'dragleave') {
      setIsDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      const error = validateFile(file)
      if (error) {
        setFileError(error)
        return
      }
      setFileError(null)
      onFileSelect(file)
    }
  }, [onFileSelect, validateFile])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const error = validateFile(file)
      if (error) {
        setFileError(error)
        return
      }
      setFileError(null)
      onFileSelect(file)
    }
  }, [onFileSelect, validateFile])

  const openFileDialog = () => fileInputRef.current?.click()

  const hasImage = data.file || data.previewUrl

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Drag & Drop Zone */}
      <div
        className={cn(
          'relative rounded-xl border-[3px] p-8 transition-all duration-200',
          'flex flex-col items-center justify-center min-h-[320px]',
          isDragActive
            ? 'border-cobalt bg-cobalt/5 shadow-[0_0_0_3px_var(--color-cobalt)]'
            : hasImage
            ? 'border-lime bg-lime/10'
            : 'border-ink/20 bg-white hover:border-canary hover:bg-canary/10'
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileDialog}
        role="button"
        tabIndex={0}
        aria-label="Upload cover art"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png"
          onChange={handleFileSelect}
          className="sr-only"
          aria-hidden="true"
        />

        {!hasImage ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="relative w-16 h-16">
              <Upload className="w-10 h-10 text-ink-faint" />
              {isDragActive && (
                <div className="absolute inset-0 border-2 border-cobalt rounded-full animate-pulse" />
              )}
            </div>
            <div className="space-y-1">
              <p className="font-display text-lg uppercase text-ink">Drop cover art here</p>
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-ink-faint">
                or click to browse
              </p>
            </div>
            <p className="font-mono text-[10px] text-ink-faint">
              JPG or PNG · Max 10 MB · Exactly 3000 × 3000 px
            </p>
          </div>
        ) : (
          <>
            <div className="relative w-64 h-64 mx-auto">
              {/* Preview comes from a local object URL before it is uploaded. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={data.previewUrl!}
                alt="Cover art preview"
                className="w-full h-full object-cover rounded-lg border-[2.5px] border-ink shadow-[4px_4px_0_0_var(--color-ink)]"
              />
              {data.dimensions && (
                <div
                  className={cn(
                    'absolute -top-3 -right-3 px-2 py-1 rounded-md font-mono text-[10px] font-bold uppercase',
                    data.validationError
                      ? 'bg-punch text-white'
                      : 'bg-lime text-ink'
                  )}
                >
                  {data.dimensions.width} × {data.dimensions.height}
                </div>
              )}
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className="font-mono text-[11px] font-bold uppercase text-ink-faint">Preview</span>
              <Button variant="ghost" size="sm" onClick={openFileDialog}>
                Replace
              </Button>
              <Button variant="ghost" size="sm" onClick={onRemove}>
                Remove
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Validation Status */}
      <div className="space-y-3">
        <div className={cn(
          'flex items-center gap-3 p-3 rounded-lg border-[2.5px] font-mono text-[11px] font-bold uppercase',
          data.validationError
            ? 'border-punch bg-punch/10 text-punch'
            : data.dimensions?.width === COVER_ART_REQUIREMENTS.width &&
              data.dimensions?.height === COVER_ART_REQUIREMENTS.height
            ? 'border-lime bg-lime/10 text-lime-deep'
            : 'border-ink/20 bg-white text-ink-faint'
        )}>
          {data.validationError ? (
            <>
              <AlertCircle className="h-4 w-4 shrink-0" />
              {data.validationError}
            </>
          ) : data.dimensions ? (
            <>
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>Dimensions OK: {data.dimensions.width} × {data.dimensions.height}</span>
            </>
          ) : (
            <>
              <ImageIcon className="h-4 w-4 shrink-0" />
              <span>Waiting for image…</span>
            </>
          )}
        </div>

        {fileError && (
          <div className="flex items-center gap-2 p-3 rounded-lg border-[2.5px] border-punch bg-punch/10 text-punch font-mono text-[11px] font-bold uppercase">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {fileError}
          </div>
        )}

        {/* Requirements checklist */}
        <div className="grid gap-2 md:grid-cols-3">
          {[
            { label: 'Format', check: data.file ? COVER_ART_REQUIRED_TYPES.includes(data.file.type) : false, detail: 'JPG or PNG only' },
            { label: 'Size', check: data.file ? data.file.size <= COVER_ART_REQUIREMENTS.maxSizeMB * 1024 * 1024 : false, detail: `Max ${COVER_ART_REQUIREMENTS.maxSizeMB} MB` },
            { label: 'Dimensions', check: data.dimensions?.width === COVER_ART_REQUIREMENTS.width && data.dimensions?.height === COVER_ART_REQUIREMENTS.height, detail: 'Exactly 3000 × 3000 px' },
          ].map((req, i) => (
            <div
              key={i}
              className={cn(
                'flex items-center gap-2 p-3 rounded-lg border-[2.5px] font-mono text-[11px] font-bold uppercase',
                req.check
                  ? 'border-lime bg-lime/10 text-lime-deep'
                  : 'border-ink/20 bg-white text-ink-faint'
              )}
            >
              <span className={cn('w-5 h-5 rounded-full border-[2px] flex items-center justify-center flex-shrink-0',
                req.check ? 'bg-lime border-lime' : 'border-ink/30'
              )}>
                {req.check && (
                  <CheckCircle className="w-3 h-3 text-ink" />
                )}
              </span>
              <div>
                <div className="font-display text-xs">{req.label}</div>
                <div className="text-[9px] opacity-70">{req.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const COVER_ART_REQUIRED_TYPES = ['image/jpeg', 'image/png', 'image/jpg']
