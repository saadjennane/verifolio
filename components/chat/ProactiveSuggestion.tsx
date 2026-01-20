'use client';

import { X } from 'lucide-react';
import { type ScreenSuggestion } from '@/lib/hooks/useProactiveSuggestions';

interface SuggestionChipProps {
  suggestion: ScreenSuggestion;
  onAccept: (suggestion: ScreenSuggestion) => void;
  onDismiss: (suggestionId: string) => void;
  index?: number;
}

/**
 * Chip cliquable pour une suggestion - Style Bubble
 */
function SuggestionChip({ suggestion, onAccept, onDismiss, index = 0 }: SuggestionChipProps) {
  return (
    <div
      className="
        group inline-flex items-center gap-1.5
        px-4 py-2 rounded-full
        bg-card hover:bg-muted
        shadow-sm hover:shadow
        text-sm font-medium text-primary
        transition-all duration-200
        cursor-pointer
        hover:scale-105
        animate-in fade-in slide-in-from-bottom-2
      "
      style={{ animationDelay: `${index * 75}ms`, animationFillMode: 'backwards' }}
      onClick={() => onAccept(suggestion)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onAccept(suggestion);
        }
      }}
      role="button"
      tabIndex={0}
    >
      <span>{suggestion.label}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(suggestion.id);
        }}
        className="
          ml-0.5 p-0.5 rounded-full
          text-muted-foreground hover:text-foreground hover:bg-muted
          opacity-0 group-hover:opacity-100
          transition-all duration-150
          focus:outline-none focus:opacity-100
        "
        title="Ignorer"
        aria-label={`Ignorer la suggestion "${suggestion.label}"`}
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

interface ProactiveSuggestionsListProps {
  suggestions: ScreenSuggestion[];
  onAccept: (suggestion: ScreenSuggestion) => void;
  onDismiss: (suggestionId: string) => void;
  loading?: boolean;
}

/**
 * Liste de suggestions sous forme de chips cliquables - Style Bubble
 * Affichée en bas de la zone de messages
 */
export function ProactiveSuggestionsList({
  suggestions,
  onAccept,
  onDismiss,
  loading = false,
}: ProactiveSuggestionsListProps) {
  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center gap-2 py-3">
        <div className="w-24 h-8 bg-card rounded-full animate-pulse shadow-sm" />
        <div className="w-32 h-8 bg-card rounded-full animate-pulse shadow-sm" />
      </div>
    );
  }

  // Pas de suggestions = silence intelligent
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="flex justify-center flex-wrap gap-2 py-3">
      {suggestions.map((suggestion, index) => (
        <SuggestionChip
          key={suggestion.id}
          suggestion={suggestion}
          onAccept={onAccept}
          onDismiss={onDismiss}
          index={index}
        />
      ))}
    </div>
  );
}

/**
 * Export des anciens noms pour compatibilité
 * @deprecated Utiliser ProactiveSuggestionsList
 */
export const ProactiveSuggestionCard = SuggestionChip;
export const ProactiveSuggestionChips = ProactiveSuggestionsList;
