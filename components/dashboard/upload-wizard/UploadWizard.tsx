'use client'

import { ArrowLeft, ArrowRight } from 'lucide-react'
import Button from '@/components/ui/Button'
import ProgressIndicator from './ProgressIndicator'
import Step1ReleaseInfo from './steps/Step1ReleaseInfo'
import Step2CoverArt from './steps/Step2CoverArt'
import Step3Platforms from './steps/Step3Platforms'
import Step4Tracks from './steps/Step4Tracks'
import Step5Validation from './steps/Step5Validation'
import Step6Actions from './steps/Step6Actions'
import { useUploadWizard } from './hooks/useUploadWizard'
import { useArtistSession } from '@/components/dashboard/SessionProvider'

const STEP_LABELS = [
  'Release Info',
  'Cover Art',
  'Platforms',
  'Tracks',
  'Validation',
  'Submit',
]

export default function UploadWizard({
  mode = 'create',
  onSuccess,
}: {
  mode?: 'create' | 'edit'
  onSuccess?: (releaseId: string) => void
}) {
  const { artist } = useArtistSession()

  const wizard = useUploadWizard({
    mode,
    artistId: artist.id,
    artistName: artist.name,
    existingRelease: undefined,
    onSuccess: (releaseId) => {
      if (onSuccess) onSuccess(releaseId)
    },
  })

  const { state } = wizard
  const {
    updateReleaseInfo,
    handleCoverArtFile,
    removeCoverArt,
    updatePlatforms,
    addTrack,
    removeTrack,
    reorderTracks,
    updateTrack,
    handleTrackAudioFile,
    removeTrackAudio,
    saveDraft,
    submitRelease,
    prevStep,
    nextStep,
    restoreDraft,
    dismissRestore,
    showRestoreToast,
    MIN_TRACKS_BY_TYPE,
  } = wizard

  // Restore draft toast is handled by the hook's internal state

  const renderStepContent = () => {
    switch (state.currentStep) {
      case 1:
        return (
          <Step1ReleaseInfo
            data={state.releaseInfo}
            onChange={updateReleaseInfo}
            errors={state.validationErrors[1] || []}
            minTracks={MIN_TRACKS_BY_TYPE[state.releaseInfo.releaseType] || 1}
          />
        )
      case 2:
        return (
          <Step2CoverArt
            data={state.coverArt}
            onFileSelect={handleCoverArtFile}
            onRemove={removeCoverArt}
          />
        )
      case 3:
        return (
          <Step3Platforms
            platforms={state.platforms}
            onPlatformsChange={updatePlatforms}
          />
        )
      case 4:
        return (
          <Step4Tracks
            tracks={state.tracks}
            releaseType={state.releaseInfo.releaseType}
            onAddTrack={addTrack}
            onRemoveTrack={removeTrack}
            onReorderTracks={reorderTracks}
            onUpdateTrack={updateTrack}
            onUploadAudio={handleTrackAudioFile}
            onRemoveAudio={removeTrackAudio}
            maxAudioUploadMb={state.audioMaxUploadMb}
            errors={state.validationErrors[4] || []}
          />
        )
      case 5:
        return (
          <Step5Validation state={state} onGoToStep={wizard.goToStep} />
        )
      case 6:
        return (
          <Step6Actions
            isSubmitting={state.isSubmitting}
            uploadProgress={state.uploadProgress}
            lastSaved={state.lastSaved}
            draftId={state.draftId}
            onSaveDraft={saveDraft}
            onSubmitRelease={submitRelease}
            onCancel={() => window.history.back()}
            validationErrors={state.validationErrors}
          />
        )
      default:
        return null
    }
  }

  const canGoPrev = state.currentStep > 1

  return (
    <div className="brutal-cursor mx-auto max-w-4xl">
      {/* Progress Indicator */}
      <ProgressIndicator
        currentStep={state.currentStep}
        completedSteps={state.completedSteps}
        totalSteps={6}
        stepLabels={STEP_LABELS}
      />

      {/* Keep the restore prompt with Cover Art (step 2), rather than
          interrupting the first release-information screen. */}
      {showRestoreToast && state.currentStep === 2 && (
        <div className="mb-6 rounded-lg border-[2.5px] border-ink bg-canary px-4 py-3 shadow-[3px_3px_0_0_var(--color-ink)] animate-fade-up">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-ink flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="font-mono text-[11px] font-bold uppercase text-paper">!</span>
              </div>
              <div>
                <p className="font-display text-base uppercase text-ink">Draft Found</p>
                <p className="font-body text-sm text-ink-soft mt-1">
                  You have an unsaved draft from a previous session. Would you like to restore it?
                </p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="secondary" size="sm" onClick={() => { restoreDraft(); }}>
                Restore Draft
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { dismissRestore(); }}>
                Discard
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Step Content */}
      <div className="animate-fade-up">
        {renderStepContent()}
      </div>

      {/* Navigation Buttons */}
      <div className="mt-8 flex items-center justify-between pt-6 border-t-[2.5px] border-ink">
        <Button
          variant="ghost"
          onClick={prevStep}
          disabled={!canGoPrev || state.isSubmitting}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase text-ink-faint">
          Step {state.currentStep} of 6
        </div>

        {state.currentStep < 6 ? (
          <Button
            variant="secondary"
            onClick={nextStep}
            disabled={state.isSubmitting}
            className="gap-2"
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  )
}
