'use client'

import { cn } from '@/lib/utils'

interface ProgressIndicatorProps {
  currentStep: number
  completedSteps: number[]
  totalSteps?: number
  stepLabels?: string[]
}

export default function ProgressIndicator({
  currentStep,
  completedSteps,
  totalSteps = 6,
  stepLabels = [
    'Release Info',
    'Cover Art',
    'Platforms',
    'Tracks',
    'Validation',
    'Submit',
  ],
}: ProgressIndicatorProps) {
  return (
    <div className="mb-8">
      {/* Progress bar */}
      <div className="relative h-2 bg-ink/10 rounded-full overflow-visible mb-6">
        <div
          className="absolute top-0 left-0 h-full bg-canary transition-all duration-300 ease-out"
          style={{
            width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%`,
          }}
        />
        {/* Step markers */}
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => {
          const isCompleted = completedSteps.includes(step)
          const isCurrent = step === currentStep

          return (
            <div
              key={step}
              className={cn(
                'absolute top-1/2 -translate-y-1/2 flex flex-col items-center transition-all duration-300',
                'left-[calc(var(--pos)*100%)] -translate-x-1/2',
              )}
              style={{ '--pos': (step - 1) / (totalSteps - 1) } as React.CSSProperties}
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-full border-[3px] flex items-center justify-center font-mono text-[10px] font-bold uppercase z-10 transition-all duration-300',
                  isCompleted
                    ? 'bg-lime border-lime text-ink'
                    : isCurrent
                    ? 'bg-canary border-ink text-ink shadow-[0_0_0_3px_var(--color-canary)]'
                    : 'bg-white border-ink text-ink-faint'
                )}
              >
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step
                )}
              </div>
              <span
                className={cn(
                  'mt-2 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-center max-w-20 whitespace-nowrap transition-colors duration-300',
                  isCompleted || isCurrent ? 'text-ink' : 'text-ink-faint'
                )}
              >
                {stepLabels[step - 1]}
              </span>
            </div>
          )
        })}
      </div>

      {/* Step progress text */}
      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-ink-soft text-center">
        Step {currentStep} of {totalSteps}
      </p>
    </div>
  )
}
