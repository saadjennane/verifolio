/**
 * Utility to format brief responses for LLM summarization
 */

import type {
  BriefWithDetails,
  BriefQuestionWithResponse,
  AddressValue,
  DateRangeValue,
  DateConfig,
  SelectionConfig,
} from './types';
import { isDataQuestion } from './types';

/**
 * Format a date string in French locale
 */
function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Format a single question with its response for the LLM
 */
function formatQuestionResponse(question: BriefQuestionWithResponse): string | null {
  // Skip structure blocks (no response expected)
  if (!isDataQuestion(question.type)) {
    return null;
  }

  // Skip questions without responses
  if (!question.response) {
    return `${question.label}: (pas de réponse)`;
  }

  const response = question.response;
  const label = question.label;

  switch (question.type) {
    case 'text_short':
    case 'text_long':
    case 'number':
    case 'time':
      return response.value ? `${label}: ${response.value}` : null;

    case 'rating':
      return response.value ? `${label}: ${response.value}/5` : null;

    case 'address': {
      const address = response.structured_value as AddressValue | null;
      if (!address) return null;
      const parts = [
        address.lieu,
        address.adresse,
        address.ville,
        address.pays,
      ].filter(Boolean);
      return parts.length > 0 ? `${label}: ${parts.join(', ')}` : null;
    }

    case 'date': {
      const dateConfig = question.config as DateConfig;
      const mode = dateConfig?.mode || 'single';

      if (mode === 'single') {
        return response.value ? `${label}: ${formatDate(response.value)}` : null;
      }

      if (mode === 'range') {
        const range = response.structured_value as DateRangeValue | null;
        if (!range) return null;
        return `${label}: du ${formatDate(range.start)} au ${formatDate(range.end)}`;
      }

      // Multiple dates
      const dates = response.structured_value as string[] | null;
      if (!dates || dates.length === 0) return null;
      return `${label}: ${dates.map(formatDate).join(', ')}`;
    }

    case 'selection': {
      const selConfig = question.config as SelectionConfig;
      const selectionType = selConfig?.selection_type || 'dropdown';

      if (selectionType === 'multiple') {
        const selections = response.structured_value as string[] | null;
        if (!selections || selections.length === 0) return null;
        return `${label}: ${selections.join(', ')}`;
      }

      return response.value ? `${label}: ${response.value}` : null;
    }

    default:
      return response.value ? `${label}: ${response.value}` : null;
  }
}

/**
 * Format all brief responses into a structured text for the LLM
 */
export function formatBriefForSummary(brief: BriefWithDetails): string {
  const lines: string[] = [];

  // Add brief context
  lines.push(`Brief: ${brief.title}`);
  lines.push(`Client: ${brief.client.nom}`);
  lines.push(`Projet: ${brief.deal.title}`);
  lines.push('');
  lines.push('--- Réponses ---');
  lines.push('');

  // Format each question with its response
  for (const question of brief.questions) {
    const formatted = formatQuestionResponse(question);
    if (formatted) {
      lines.push(formatted);
    }
  }

  return lines.join('\n');
}

/**
 * Check if a brief has any responses to summarize
 */
export function hasResponsesToSummarize(brief: BriefWithDetails): boolean {
  return brief.questions.some(
    (q) => isDataQuestion(q.type) && q.response != null
  );
}
