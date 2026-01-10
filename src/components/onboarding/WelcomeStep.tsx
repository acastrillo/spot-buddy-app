'use client';

import { Dumbbell, Target, TrendingUp, Sparkles } from 'lucide-react';

export function WelcomeStep() {
  return (
    <div className="space-y-8 text-center">
      <div>
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 bg-[var(--primary)] rounded-full flex items-center justify-center">
            <Dumbbell className="w-10 h-10 text-white" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-3">
          Welcome to Kinex Fit!
        </h1>
        <p className="text-lg text-[var(--text-secondary)] max-w-lg mx-auto">
          Let&apos;s personalize your experience so we can create the perfect workout plan just for you
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto mt-12">
        <div className="space-y-3">
          <div className="w-12 h-12 bg-[var(--primary)]/10 rounded-lg flex items-center justify-center mx-auto">
            <Target className="w-6 h-6 text-[var(--primary)]" />
          </div>
          <h3 className="font-semibold text-[var(--text-primary)]">Set Your Goals</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Tell us what you want to achieve
          </p>
        </div>

        <div className="space-y-3">
          <div className="w-12 h-12 bg-[var(--primary)]/10 rounded-lg flex items-center justify-center mx-auto">
            <TrendingUp className="w-6 h-6 text-[var(--primary)]" />
          </div>
          <h3 className="font-semibold text-[var(--text-primary)]">Track Progress</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Monitor your improvements over time
          </p>
        </div>

        <div className="space-y-3">
          <div className="w-12 h-12 bg-[var(--primary)]/10 rounded-lg flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6 text-[var(--primary)]" />
          </div>
          <h3 className="font-semibold text-[var(--text-primary)]">AI-Powered Workouts</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Get personalized training plans
          </p>
        </div>
      </div>

      <p className="text-sm text-[var(--text-secondary)] mt-12">
        This will only take a few minutes
      </p>
    </div>
  );
}
