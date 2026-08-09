'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import Button from '@/components/ui/Button'
import { Save, Send, X, AlertCircle, CheckCircle, Loader2, RotateCcw } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

interface Step6ActionsProps {
  isSubmitting: boolean
  uploadProgress: { step: string; loaded: number; total: number } | null
  lastSaved: number | null
  draftId: string | null
  onSaveDraft: () => Promise<boolean>
  onSubmitRelease: () => Promise<boolean>
  onCancel: () => void
  validationErrors: Record<number, string[]>
}

export default function Step6Actions({
  isSubmitting,
  uploadProgress,
  lastSaved,
  draftId,
  onSaveDraft,
  onSubmitRelease,
  onCancel,
  validationErrors,
}: Step6ActionsProps) {
  const [saveDraftStatus, setSaveDraftStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSaveDraft = async () => {
    setSaveDraftStatus('saving')
    setErrorMessage(null)
    try {
      const success = await onSaveDraft()
      if (success) {
        setSaveDraftStatus('success')
        setTimeout(() => setSaveDraftStatus('idle'), 3000)
      } else {
        setSaveDraftStatus('error')
      }
    } catch (err) {
      setSaveDraftStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save draft')
    }
  }

  const handleSubmitRelease = async () => {
    setSubmitStatus('submitting')
    setErrorMessage(null)
    try {
      const success = await onSubmitRelease()
      if (success) {
        setSubmitStatus('success')
      } else {
        setSubmitStatus('error')
      }
    } catch (err) {
      setSubmitStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'Failed to submit release')
    }
  }

  const hasUnsavedChanges = false

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Status Header */}
      <div className={cn(
        'rounded-xl border-[3px] p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4',
        submitStatus === 'success' ? 'border-lime bg-lime/10' :
        submitStatus === 'error' ? 'border-punch bg-punch/10' :
        saveDraftStatus === 'success' ? 'border-canary bg-canary/10' :
        saveDraftStatus === 'error' ? 'border-punch bg-punch/10' :
        'border-ink/20 bg-white'
      )}>
        <div className="flex items-center gap-4">
          {submitStatus === 'submitting' && (
            <Loader2 className="h-8 w-8 animate-spin text-cobalt" />
          )}
          {submitStatus === 'success' && (
            <CheckCircle className="h-8 w-8 text-lime" />
          )}
          {submitStatus === 'error' && (
            <AlertCircle className="h-8 w-8 text-punch" />
          )}
          {saveDraftStatus === 'saving' && submitStatus !== 'submitting' && (
            <RotateCcw className="h-8 w-8 animate-spin text-canary" />
          )}
          {saveDraftStatus === 'success' && submitStatus !== 'success' && (
            <CheckCircle className="h-8 w-8 text-canary" />
          )}
          {saveDraftStatus === 'error' && submitStatus !== 'error' && (
            <AlertCircle className="h-8 w-8 text-punch" />
          )}
          {(submitStatus === 'idle' && saveDraftStatus === 'idle') && (
            <div className="h-8 w-8 rounded-full border-[2px] border-ink/20 flex items-center justify-center">
              <span className="font-mono text-[11px] font-bold uppercase text-ink-faint">Ready</span>
            </div>
          )}

          <div className="min-w-0">
            <p className="font-display text-lg uppercase text-ink">
              {submitStatus === 'submitting' && 'Submitting Release…'}
              {submitStatus === 'success' && 'Release Submitted!'}
              {submitStatus === 'error' && 'Submission Failed'}
              {saveDraftStatus === 'saving' && submitStatus === 'idle' && 'Saving Draft…'}
              {saveDraftStatus === 'success' && submitStatus === 'idle' && 'Draft Saved'}
              {saveDraftStatus === 'error' && submitStatus === 'idle' && 'Save Failed'}
              {submitStatus === 'idle' && saveDraftStatus === 'idle' && 'Ready to Submit'}
            </p>
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-ink-soft mt-1">
              {uploadProgress ? (
                <>
                  {uploadProgress.step} — {Math.round((uploadProgress.loaded / uploadProgress.total) * 100)}%
                </>
              ) : lastSaved ? (
                <>
                  Last auto-saved: {formatDateTime(new Date(lastSaved).toISOString())}
                  {hasUnsavedChanges && ' • Unsaved changes'}
                </>
              ) : (
                'No draft saved yet'
              )}
            </p>
            {draftId && (
              <p className="font-mono text-[10px] text-ink-faint mt-1">
                Draft ID: {draftId.slice(0, 8)}…
              </p>
            )}
          </div>
        </div>

        {uploadProgress && (
          <div className="w-full sm:w-64">
            <div className="h-2 bg-ink/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-canary transition-all duration-300 ease-out"
                style={{ width: `${Math.round((uploadProgress.loaded / uploadProgress.total) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="rounded-lg border-[2.5px] border-ink bg-punch px-4 py-3 text-sm font-bold text-white shadow-[3px_3px_0_0_var(--color-ink)] flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Validation Errors from Step 5 */}
      {Object.values(validationErrors).flat().length > 0 && (
        <div className="rounded-lg border-[2.5px] border-punch bg-punch/10 p-4">
          <h4 className="font-display text-base uppercase text-punch mb-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Cannot Submit — Fix These First
          </h4>
          <ul className="space-y-1">
            {Object.entries(validationErrors)
              .filter(([, errs]) => errs.length > 0)
              .flatMap(([stepNum, errs]) =>
                errs.map((err, i) => (
                  <li key={`${stepNum}-${i}`} className="flex items-start gap-2 text-sm font-medium text-punch">
                    <X className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>
                      <strong className="font-mono text-[10px] font-bold uppercase">Step {stepNum}:</strong>{' '}
                      {err}
                    </span>
                  </li>
                ))
              )}
          </ul>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Cancel */}
        <Button
          variant="ghost"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 sm:flex-none"
        >
          <X className="h-3.5 w-3.5 mr-1.5" />
          Cancel
        </Button>

        {/* Save Draft */}
        <Button
          variant="secondary"
          onClick={handleSaveDraft}
          disabled={isSubmitting || saveDraftStatus === 'saving'}
          className="flex-1 sm:flex-none"
        >
          {saveDraftStatus === 'saving' ? (
            <>
              <RotateCcw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              Saving…
            </>
          ) : saveDraftStatus === 'success' ? (
            <>
              <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
              Saved
            </>
          ) : (
            <>
              <Save className="h-3.5 w-3.5 mr-1.5" />
              Save Draft
            </>
          )}
        </Button>

        {/* Submit Release */}
        <Button
          onClick={handleSubmitRelease}
          disabled={isSubmitting || submitStatus === 'submitting'}
          className="flex-1"
          size="lg"
        >
          {submitStatus === 'submitting' ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Submitting…
            </>
          ) : submitStatus === 'success' ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Submitted!
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Submit for Review
            </>
          )}
        </Button>
      </div>

      {/* Info */}
      <div className="grid gap-3 sm:grid-cols-3 text-center">
        <div className="p-3 rounded-lg border-[2.5px] border-ink/20 bg-white">
          <Save className="mx-auto h-6 w-6 text-ink-faint mb-1" />
          <p className="font-mono text-[10px] font-bold uppercase text-ink-faint">Save Draft</p>
          <p className="font-body text-[11px] text-ink-soft">Only visible to you</p>
        </div>
        <div className="p-3 rounded-lg border-[2.5px] border-canary bg-canary/10">
          <Send className="mx-auto h-6 w-6 text-canary-deep mb-1" />
          <p className="font-mono text-[10px] font-bold uppercase text-canary-deep">Submit</p>
          <p className="font-body text-[11px] text-ink-soft">Sends to admin for review</p>
        </div>
        <div className="p-3 rounded-lg border-[2.5px] border-lime bg-lime/10">
          <CheckCircle className="mx-auto h-6 w-6 text-lime-deep mb-1" />
          <p className="font-mono text-[10px] font-bold uppercase text-lime-deep">Approved</p>
          <p className="font-body text-[11px] text-ink-soft">Goes live on platforms</p>
        </div>
      </div>
    </div>
  )
}
