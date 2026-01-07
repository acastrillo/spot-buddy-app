'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface BasicProfileStepProps {
  firstName: string;
  lastName: string;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
}

export function BasicProfileStep({
  firstName,
  lastName,
  onFirstNameChange,
  onLastNameChange,
}: BasicProfileStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
          What should we call you?
        </h2>
        <p className="text-[var(--text-secondary)]">
          Let&apos;s personalize your experience
        </p>
      </div>

      <div className="space-y-4 max-w-md">
        <div>
          <Label htmlFor="firstName" className="text-[var(--text-primary)]">
            First Name <span className="text-[var(--destructive)]">*</span>
          </Label>
          <Input
            id="firstName"
            value={firstName}
            onChange={(e) => onFirstNameChange(e.target.value)}
            placeholder="Enter your first name"
            className="mt-2"
            autoFocus
          />
          {firstName.trim().length === 0 && (
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              First name is required
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="lastName" className="text-[var(--text-primary)]">
            Last Name (Optional)
          </Label>
          <Input
            id="lastName"
            value={lastName}
            onChange={(e) => onLastNameChange(e.target.value)}
            placeholder="Enter your last name"
            className="mt-2"
          />
        </div>
      </div>
    </div>
  );
}
