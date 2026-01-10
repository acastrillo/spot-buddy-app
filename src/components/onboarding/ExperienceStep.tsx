'use client';

interface ExperienceStepProps {
  experience: 'beginner' | 'intermediate' | 'advanced' | null;
  onExperienceChange: (value: 'beginner' | 'intermediate' | 'advanced') => void;
}

export function ExperienceStep({ experience, onExperienceChange }: ExperienceStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
          What&apos;s your training experience?
        </h2>
        <p className="text-[var(--text-secondary)]">
          This helps us tailor workouts to your level
        </p>
      </div>

      <div className="space-y-3 max-w-md">
        <button
          onClick={() => onExperienceChange('beginner')}
          className={`w-full p-6 rounded-lg border-2 text-left transition-all relative ${
            experience === 'beginner'
              ? 'border-[var(--primary)] bg-[var(--primary)]/10 ring-2 ring-[var(--primary)]/20'
              : 'border-[var(--border)] hover:border-[var(--primary)]/50'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-[var(--text-primary)] mb-2">
                Beginner
              </h3>
              <p className="text-sm text-[var(--text-secondary)]">
                New to working out or returning after a long break
              </p>
            </div>
            {experience === 'beginner' && (
              <svg
                className="w-6 h-6 text-[var(--primary)] flex-shrink-0 ml-3"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>
        </button>

        <button
          onClick={() => onExperienceChange('intermediate')}
          className={`w-full p-6 rounded-lg border-2 text-left transition-all relative ${
            experience === 'intermediate'
              ? 'border-[var(--primary)] bg-[var(--primary)]/10 ring-2 ring-[var(--primary)]/20'
              : 'border-[var(--border)] hover:border-[var(--primary)]/50'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-[var(--text-primary)] mb-2">
                Intermediate
              </h3>
              <p className="text-sm text-[var(--text-secondary)]">
                Been training consistently for 6+ months
              </p>
            </div>
            {experience === 'intermediate' && (
              <svg
                className="w-6 h-6 text-[var(--primary)] flex-shrink-0 ml-3"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>
        </button>

        <button
          onClick={() => onExperienceChange('advanced')}
          className={`w-full p-6 rounded-lg border-2 text-left transition-all relative ${
            experience === 'advanced'
              ? 'border-[var(--primary)] bg-[var(--primary)]/10 ring-2 ring-[var(--primary)]/20'
              : 'border-[var(--border)] hover:border-[var(--primary)]/50'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-[var(--text-primary)] mb-2">
                Advanced
              </h3>
              <p className="text-sm text-[var(--text-secondary)]">
                Multiple years of consistent training experience
              </p>
            </div>
            {experience === 'advanced' && (
              <svg
                className="w-6 h-6 text-[var(--primary)] flex-shrink-0 ml-3"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>
        </button>
      </div>
    </div>
  );
}
