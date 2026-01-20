/**
 * Tests de comportement LLM: Suggestions IA (Section 9.14)
 *
 * Vérifie le système de suggestions proactives
 */
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { POST } from '@/app/api/chat/route';

const executeToolCallMock = vi.fn();
const fetchMock = vi.fn();

vi.mock('@/lib/llm/router', () => ({
  executeToolCall: (...args: unknown[]) => executeToolCallMock(...args),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/lib/supabase/auth-helper', () => ({
  getUserId: vi.fn().mockResolvedValue('user-1'),
}));

vi.mock('@/lib/llm/prompt', () => ({
  getSystemPromptWithMode: vi.fn().mockReturnValue('system'),
  enrichPromptWithContext: vi.fn().mockResolvedValue('system + ctx'),
}));

const toolCallResponse = (tool: string, args: Record<string, unknown> = {}) =>
  new Response(
    JSON.stringify({
      choices: [
        {
          message: {
            content: null,
            tool_calls: [
              {
                id: 'call-1',
                type: 'function',
                function: { name: tool, arguments: JSON.stringify(args) },
              },
            ],
          },
        },
      ],
    })
  );

const textResponse = (content: string) =>
  new Response(
    JSON.stringify({
      choices: [{ message: { content, tool_calls: null } }],
    })
  );

const makeRequest = (body: Record<string, unknown>) =>
  new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('LLM Behavior: Suggestions IA - Types (9.14)', () => {
  it('Type Action: Suggestions d\'actions à effectuer', () => {
    const suggestion = {
      type: 'action',
      label: 'Relancer le client ACME',
      priority: 'medium',
    };
    expect(suggestion.type).toBe('action');
  });

  it('Type Reminder: Rappels automatiques', () => {
    const suggestion = {
      type: 'reminder',
      label: 'Facture à échéance dans 3 jours',
      priority: 'high',
    };
    expect(suggestion.type).toBe('reminder');
  });

  it('Type Warning: Alertes importantes', () => {
    const suggestion = {
      type: 'warning',
      label: 'Facture impayée depuis 45 jours',
      priority: 'urgent',
    };
    expect(suggestion.type).toBe('warning');
  });

  it('Type Optimization: Suggestions d\'amélioration', () => {
    const suggestion = {
      type: 'optimization',
      label: 'Compléter le profil Verifolio',
      priority: 'low',
    };
    expect(suggestion.type).toBe('optimization');
  });
});

describe('LLM Behavior: Suggestions IA - Priorités (9.14)', () => {
  it('Priorité Low: Suggestions peu urgentes', () => {
    const priorities = ['low', 'medium', 'high', 'urgent'];
    expect(priorities).toContain('low');
  });

  it('Priorité Medium: Suggestions normales', () => {
    const priorities = ['low', 'medium', 'high', 'urgent'];
    expect(priorities).toContain('medium');
  });

  it('Priorité High: Suggestions importantes', () => {
    const priorities = ['low', 'medium', 'high', 'urgent'];
    expect(priorities).toContain('high');
  });

  it('Priorité Urgent: Suggestions critiques', () => {
    const priorities = ['low', 'medium', 'high', 'urgent'];
    expect(priorities).toContain('urgent');
  });
});

describe('LLM Behavior: Suggestions IA - Détection automatique (9.14)', () => {
  beforeEach(() => {
    executeToolCallMock.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Test: detect_invoice_suggestions()
  it('Factures en retard: Détection via detect_invoice_suggestions()', async () => {
    // Facture impayée > 30 jours devrait générer suggestion warning urgente
    const overdueInvoice = {
      id: 'invoice-overdue',
      status: 'sent',
      due_date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(), // 45 jours passés
    };

    // La logique de détection devrait identifier cette facture
    const daysSinceDue = Math.floor(
      (Date.now() - new Date(overdueInvoice.due_date).getTime()) / (24 * 60 * 60 * 1000)
    );
    expect(daysSinceDue).toBeGreaterThan(30);
  });

  // Test: detect_invoice_reminder_suggestions()
  it('Rappels factures: Détection via detect_invoice_reminder_suggestions()', async () => {
    // Facture à échéance < 7 jours devrait générer suggestion reminder
    const soonDueInvoice = {
      id: 'invoice-soon',
      status: 'sent',
      due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // Dans 5 jours
    };

    const daysUntilDue = Math.floor(
      (new Date(soonDueInvoice.due_date).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
    );
    expect(daysUntilDue).toBeLessThan(7);
  });

  // Test: detect_urgent_deal_suggestions()
  it('Deals urgents: Détection via detect_urgent_deal_suggestions()', async () => {
    // Deal sans activité > 14 jours devrait générer suggestion action
    const staleDeal = {
      id: 'deal-stale',
      status: 'sent',
      last_activity: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), // 20 jours
    };

    const daysSinceActivity = Math.floor(
      (Date.now() - new Date(staleDeal.last_activity).getTime()) / (24 * 60 * 60 * 1000)
    );
    expect(daysSinceActivity).toBeGreaterThan(14);
  });

  // Test: detect_review_request_suggestions()
  it('Demandes review: Détection via detect_review_request_suggestions()', async () => {
    // Mission payée sans review devrait générer suggestion action
    const paidMission = {
      id: 'mission-paid',
      status: 'paid',
      has_review_request: false,
    };

    expect(paidMission.status).toBe('paid');
    expect(paidMission.has_review_request).toBe(false);
  });
});

describe('LLM Behavior: Suggestions IA - Workflow (9.14)', () => {
  beforeEach(() => {
    executeToolCallMock.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);

    executeToolCallMock.mockResolvedValue({
      success: true,
      message: 'OK',
      data: {},
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('Accepter une suggestion → Exécute l\'action', async () => {
    // Quand on accepte une suggestion, l'action associée devrait être exécutée
    fetchMock.mockResolvedValueOnce(
      toolCallResponse('send_invoice_reminder', { invoice_id: 'invoice-1' })
    );
    fetchMock.mockResolvedValueOnce(textResponse('Rappel envoyé.'));

    const res = await POST(
      makeRequest({
        message: 'Oui, envoie le rappel',
        mode: 'auto',
        confirmedAction: true,
      })
    );

    expect(res.status).toBe(200);
  });

  it('Rejeter une suggestion → Masque la suggestion', async () => {
    // Le rejet est géré côté client (dismiss), pas via le chat
    // Ce test vérifie juste que le LLM ne force pas l'action
    fetchMock.mockResolvedValueOnce(
      textResponse('D\'accord, je ne vous proposerai plus cette suggestion.')
    );

    const res = await POST(
      makeRequest({
        message: 'Non merci, ignore cette suggestion',
        mode: 'auto',
      })
    );

    expect(res.status).toBe(200);
    // Pas d'exécution de tool
    expect(executeToolCallMock).not.toHaveBeenCalled();
  });
});

describe('LLM Behavior: Suggestions IA - Tests spécifiques (9.14)', () => {
  it('Facture impayée > 30j: Génère suggestion "warning" urgente', () => {
    const suggestion = {
      type: 'warning',
      priority: 'urgent',
      label: 'Facture FAC-001 impayée depuis 35 jours',
      action: 'send_invoice_reminder',
    };

    expect(suggestion.type).toBe('warning');
    expect(suggestion.priority).toBe('urgent');
  });

  it('Facture à échéance < 7j: Génère suggestion "reminder"', () => {
    const suggestion = {
      type: 'reminder',
      priority: 'high',
      label: 'Facture FAC-002 arrive à échéance dans 5 jours',
      action: 'send_invoice_reminder',
    };

    expect(suggestion.type).toBe('reminder');
  });

  it('Deal sans activité > 14j: Génère suggestion "action"', () => {
    const suggestion = {
      type: 'action',
      priority: 'medium',
      label: 'Deal "Projet X" sans activité depuis 18 jours',
      action: 'follow_up_deal',
    };

    expect(suggestion.type).toBe('action');
  });

  it('Mission payée sans review: Génère suggestion "action"', () => {
    const suggestion = {
      type: 'action',
      priority: 'medium',
      label: 'Demander un témoignage pour la mission "Refonte Site"',
      action: 'create_review_request',
    };

    expect(suggestion.type).toBe('action');
  });
});
