'use client';

import { CheckCircle, Sparkles } from 'lucide-react';

export function CompleteStep() {
  return (
    <div className="space-y-8 text-center py-12">
      <div className="flex justify-center">
        <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center">
          <CheckCircle className="w-16 h-16 text-green-500" />
        </div>
      </div>

      <div>
        <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-3">
          You&apos;re all set!
        </h1>
        <p className="text-lg text-[var(--text-secondary)] max-w-md mx-auto">
          Your profile is complete. Let&apos;s start building the best version of yourself.
        </p>
      </div>

      <div className="bg-[var(--primary)]/10 rounded-lg p-6 max-w-md mx-auto">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-[var(--primary)]" />
          <h3 className="font-semibold text-[var(--primary)]">What&apos;s Next?</h3>
        </div>
        <ul className="text-sm text-[var(--text-secondary)] space-y-2 text-left">
          <li>✓ Generate AI-powered workouts tailored to your goals</li>
          <li>✓ Track your progress and PRs</li>
          <li>✓ Build a library of your favorite workouts</li>
          <li>✓ Join our community of fitness enthusiasts</li>
        </ul>
      </div>

      <p className="text-sm text-[var(--text-secondary)]">
        Redirecting you to your dashboard...
      </p>
    </div>
  );
}
