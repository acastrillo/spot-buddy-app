'use client';

import { Button } from '@/components/ui/button';
import { ReactNode } from 'react';

interface OnboardingContainerProps {
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onBack: () => void;
  onSkip?: () => void;
  onSkipAll?: () => void;
  canSkip?: boolean;
  isNextDisabled?: boolean;
  isLoading?: boolean;
  children: ReactNode;
}

export function OnboardingContainer({
  currentStep,
  totalSteps,
  onNext,
  onBack,
  onSkip,
  onSkipAll,
  canSkip = false,
  isNextDisabled = false,
  isLoading = false,
  children,
}: OnboardingContainerProps) {
  const progress = ((currentStep + 1) / totalSteps) * 100;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      {/* Progress Bar */}
      <div className="bg-[var(--surface)] p-4 border-b border-[var(--border)]">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-[var(--text-secondary)]">
              Step {currentStep + 1} of {totalSteps}
            </p>
            {onSkipAll && !isLastStep && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onSkipAll}
                disabled={isLoading}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Skip All
              </Button>
            )}
          </div>
          <div className="w-full bg-[var(--surface-2)] rounded-full h-2">
            <div
              className="bg-[var(--primary)] h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-6">
          {children}
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-[var(--surface)] border-t border-[var(--border)] p-4">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <Button
            variant="outline"
            onClick={onBack}
            disabled={isFirstStep || isLoading}
          >
            Back
          </Button>

          <div className="flex gap-2">
            {canSkip && onSkip && (
              <Button variant="ghost" onClick={onSkip} disabled={isLoading}>
                Skip
              </Button>
            )}
            <Button
              onClick={onNext}
              disabled={isNextDisabled || isLoading}
            >
              {isLoading ? 'Saving...' : isLastStep ? 'Finish' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
