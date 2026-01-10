'use client';

import { type ScreenSuggestion } from '@/lib/hooks/useProactiveSuggestions';

interface SuggestionChipProps {
  suggestion: ScreenSuggestion;
  onAccept: (suggestion: ScreenSuggestion) => void;
  onDismiss: (suggestionId: string) => void;
}

/**
 * Chip cliquable pour une suggestion
 * Design minimaliste, orienté action
 */
function SuggestionChip({ suggestion, onAccept, onDismiss }: SuggestionChipProps) {
  return (
    <div
      className="
        group inline-flex items-center gap-1.5
        px-3 py-1.5 rounded-full
        bg-gray-100 hover:bg-gray-200
        border border-gray-200 hover:border-gray-300
        text-sm text-gray-700 hover:text-gray-900
        transition-all duration-150
        cursor-pointer
      "
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
          text-gray-400 hover:text-gray-600 hover:bg-gray-300
          opacity-0 group-hover:opacity-100
          transition-opacity duration-150
          focus:outline-none focus:opacity-100
        "
        title="Ignorer"
        aria-label={`Ignorer la suggestion "${suggestion.label}"`}
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
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
 * Liste de suggestions sous forme de chips cliquables
 * Affichée en bas de la zone de messages, au-dessus de l'input
 */
export function ProactiveSuggestionsList({
  suggestions,
  onAccept,
  onDismiss,
  loading = false,
}: ProactiveSuggestionsListProps) {
  // Loading state minimal
  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2">
        <div className="w-24 h-7 bg-gray-100 rounded-full animate-pulse" />
        <div className="w-32 h-7 bg-gray-100 rounded-full animate-pulse" />
      </div>
    );
  }

  // Pas de suggestions = silence intelligent
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 py-2">
      {suggestions.map((suggestion) => (
        <SuggestionChip
          key={suggestion.id}
          suggestion={suggestion}
          onAccept={onAccept}
          onDismiss={onDismiss}
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
