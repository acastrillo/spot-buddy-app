'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import { useSession } from 'next-auth/react';
import { OnboardingContainer } from '@/components/onboarding/OnboardingContainer';
import { WelcomeStep } from '@/components/onboarding/WelcomeStep';
import { BasicProfileStep } from '@/components/onboarding/BasicProfileStep';
import { ExperienceStep } from '@/components/onboarding/ExperienceStep';
import { ScheduleStep } from '@/components/onboarding/ScheduleStep';
import { EquipmentStep } from '@/components/onboarding/EquipmentStep';
import { GoalsStep } from '@/components/onboarding/GoalsStep';
import { PersonalRecordsStep } from '@/components/onboarding/PersonalRecordsStep';
import { CompleteStep } from '@/components/onboarding/CompleteStep';
import { Loader2 } from 'lucide-react';
import type { PersonalRecord } from '@/lib/training-profile';

interface OnboardingData {
  firstName: string;
  lastName: string;
  experience: 'beginner' | 'intermediate' | 'advanced' | null;
  trainingDays: number;
  sessionDuration: number | null;
  equipment: string[];
  goals: string[];
  personalRecords: Record<string, PersonalRecord>;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: isSessionLoading } = useAuthStore();
  const { update: updateSession } = useSession();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSkippingAll, setIsSkippingAll] = useState(false);

  const [formData, setFormData] = useState<OnboardingData>({
    firstName: '',
    lastName: '',
    experience: null,
    trainingDays: 4,
    sessionDuration: null,
    equipment: [],
    goals: [],
    personalRecords: {},
  });

  // Redirect if not authenticated or already completed onboarding
  // Wait for session to finish loading before making redirect decisions
  useEffect(() => {
    // Don't redirect while session is still loading
    if (isSessionLoading) return;

    if (!isAuthenticated) {
      router.push('/auth/login');
    } else if (user?.onboardingCompleted || user?.onboardingSkipped) {
      router.push('/');
    } else if (user) {
      // Pre-populate with existing user data
      setFormData((prev) => ({
        ...prev,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
      }));
    }
  }, [isAuthenticated, isSessionLoading, user, router]);

  // Handler to skip all remaining onboarding steps
  const handleSkipAll = async () => {
    setIsSkippingAll(true);

    try {
      const response = await fetch('/api/user/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: false, skipped: true }),
      });

      if (!response.ok) {
        throw new Error('Failed to skip onboarding');
      }

      // Update session to reflect onboarding skipped
      await updateSession();

      // Wait a moment for session to propagate before redirecting
      await new Promise(resolve => setTimeout(resolve, 500));

      // Force a page reload to ensure session is fully refreshed
      window.location.replace('/');
    } catch (error) {
      console.error('Error skipping onboarding:', error);
      alert('Failed to skip. Please try again.');
      setIsSkippingAll(false);
    }
  };

  const totalSteps = 8;

  // Define which steps are skippable
  const isSkippable = (step: number) => {
    return step === 4 || step === 6; // Equipment and PRs steps
  };

  // Validate current step
  const isStepValid = () => {
    switch (currentStep) {
      case 0: // Welcome
        return true;
      case 1: // Basic Profile
        return formData.firstName.trim().length > 0;
      case 2: // Experience
        return formData.experience !== null; // Must select an experience level
      case 3: // Schedule
        return formData.trainingDays >= 1 && formData.trainingDays <= 7;
      case 4: // Equipment
        return true; // Optional
      case 5: // Goals
        return formData.goals.length > 0;
      case 6: // PRs
        return true; // Optional
      case 7: // Complete
        return true;
      default:
        return false;
    }
  };

  const saveStepData = async (step: number) => {
    try {
      if (step === 1) {
        // Save basic profile
        const res = await fetch('/api/user/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: formData.firstName,
            lastName: formData.lastName,
          }),
        });

        if (!res.ok) throw new Error('Failed to save profile');
      } else if (step >= 2 && step <= 6) {
        // Save training profile
        const profile = {
          experience: formData.experience,
          trainingDays: formData.trainingDays,
          sessionDuration: formData.sessionDuration,
          equipment: formData.equipment,
          goals: formData.goals,
          personalRecords: formData.personalRecords,
          constraints: [],
          updatedAt: new Date().toISOString(),
        };

        const res = await fetch('/api/user/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profile),
        });

        if (!res.ok) throw new Error('Failed to save training profile');
      }
    } catch (error) {
      console.error('Error saving step data:', error);
      throw error;
    }
  };

  const handleNext = async () => {
    if (!isStepValid()) return;

    setIsLoading(true);

    try {
      // Save current step data
      await saveStepData(currentStep);

      if (currentStep === totalSteps - 1) {
        // Mark onboarding complete
        const response = await fetch('/api/user/onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ completed: true }),
        });

        if (!response.ok) {
          throw new Error('Failed to complete onboarding');
        }

        // Update session to reflect onboarding completion
        await updateSession();

        // Wait a moment for session to propagate before redirecting
        // This prevents race condition where homepage checks onboardingCompleted
        // before the session is fully refreshed
        await new Promise(resolve => setTimeout(resolve, 500));

        // Force a page reload to ensure session is fully refreshed
        // Using window.location.replace to prevent back button navigation
        window.location.replace('/');
      } else {
        // Move to next step
        setCurrentStep((prev) => prev + 1);
      }
    } catch (error) {
      console.error('Error advancing step:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSkip = async () => {
    if (!isSkippable(currentStep)) return;

    setIsLoading(true);

    try {
      // Save what we have so far
      await saveStepData(currentStep);

      // Move to next step
      setCurrentStep((prev) => prev + 1);
    } catch (error) {
      console.error('Error skipping step:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading spinner while session is loading
  if (isSessionLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  // Redirect to login handled by useEffect above
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  // Render current step
  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <WelcomeStep />;
      case 1:
        return (
          <BasicProfileStep
            firstName={formData.firstName}
            lastName={formData.lastName}
            onFirstNameChange={(value) =>
              setFormData((prev) => ({ ...prev, firstName: value }))
            }
            onLastNameChange={(value) =>
              setFormData((prev) => ({ ...prev, lastName: value }))
            }
          />
        );
      case 2:
        return (
          <ExperienceStep
            experience={formData.experience}
            onExperienceChange={(value) =>
              setFormData((prev) => ({ ...prev, experience: value }))
            }
          />
        );
      case 3:
        return (
          <ScheduleStep
            trainingDays={formData.trainingDays}
            sessionDuration={formData.sessionDuration}
            onTrainingDaysChange={(value) =>
              setFormData((prev) => ({ ...prev, trainingDays: value }))
            }
            onSessionDurationChange={(value) =>
              setFormData((prev) => ({ ...prev, sessionDuration: value }))
            }
          />
        );
      case 4:
        return (
          <EquipmentStep
            equipment={formData.equipment}
            onEquipmentChange={(value) =>
              setFormData((prev) => ({ ...prev, equipment: value }))
            }
          />
        );
      case 5:
        return (
          <GoalsStep
            goals={formData.goals}
            onGoalsChange={(value) =>
              setFormData((prev) => ({ ...prev, goals: value }))
            }
          />
        );
      case 6:
        return (
          <PersonalRecordsStep
            personalRecords={formData.personalRecords}
            onPersonalRecordsChange={(value) =>
              setFormData((prev) => ({ ...prev, personalRecords: value }))
            }
          />
        );
      case 7:
        return <CompleteStep />;
      default:
        return null;
    }
  };

  return (
    <OnboardingContainer
      currentStep={currentStep}
      totalSteps={totalSteps}
      onNext={handleNext}
      onBack={handleBack}
      onSkip={handleSkip}
      onSkipAll={handleSkipAll}
      canSkip={isSkippable(currentStep)}
      isNextDisabled={!isStepValid()}
      isLoading={isLoading || isSkippingAll}
    >
      {renderStep()}
    </OnboardingContainer>
  );
}
