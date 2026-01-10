'use client';

import { useState, useEffect } from 'react';
import type { WorkingStep } from '@/lib/chat/working';

interface WorkingBlockProps {
  steps: WorkingStep[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onStop: () => void;
}

function StepIcon({ status }: { status: WorkingStep['status'] }) {
  switch (status) {
    case 'completed':
      return <span className="text-green-600">✓</span>;
    case 'in_progress':
      return <span className="text-blue-600 animate-pulse">●</span>;
    case 'cancelled':
      return <span className="text-gray-400">✕</span>;
    case 'pending':
    default:
      return <span className="text-gray-300">○</span>;
  }
}

function StepItem({ step }: { step: WorkingStep }) {
  const isCompleted = step.status === 'completed';
  const isCancelled = step.status === 'cancelled';

  return (
    <div
      className={`
        flex items-center gap-2 py-1 text-sm
        ${isCompleted || isCancelled ? 'text-gray-400' : 'text-gray-700'}
      `}
    >
      <StepIcon status={step.status} />
      <span className={isCompleted ? 'line-through' : ''}>
        {step.label}
      </span>
    </div>
  );
}

export function WorkingBlock({
  steps,
  isCollapsed,
  onToggleCollapse,
  onStop,
}: WorkingBlockProps) {
  const [isVisible, setIsVisible] = useState(true);

  // Compter les étapes par statut
  const completedCount = steps.filter((s) => s.status === 'completed').length;
  const totalCount = steps.length;
  const hasInProgress = steps.some((s) => s.status === 'in_progress');
  const allCompleted = completedCount === totalCount && totalCount > 0;

  // Auto-collapse quand tout est terminé
  useEffect(() => {
    if (allCompleted && !isCollapsed) {
      const timer = setTimeout(() => {
        onToggleCollapse();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [allCompleted, isCollapsed, onToggleCollapse]);

  // Ne pas afficher si pas d'étapes
  if (steps.length === 0 || !isVisible) {
    return null;
  }

  return (
    <div className="mx-4 mb-3">
      <div
        className={`
          rounded-lg border transition-all duration-200
          ${allCompleted
            ? 'bg-green-50 border-green-200'
            : 'bg-gray-50 border-gray-200'
          }
        `}
      >
        {/* Header - toujours visible */}
        <div className="w-full px-3 py-2 flex items-center justify-between">
          <button
            onClick={onToggleCollapse}
            className="flex items-center gap-2 text-left"
          >
            <span
              className={`
                text-xs transition-transform duration-200
                ${isCollapsed ? '' : 'rotate-90'}
              `}
            >
              ▸
            </span>
            <span className="text-sm font-medium text-gray-700">
              {allCompleted ? 'Terminé' : 'En cours'}
            </span>
            <span className="text-xs text-gray-500">
              ({completedCount}/{totalCount})
            </span>
          </button>

          {/* Bouton Arrêter - visible uniquement si en cours */}
          {hasInProgress && (
            <button
              onClick={onStop}
              className="text-xs text-gray-500 hover:text-red-600 px-2 py-0.5 rounded hover:bg-red-50 transition-colors"
            >
              Arrêter
            </button>
          )}
        </div>

        {/* Liste des étapes - collapsible */}
        {!isCollapsed && (
          <div className="px-3 pb-2 border-t border-gray-100">
            <div className="pt-2 space-y-0.5">
              {steps.map((step) => (
                <StepItem key={step.id} step={step} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Composant simplifié pour affichage inline dans un message
export function WorkingStepsInline({ steps }: { steps: WorkingStep[] }) {
  if (steps.length === 0) return null;

  return (
    <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
      {steps.map((step) => (
        <div
          key={step.id}
          className={`
            flex items-center gap-2 text-sm
            ${step.status === 'completed' ? 'text-gray-400' : 'text-gray-600'}
          `}
        >
          <StepIcon status={step.status} />
          <span className={step.status === 'completed' ? 'line-through' : ''}>
            {step.label}
          </span>
        </div>
      ))}
    </div>
  );
}
