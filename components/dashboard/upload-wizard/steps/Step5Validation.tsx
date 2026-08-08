'use client'

import { cn } from '@/lib/utils'
import { CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react'
import type { WizardState } from '../types'

interface Step5ValidationProps {
  state: WizardState
  onGoToStep: (step: number) => void
}

const VALIDATION_CHECKS = [
  {
    step: 1,
    id: 'release-info',
    label: 'Release Information Complete',
    check: (state: WizardState) => {
      const { releaseInfo } = state
      return !!(
        releaseInfo.releaseType &&
        releaseInfo.title?.trim() &&
        releaseInfo.primaryArtist?.trim() &&
        releaseInfo.releaseDate &&
        releaseInfo.primaryGenre &&
        releaseInfo.language
      )
    },
    details: (state: WizardState) => {
      const { releaseInfo } = state
      const missing: string[] = []
      if (!releaseInfo.releaseType) missing.push('Release type')
      if (!releaseInfo.title?.trim()) missing.push('Title')
      if (!releaseInfo.primaryArtist?.trim()) missing.push('Primary artist')
      if (!releaseInfo.releaseDate) missing.push('Release date')
      if (!releaseInfo.primaryGenre) missing.push('Primary genre')
      if (!releaseInfo.language) missing.push('Language')
      return missing.length ? `Missing: ${missing.join(', ')}` : 'All required fields filled'
    },
  },
  {
    step: 2,
    id: 'cover-art',
    label: 'Cover Art Uploaded & Valid',
    check: (state: WizardState) => {
      const { coverArt } = state
      return !!(
        (coverArt.file || coverArt.previewUrl) &&
        coverArt.dimensions?.width === 3000 &&
        coverArt.dimensions?.height === 3000 &&
        !coverArt.validationError
      )
    },
    details: (state: WizardState) => {
      const { coverArt } = state
      if (!coverArt.file && !coverArt.previewUrl) return 'No cover art uploaded'
      if (coverArt.validationError) return coverArt.validationError
      if (coverArt.dimensions) {
        if (coverArt.dimensions.width !== 3000 || coverArt.dimensions.height !== 3000) {
          return `Invalid dimensions: ${coverArt.dimensions.width}×${coverArt.dimensions.height} (must be 3000×3000)`
        }
        return 'Valid 3000×3000 cover art'
      }
      return 'Validating dimensions…'
    },
  },
  {
    step: 3,
    id: 'platforms',
    label: 'Distribution Platforms Selected',
    check: (state: WizardState) => {
      return state.platforms.some(p => p.selected)
    },
    details: (state: WizardState) => {
      const selected = state.platforms.filter(p => p.selected).map(p => p.name)
      return selected.length ? `${selected.length} platform(s): ${selected.join(', ')}` : 'No platforms selected'
    },
  },
  {
    step: 4,
    id: 'tracks',
    label: 'Tracks Complete with Audio',
    check: (state: WizardState) => {
      const minTracks = (({ Single: 1, EP: 2, Album: 5 } as Record<string, number>)[state.releaseInfo.releaseType] || 1)
      if (state.tracks.length < minTracks) return false
      return state.tracks.every(t =>
        t.songTitle?.trim() && (t.audioFile || t.audioPreviewUrl)
      )
    },
    details: (state: WizardState) => {
      const minTracks = (({ Single: 1, EP: 2, Album: 5 } as Record<string, number>)[state.releaseInfo.releaseType] || 1)
      const withAudio = state.tracks.filter(t => t.audioFile || t.audioPreviewUrl).length
      const withTitle = state.tracks.filter(t => t.songTitle?.trim()).length
      const issues: string[] = []
      if (state.tracks.length < minTracks) issues.push(`${minTracks - state.tracks.length} more track(s) needed`)
      if (withTitle < state.tracks.length) issues.push(`${state.tracks.length - withTitle} track(s) missing title`)
      if (withAudio < state.tracks.length) issues.push(`${state.tracks.length - withAudio} track(s) missing audio`)
      return issues.length ? issues.join('; ') : `${state.tracks.length} track(s) complete`
    },
  },
  {
    step: 4,
    id: 'track-validation',
    label: 'No Track Validation Errors',
    check: (state: WizardState) => {
      return state.tracks.every(t => !t.validationErrors?.length)
    },
    details: (state: WizardState) => {
      const errors = state.tracks.flatMap((t, i) => t.validationErrors?.map(e => `Track ${i + 1}: ${e}`) || [])
      return errors.length ? `${errors.length} error(s): ${errors.join('; ')}` : 'All tracks valid'
    },
  },
]

export default function Step5Validation({ state, onGoToStep }: Step5ValidationProps) {
  const results = VALIDATION_CHECKS.map(check => ({
    ...check,
    passed: check.check(state),
    detail: check.details(state),
  }))

  const allPassed = results.every(r => r.passed)
  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-xl uppercase text-ink">Final Validation</h3>
          <p className="mt-1 font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-ink-soft">
            Review all checks before submitting your release
          </p>
        </div>
        <div className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-[11px] font-bold uppercase',
          allPassed ? 'bg-lime border-lime text-ink' : 'bg-punch/10 border-punch text-punch'
        )}>
          {allPassed ? (
            <>
              <CheckCircle className="h-4 w-4" />
              Ready to Submit
            </>
          ) : (
            <>
              <AlertTriangle className="h-4 w-4" />
              {results.filter(r => !r.passed).length} Issue{results.filter(r => !r.passed).length !== 1 ? 's' : ''}
            </>
          )}
        </div>
      </div>

      <div className="space-y-3" role="list" aria-label="Validation checks">
        {results.map((result) => (
          <div
            key={result.id}
            className={cn(
              'relative group flex items-start gap-4 p-4 rounded-lg border-[2.5px] transition-all duration-200',
              result.passed
                ? 'border-lime bg-lime/10'
                : 'border-punch bg-punch/10'
            )}
            role="listitem"
          >
            <div className={cn(
              'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-mono text-[11px] font-bold',
              result.passed ? 'bg-lime text-ink' : 'bg-punch text-white'
            )}>
              {result.passed ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <span className="font-display text-base uppercase text-ink">{result.label}</span>
                {result.step < 5 && (
                  <button
                    onClick={() => onGoToStep(result.step)}
                    className="flex-shrink-0 px-2 py-1 rounded font-mono text-[10px] font-bold uppercase text-ink-faint hover:bg-ink/5 hover:text-ink transition-colors"
                    aria-label={`Go to step ${result.step} to fix`}
                  >
                    Fix in Step {result.step}
                  </button>
                )}
              </div>
              <p className={cn('mt-1 font-mono text-[11px]', result.passed ? 'text-lime-deep' : 'text-punch')}>
                {result.detail}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className={cn(
        'rounded-lg p-4 font-mono text-[11px] font-bold uppercase',
        allPassed ? 'border-lime bg-lime/10 text-lime-deep' : 'border-punch bg-punch/10 text-punch'
      )}>
        <div className="flex items-center gap-2">
          {allPassed ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          <span>
            {allPassed
              ? 'All validation checks passed. Your release is ready for submission.'
              : `${results.filter(r => !r.passed).length} of ${results.length} checks need attention before submission.`}
          </span>
        </div>
      </div>

      {/* Quick Jump Links */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {VALIDATION_CHECKS.slice(0, 4).map(check => (
          <button
            key={check.id}
            onClick={() => onGoToStep(check.step)}
            className={cn(
              'p-3 rounded-lg border-[2.5px] text-left transition-all',
              check.step === state.currentStep
                ? 'border-cobalt bg-cobalt/5'
                : 'border-ink/20 hover:border-canary hover:bg-canary/10'
            )}
          >
            <div className="font-mono text-[10px] font-bold uppercase text-ink-faint mb-1">
              Step {check.step}
            </div>
            <div className="font-body text-sm font-medium text-ink">{check.label}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
