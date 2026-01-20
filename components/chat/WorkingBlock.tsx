'use client';

import { useState, useEffect, useRef } from 'react';
import { Check, Loader2, Circle, X } from 'lucide-react';
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
      return <Check className="w-4 h-4 text-green-500" />;
    case 'in_progress':
      return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
    case 'cancelled':
      return <X className="w-4 h-4 text-muted-foreground" />;
    case 'pending':
    default:
      return <Circle className="w-4 h-4 text-muted-foreground/40" />;
  }
}

function StepItem({ step }: { step: WorkingStep }) {
  const isCompleted = step.status === 'completed';
  const isCancelled = step.status === 'cancelled';

  return (
    <div
      className={`
        flex items-center gap-2.5 py-1 text-sm
        ${isCompleted || isCancelled ? 'text-muted-foreground' : 'text-foreground'}
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
  // Track if user manually toggled to prevent auto-collapse override
  const userToggledRef = useRef(false);
  const hasAutoCollapsedRef = useRef(false);

  // Compter les étapes par statut
  const completedCount = steps.filter((s) => s.status === 'completed').length;
  const totalCount = steps.length;
  const hasInProgress = steps.some((s) => s.status === 'in_progress');
  const allCompleted = completedCount === totalCount && totalCount > 0;

  // Handle user toggle - mark as user-initiated
  const handleToggle = () => {
    userToggledRef.current = true;
    onToggleCollapse();
  };

  // Auto-collapse only ONCE when all steps complete, and only if user hasn't toggled
  useEffect(() => {
    if (allCompleted && !isCollapsed && !hasAutoCollapsedRef.current && !userToggledRef.current) {
      const timer = setTimeout(() => {
        hasAutoCollapsedRef.current = true;
        onToggleCollapse();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [allCompleted, isCollapsed, onToggleCollapse]);

  // Reset refs when steps change (new operation)
  useEffect(() => {
    if (steps.length > 0 && steps.some(s => s.status === 'in_progress' || s.status === 'pending')) {
      userToggledRef.current = false;
      hasAutoCollapsedRef.current = false;
    }
  }, [steps]);

  // Ne pas afficher si pas d'étapes
  if (steps.length === 0 || !isVisible) {
    return null;
  }

  return (
    <div className="flex justify-start">
      <div
        className={`
          rounded-[20px] rounded-bl-[4px] shadow-sm transition-all duration-200 overflow-hidden
          ${allCompleted
            ? 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800'
            : 'bg-card border border-border/50'
          }
        `}
      >
        {/* Header - toujours visible */}
        <div className="px-4 py-2.5 flex items-center justify-between gap-4">
          <button
            onClick={handleToggle}
            className="flex items-center gap-2 text-left"
          >
            {hasInProgress ? (
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
            ) : allCompleted ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Circle className="w-4 h-4 text-muted-foreground" />
            )}
            <span className="text-sm font-medium text-foreground">
              {allCompleted ? 'Terminé' : 'En cours...'}
            </span>
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
              {completedCount}/{totalCount}
            </span>
          </button>

          {/* Bouton Arrêter - visible uniquement si en cours */}
          {hasInProgress && (
            <button
              onClick={onStop}
              className="text-xs text-muted-foreground hover:text-destructive px-2 py-0.5 rounded-full hover:bg-destructive/10 transition-colors"
            >
              Arrêter
            </button>
          )}
        </div>

        {/* Liste des étapes - collapsible */}
        {!isCollapsed && (
          <div className="px-4 pb-3 border-t border-border/50">
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
    <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
      {steps.map((step) => (
        <div
          key={step.id}
          className={`
            flex items-center gap-2 text-sm
            ${step.status === 'completed' ? 'text-muted-foreground' : 'text-foreground'}
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
