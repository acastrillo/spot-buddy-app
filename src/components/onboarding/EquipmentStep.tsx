'use client';

import { EQUIPMENT_OPTIONS } from '@/lib/training-profile';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface EquipmentStepProps {
  equipment: string[];
  onEquipmentChange: (equipment: string[]) => void;
}

export function EquipmentStep({ equipment, onEquipmentChange }: EquipmentStepProps) {
  const toggleEquipment = (item: string) => {
    if (equipment.includes(item)) {
      onEquipmentChange(equipment.filter((e) => e !== item));
    } else {
      onEquipmentChange([...equipment, item]);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
          What equipment do you have access to?
        </h2>
        <p className="text-[var(--text-secondary)]">
          Select all that apply. You can skip this step and add equipment later.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl">
        {EQUIPMENT_OPTIONS.map((item) => (
          <div key={item} className="flex items-center space-x-2">
            <Checkbox
              id={`equipment-${item}`}
              checked={equipment.includes(item)}
              onCheckedChange={() => toggleEquipment(item)}
            />
            <Label
              htmlFor={`equipment-${item}`}
              className="text-sm font-normal cursor-pointer text-[var(--text-primary)]"
            >
              {item}
            </Label>
          </div>
        ))}
      </div>

      {equipment.length > 0 && (
        <p className="text-sm text-[var(--text-secondary)]">
          {equipment.length} {equipment.length === 1 ? 'item' : 'items'} selected
        </p>
      )}
    </div>
  );
}
