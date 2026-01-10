// Exports centralisés pour le module AI

export * from './types';
export {
  createSuggestion,
  listSuggestions,
  getSuggestion,
  updateSuggestion,
  acceptSuggestion,
  dismissSuggestion,
  markSuggestionExecuted,
  getSuggestionsStats,
  detectNewSuggestions,
} from './suggestions';
