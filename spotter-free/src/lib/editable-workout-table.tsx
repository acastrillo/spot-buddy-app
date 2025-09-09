// Editable workout table component for UI integration
'use client';

import React, { useState, useCallback } from 'react';

interface EditableWorkoutTableProps {
  exercises: any[];
  onExercisesChange: (updatedExercises: any[]) => void;
  className?: string;
}

interface EditableCellProps {
  value: string;
  onSave: (newValue: string) => void;
  type?: 'text' | 'number' | 'load' | 'movement';
  suggestions?: string[];
}

const EditableCell: React.FC<EditableCellProps> = ({ 
  value, 
  onSave, 
  type = 'text',
  suggestions = []
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleSave = useCallback(() => {
    if (editValue !== value) {
      onSave(editValue);
    }
    setIsEditing(false);
    setShowSuggestions(false);
  }, [editValue, value, onSave]);

  const handleCancel = useCallback(() => {
    setEditValue(value);
    setIsEditing(false);
    setShowSuggestions(false);
  }, [value]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  }, [handleSave, handleCancel]);

  const filteredSuggestions = suggestions.filter(s => 
    s.toLowerCase().includes(editValue.toLowerCase())
  );

  if (isEditing) {
    return (
      <div className="relative">
        <input
          type="text"
          value={editValue}
          onChange={(e) => {
            setEditValue(e.target.value);
            setShowSuggestions(suggestions.length > 0 && e.target.value.length > 0);
          }}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="w-full px-2 py-1 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary bg-background text-text-primary"
          autoFocus
        />
        
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-10 max-h-32 overflow-y-auto bg-surface border border-border rounded shadow-lg">
            {filteredSuggestions.slice(0, 5).map((suggestion, index) => (
              <div
                key={index}
                className="px-2 py-1 text-sm cursor-pointer hover:bg-primary/10 text-text-primary"
                onMouseDown={() => {
                  setEditValue(suggestion);
                  setTimeout(handleSave, 0);
                }}
              >
                {suggestion}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="px-2 py-1 text-sm cursor-pointer hover:bg-primary/10 rounded min-h-[24px] text-text-primary"
      onClick={() => setIsEditing(true)}
      title="Click to edit"
    >
      {value || <span className="text-text-secondary italic">Click to edit</span>}
    </div>
  );
};


export const EditableWorkoutTable: React.FC<EditableWorkoutTableProps> = ({
  exercises,
  onExercisesChange,
  className = ''
}) => {
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  // Get suggestions for movement names from the glossary
  const movementSuggestions = [
    'Push-Up', 'Pull-Up', 'Squat', 'Deadlift', 'Burpee', 'Thruster',
    'Wall Ball', 'Box Jump', 'Kettlebell Swing', 'Devil Press',
    'Row', 'SkiErg', 'Bike', 'Run', 'Farmer Carry', 'Plank'
  ];

  const quantitySuggestions = [
    '10 reps', '15 reps', '20 reps', '25 reps', '30 reps',
    '30 sec', '45 sec', '60 sec', '90 sec',
    '100 m', '200 m', '400 m', '500 m', '800 m',
    '10 cal', '15 cal', '20 cal'
  ];

  const loadSuggestions = [
    '20 lb', '25 lb', '35 lb', '50 lb', '65 lb',
    '15 kg', '20 kg', '24 kg', '32 kg', '48 kg',
    '2x 50 lb DB', '2x 35 lb DB', '48 kg KB', '32 kg KB'
  ];

  const updateExercise = useCallback((index: number, field: string, value: string) => {
    const updatedExercises = exercises.map((exercise, i) => 
      i === index ? { ...exercise, [field]: value } : exercise
    );
    onExercisesChange(updatedExercises);
  }, [exercises, onExercisesChange]);

  const addExercise = useCallback(() => {
    const newExercise = {
      id: `ex-${Date.now()}-${Math.random()}`,
      name: '',
      sets: 1,
      reps: '',
      weight: '',
      restSeconds: 60,
      notes: ''
    };
    onExercisesChange([...exercises, newExercise]);
  }, [exercises, onExercisesChange]);

  const removeExercise = useCallback((index: number) => {
    const updatedExercises = exercises.filter((_, i) => i !== index);
    onExercisesChange(updatedExercises);
  }, [exercises, onExercisesChange]);

  const duplicateExercise = useCallback((index: number) => {
    const exerciseToDuplicate = exercises[index];
    const newExercise = { ...exerciseToDuplicate, id: `ex-${Date.now()}-${Math.random()}` };
    const updatedExercises = [...exercises.slice(0, index + 1), newExercise, ...exercises.slice(index + 1)];
    onExercisesChange(updatedExercises);
  }, [exercises, onExercisesChange]);

  return (
    <div className={`bg-surface rounded-lg border border-border overflow-hidden ${className}`}>
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Exercise
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Sets
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Reps
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Weight
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Rest (sec)
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Notes
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {exercises.map((exercise, index) => (
              <tr 
                key={exercise.id}
                className="hover:bg-primary/5 transition-colors"
              >
                <td className="px-4 py-3">
                  <EditableCell
                    value={exercise.name || ''}
                    onSave={(value) => updateExercise(index, 'name', value)}
                    type="movement"
                    suggestions={movementSuggestions}
                  />
                </td>
                <td className="px-4 py-3">
                  <EditableCell
                    value={exercise.sets?.toString() || '1'}
                    onSave={(value) => updateExercise(index, 'sets', value)}
                    type="number"
                  />
                </td>
                <td className="px-4 py-3">
                  <EditableCell
                    value={exercise.reps || ''}
                    onSave={(value) => updateExercise(index, 'reps', value)}
                    suggestions={quantitySuggestions}
                  />
                </td>
                <td className="px-4 py-3">
                  <EditableCell
                    value={exercise.weight || ''}
                    onSave={(value) => updateExercise(index, 'weight', value)}
                    type="load"
                    suggestions={loadSuggestions}
                  />
                </td>
                <td className="px-4 py-3">
                  <EditableCell
                    value={exercise.restSeconds?.toString() || '60'}
                    onSave={(value) => updateExercise(index, 'restSeconds', value)}
                    type="number"
                  />
                </td>
                <td className="px-4 py-3">
                  <EditableCell
                    value={exercise.notes || ''}
                    onSave={(value) => updateExercise(index, 'notes', value)}
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => duplicateExercise(index)}
                      className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary/10 rounded transition-colors"
                      title="Duplicate exercise"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => removeExercise(index)}
                      className="p-1.5 text-text-secondary hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                      title="Delete exercise"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer with actions */}
      <div className="px-4 py-3 border-t border-border flex items-center justify-between bg-surface">
        <div className="text-sm text-text-secondary">
          {exercises.length} exercises
        </div>
        <div className="flex gap-2">
          <button
            onClick={addExercise}
            className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/80 transition-colors flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Exercise
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditableWorkoutTable;