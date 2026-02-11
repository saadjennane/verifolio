/**
 * Tests for format-responses utility
 */
import { describe, expect, it } from 'vitest';
import { formatBriefForSummary, hasResponsesToSummarize } from '@/lib/briefs/format-responses';
import type { BriefWithDetails, BriefQuestionWithResponse } from '@/lib/briefs/types';

// Helper to create a mock brief
function createMockBrief(questions: BriefQuestionWithResponse[]): BriefWithDetails {
  return {
    id: 'brief-1',
    user_id: 'user-1',
    deal_id: 'deal-1',
    client_id: 'client-1',
    template_id: null,
    title: 'Test Brief',
    description: null,
    status: 'RESPONDED',
    public_token: 'token-123',
    theme_color: 'blue',
    show_logo: true,
    show_brief_reminder: false,
    brief_reminder_text: null,
    created_at: '2024-01-15T10:00:00Z',
    sent_at: '2024-01-15T11:00:00Z',
    responded_at: '2024-01-15T12:00:00Z',
    deleted_at: null,
    updated_at: '2024-01-15T12:00:00Z',
    deal: { id: 'deal-1', title: 'Projet Video' },
    client: { id: 'client-1', nom: 'ACME Corp' },
    questions,
  };
}

// Helper to create a mock question
function createMockQuestion(
  type: string,
  label: string,
  response: { value?: string | null; structured_value?: unknown } | null = null,
  config: Record<string, unknown> = {}
): BriefQuestionWithResponse {
  return {
    id: `q-${Math.random().toString(36).substr(2, 9)}`,
    brief_id: 'brief-1',
    type: type as BriefQuestionWithResponse['type'],
    label,
    position: 0,
    is_required: false,
    config,
    created_at: '2024-01-15T10:00:00Z',
    response: response
      ? {
          id: `r-${Math.random().toString(36).substr(2, 9)}`,
          question_id: 'q-1',
          value: response.value ?? null,
          structured_value: (response.structured_value as BriefQuestionWithResponse['response'] extends { structured_value: infer T } ? T : never) ?? null,
          responded_at: '2024-01-15T12:00:00Z',
        }
      : null,
  };
}

describe('formatBriefForSummary', () => {
  it('should include brief context', () => {
    const brief = createMockBrief([]);
    const result = formatBriefForSummary(brief);

    expect(result).toContain('Brief: Test Brief');
    expect(result).toContain('Client: ACME Corp');
    expect(result).toContain('Projet: Projet Video');
  });

  it('should format text_short responses', () => {
    const brief = createMockBrief([
      createMockQuestion('text_short', 'Nom du projet', { value: 'Site web ACME' }),
    ]);
    const result = formatBriefForSummary(brief);

    expect(result).toContain('Nom du projet: Site web ACME');
  });

  it('should format text_long responses', () => {
    const brief = createMockBrief([
      createMockQuestion('text_long', 'Description', { value: 'Un projet innovant' }),
    ]);
    const result = formatBriefForSummary(brief);

    expect(result).toContain('Description: Un projet innovant');
  });

  it('should format number responses', () => {
    const brief = createMockBrief([
      createMockQuestion('number', 'Budget', { value: '5000' }),
    ]);
    const result = formatBriefForSummary(brief);

    expect(result).toContain('Budget: 5000');
  });

  it('should format rating responses with /5', () => {
    const brief = createMockBrief([
      createMockQuestion('rating', 'Importance', { value: '4' }),
    ]);
    const result = formatBriefForSummary(brief);

    expect(result).toContain('Importance: 4/5');
  });

  it('should format address responses', () => {
    const brief = createMockBrief([
      createMockQuestion('address', 'Lieu', {
        structured_value: {
          lieu: 'Salle des fetes',
          adresse: '123 rue Example',
          ville: 'Paris',
          pays: 'France',
        },
      }),
    ]);
    const result = formatBriefForSummary(brief);

    expect(result).toContain('Lieu: Salle des fetes, 123 rue Example, Paris, France');
  });

  it('should format single date responses', () => {
    const brief = createMockBrief([
      createMockQuestion('date', 'Date evenement', { value: '2024-03-15' }, { mode: 'single' }),
    ]);
    const result = formatBriefForSummary(brief);

    expect(result).toContain('Date evenement:');
    expect(result).toContain('15');
    expect(result).toContain('mars');
    expect(result).toContain('2024');
  });

  it('should format date range responses', () => {
    const brief = createMockBrief([
      createMockQuestion(
        'date',
        'Periode',
        {
          structured_value: {
            start: '2024-03-15',
            end: '2024-03-20',
          },
        },
        { mode: 'range' }
      ),
    ]);
    const result = formatBriefForSummary(brief);

    expect(result).toContain('Periode: du');
    expect(result).toContain('au');
  });

  it('should format multiple dates responses', () => {
    const brief = createMockBrief([
      createMockQuestion(
        'date',
        'Dates disponibles',
        {
          structured_value: ['2024-03-15', '2024-03-20'],
        },
        { mode: 'multiple' }
      ),
    ]);
    const result = formatBriefForSummary(brief);

    expect(result).toContain('Dates disponibles:');
  });

  it('should format single selection responses', () => {
    const brief = createMockBrief([
      createMockQuestion(
        'selection',
        'Type de projet',
        { value: 'Site web' },
        { selection_type: 'dropdown', options: ['Site web', 'Application', 'Autre'] }
      ),
    ]);
    const result = formatBriefForSummary(brief);

    expect(result).toContain('Type de projet: Site web');
  });

  it('should format multiple selection responses', () => {
    const brief = createMockBrief([
      createMockQuestion(
        'selection',
        'Services souhaites',
        {
          structured_value: ['Design', 'Developpement'],
        },
        { selection_type: 'multiple', options: ['Design', 'Developpement', 'SEO'] }
      ),
    ]);
    const result = formatBriefForSummary(brief);

    expect(result).toContain('Services souhaites: Design, Developpement');
  });

  it('should skip structure blocks (title, description, separator)', () => {
    const brief = createMockBrief([
      createMockQuestion('title', 'Section 1'),
      createMockQuestion('description', 'Veuillez remplir ce formulaire'),
      createMockQuestion('separator', ''),
      createMockQuestion('text_short', 'Nom', { value: 'Test' }),
    ]);
    const result = formatBriefForSummary(brief);

    expect(result).not.toContain('Section 1:');
    expect(result).not.toContain('Veuillez remplir');
    expect(result).toContain('Nom: Test');
  });

  it('should show "(pas de reponse)" for unanswered questions', () => {
    const brief = createMockBrief([
      createMockQuestion('text_short', 'Question sans reponse', null),
    ]);
    const result = formatBriefForSummary(brief);

    expect(result).toContain('Question sans reponse: (pas de réponse)');
  });
});

describe('hasResponsesToSummarize', () => {
  it('should return true when there are data question responses', () => {
    const brief = createMockBrief([
      createMockQuestion('text_short', 'Nom', { value: 'Test' }),
    ]);

    expect(hasResponsesToSummarize(brief)).toBe(true);
  });

  it('should return false when there are no responses', () => {
    const brief = createMockBrief([
      createMockQuestion('text_short', 'Nom', null),
    ]);

    expect(hasResponsesToSummarize(brief)).toBe(false);
  });

  it('should return false when only structure blocks exist', () => {
    const brief = createMockBrief([
      createMockQuestion('title', 'Section'),
      createMockQuestion('description', 'Description'),
    ]);

    expect(hasResponsesToSummarize(brief)).toBe(false);
  });

  it('should return true when at least one data question has a response', () => {
    const brief = createMockBrief([
      createMockQuestion('title', 'Section'),
      createMockQuestion('text_short', 'Q1', null),
      createMockQuestion('text_short', 'Q2', { value: 'Reponse' }),
    ]);

    expect(hasResponsesToSummarize(brief)).toBe(true);
  });
});
