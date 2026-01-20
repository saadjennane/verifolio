/**
 * Tests unitaires des tools LLM
 * Phase 1 du plan de tests automatiques
 *
 * Ces tests vérifient:
 * 1. La structure des réponses (ToolResult)
 * 2. Les validations d'entrée (paramètres requis)
 * 3. Les appels corrects aux fonctions
 *
 * Note: Les tests de création complète avec Supabase nécessitent
 * des tests d'intégration avec une vraie base de données.
 */
import { describe, expect, it, vi } from 'vitest';
import { executeToolCall } from '@/lib/llm/router';
import type { ToolName } from '@/lib/llm/tools';

// Mock de logActivity
vi.mock('@/lib/activity', () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
}));

// Mock de generateDocNumber
vi.mock('@/lib/numbering/generateDocNumber', () => ({
  generateDocNumber: vi.fn().mockResolvedValue('DOC-001'),
  DEFAULT_PATTERNS: {
    quote: 'DEV-{YYYY}-{NNN}',
    invoice: 'FAC-{YYYY}-{NNN}',
    mission: 'MIS-{YYYY}-{NNN}',
    proposal: 'PROP-{YYYY}-{NNN}',
    brief: 'BRIEF-{YYYY}-{NNN}',
  },
}));

const TEST_USER_ID = 'test-user-123';

/**
 * Crée un mock Supabase minimaliste pour les tests
 */
const createMockSupabase = (tableConfig: Record<string, {
  selectData?: unknown[];
  singleData?: unknown;
  insertData?: unknown;
  error?: unknown;
}> = {}) => {
  return {
    from: vi.fn((tableName: string) => {
      const config = tableConfig[tableName] || {};
      const selectData = config.selectData || [];
      const singleData = config.singleData || null;
      const insertData = config.insertData || singleData;
      const error = config.error || null;

      const createBuilder = (pendingData: unknown = selectData, isInsertChain = false) => {
        const builder: Record<string, unknown> = {};

        builder.select = vi.fn(() => createBuilder(isInsertChain ? insertData : pendingData, isInsertChain));

        ['eq', 'neq', 'in', 'is', 'ilike', 'gte', 'lte', 'or', 'order', 'limit', 'range'].forEach(method => {
          builder[method] = vi.fn(() => createBuilder(pendingData, isInsertChain));
        });

        builder.insert = vi.fn(() => createBuilder(insertData, true));
        builder.update = vi.fn(() => createBuilder(singleData, true));
        builder.delete = vi.fn(() => createBuilder(null, false));
        builder.upsert = vi.fn(() => createBuilder(insertData, true));

        builder.single = vi.fn().mockResolvedValue({
          data: isInsertChain ? insertData : singleData,
          error
        });
        builder.maybeSingle = vi.fn().mockResolvedValue({
          data: isInsertChain ? insertData : singleData,
          error
        });

        const resultData = isInsertChain ? insertData : pendingData;
        builder.then = (resolve: (v: unknown) => unknown) =>
          Promise.resolve({
            data: resultData,
            error,
            count: Array.isArray(resultData) ? resultData.length : 0
          }).then(resolve);
        builder.catch = (reject: (e: unknown) => unknown) =>
          Promise.resolve({ data: resultData, error }).catch(reject);

        return builder;
      };

      return createBuilder();
    }),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
};

// ============================================================================
// TESTS: STRUCTURE DES RÉSULTATS
// ============================================================================

describe('Tool Result Structure', () => {
  it('les résultats ont la structure ToolResult (success, message)', async () => {
    const supabase = createMockSupabase({
      clients: { selectData: [] },
    });

    const result = await executeToolCall(
      supabase as never,
      TEST_USER_ID,
      'list_clients' as ToolName,
      {}
    );

    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('message');
    expect(typeof result.success).toBe('boolean');
    expect(typeof result.message).toBe('string');
  });

  it('le résultat inclut data quand success=true', async () => {
    const mockClients = [{ id: 'client-1', nom: 'Client A' }];
    const supabase = createMockSupabase({
      clients: { selectData: mockClients },
    });

    const result = await executeToolCall(
      supabase as never,
      TEST_USER_ID,
      'list_clients' as ToolName,
      {}
    );

    expect(result.success).toBe(true);
    expect(result).toHaveProperty('data');
  });
});

// ============================================================================
// TESTS: CLIENTS
// ============================================================================

describe('Tool: create_client', () => {
  it('crée un client avec type et nom', async () => {
    const mockClient = {
      id: 'client-1',
      nom: 'Jean Dupont',
      type: 'particulier',
      user_id: TEST_USER_ID,
    };

    const supabase = createMockSupabase({
      clients: {
        insertData: mockClient,
        singleData: mockClient,
      },
    });

    const result = await executeToolCall(
      supabase as never,
      TEST_USER_ID,
      'create_client' as ToolName,
      { nom: 'Jean Dupont', type: 'particulier' }
    );

    expect(result.success).toBe(true);
    expect(result.message).toContain('Jean Dupont');
    expect(result.data).toMatchObject({ nom: 'Jean Dupont', type: 'particulier' });
  });

  it('retourne une erreur si nom manquant', async () => {
    const supabase = createMockSupabase({});

    const result = await executeToolCall(
      supabase as never,
      TEST_USER_ID,
      'create_client' as ToolName,
      { type: 'particulier' }
    );

    expect(result.success).toBe(false);
    expect(result.message).toBeTruthy();
  });

  it('retourne une erreur si type manquant', async () => {
    const supabase = createMockSupabase({});

    const result = await executeToolCall(
      supabase as never,
      TEST_USER_ID,
      'create_client' as ToolName,
      { nom: 'Test Client' }
    );

    expect(result.success).toBe(false);
    expect(result.message).toBeTruthy();
  });
});

describe('Tool: list_clients', () => {
  it('retourne la liste des clients', async () => {
    const mockClients = [
      { id: 'client-1', nom: 'Client A', type: 'particulier' },
      { id: 'client-2', nom: 'Client B', type: 'entreprise' },
    ];

    const supabase = createMockSupabase({
      clients: { selectData: mockClients },
    });

    const result = await executeToolCall(
      supabase as never,
      TEST_USER_ID,
      'list_clients' as ToolName,
      {}
    );

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
  });

  it('retourne liste vide si aucun client', async () => {
    const supabase = createMockSupabase({
      clients: { selectData: [] },
    });

    const result = await executeToolCall(
      supabase as never,
      TEST_USER_ID,
      'list_clients' as ToolName,
      {}
    );

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(0);
  });
});

describe('Tool: update_client', () => {
  it('met à jour un client existant', async () => {
    const updatedClient = {
      id: 'client-1',
      nom: 'Jean Dupont Modifié',
      type: 'particulier',
    };

    const supabase = createMockSupabase({
      clients: {
        singleData: updatedClient,
        selectData: [updatedClient],
      },
    });

    const result = await executeToolCall(
      supabase as never,
      TEST_USER_ID,
      'update_client' as ToolName,
      { client_id: 'client-1', nom: 'Jean Dupont Modifié' }
    );

    expect(result.success).toBe(true);
  });

  it('retourne erreur si client_id manquant', async () => {
    const supabase = createMockSupabase({});

    const result = await executeToolCall(
      supabase as never,
      TEST_USER_ID,
      'update_client' as ToolName,
      { nom: 'Test' }
    );

    expect(result.success).toBe(false);
  });
});

// ============================================================================
// TESTS: CONTACTS
// ============================================================================

describe('Tool: create_contact', () => {
  it('requiert un nom pour créer un contact', async () => {
    const supabase = createMockSupabase({});

    const result = await executeToolCall(
      supabase as never,
      TEST_USER_ID,
      'create_contact' as ToolName,
      { email: 'test@test.com' }
    );

    expect(result.success).toBe(false);
  });

  it('retourne une structure ToolResult valide', async () => {
    const supabase = createMockSupabase({
      contacts: {
        insertData: { id: 'contact-1', name: 'Test' },
        singleData: { id: 'contact-1', name: 'Test' },
      },
    });

    const result = await executeToolCall(
      supabase as never,
      TEST_USER_ID,
      'create_contact' as ToolName,
      { name: 'Test Contact' }
    );

    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('message');
  });
});

describe('Tool: list_contacts', () => {
  it('retourne la liste des contacts', async () => {
    const mockContacts = [
      { id: 'contact-1', name: 'Contact A', client: { nom: 'Client A' } },
      { id: 'contact-2', name: 'Contact B', client: { nom: 'Client B' } },
    ];

    const supabase = createMockSupabase({
      contacts: { selectData: mockContacts },
    });

    const result = await executeToolCall(
      supabase as never,
      TEST_USER_ID,
      'list_contacts' as ToolName,
      {}
    );

    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
  });
});

// ============================================================================
// TESTS: DEALS
// ============================================================================

describe('Tool: create_deal', () => {
  it('retourne erreur si title manquant', async () => {
    const supabase = createMockSupabase({});

    const result = await executeToolCall(
      supabase as never,
      TEST_USER_ID,
      'create_deal' as ToolName,
      { estimated_amount: 5000 }
    );

    expect(result.success).toBe(false);
  });

  it('retourne une structure ToolResult valide', async () => {
    const mockDeal = {
      id: 'deal-1',
      title: 'Nouveau projet',
      status: 'lead',
      user_id: TEST_USER_ID,
    };

    const supabase = createMockSupabase({
      deals: {
        insertData: mockDeal,
        singleData: mockDeal,
      },
    });

    const result = await executeToolCall(
      supabase as never,
      TEST_USER_ID,
      'create_deal' as ToolName,
      { title: 'Nouveau projet' }
    );

    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('message');
  });
});

describe('Tool: update_deal_status', () => {
  it('met à jour le statut d\'un deal', async () => {
    const updatedDeal = {
      id: 'deal-1',
      title: 'Deal Test',
      status: 'won',
    };

    const supabase = createMockSupabase({
      deals: { singleData: updatedDeal },
    });

    const result = await executeToolCall(
      supabase as never,
      TEST_USER_ID,
      'update_deal_status' as ToolName,
      { deal_id: 'deal-1', status: 'won' }
    );

    expect(result.success).toBe(true);
  });

  it('retourne erreur si deal_id manquant', async () => {
    const supabase = createMockSupabase({});

    const result = await executeToolCall(
      supabase as never,
      TEST_USER_ID,
      'update_deal_status' as ToolName,
      { status: 'won' }
    );

    expect(result.success).toBe(false);
  });
});

describe('Tool: list_deals', () => {
  it('retourne la liste des deals', async () => {
    const mockDeals = [
      { id: 'deal-1', title: 'Deal A', status: 'lead' },
      { id: 'deal-2', title: 'Deal B', status: 'won' },
    ];

    const supabase = createMockSupabase({
      deals: { selectData: mockDeals },
    });

    const result = await executeToolCall(
      supabase as never,
      TEST_USER_ID,
      'list_deals' as ToolName,
      {}
    );

    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
  });
});

// ============================================================================
// TESTS: QUOTES (DEVIS)
// ============================================================================

describe('Tool: create_quote', () => {
  it('retourne erreur si ni client_id ni deal_id fourni', async () => {
    const supabase = createMockSupabase({});

    const result = await executeToolCall(
      supabase as never,
      TEST_USER_ID,
      'create_quote' as ToolName,
      {}
    );

    expect(result.success).toBe(false);
  });
});

describe('Tool: list_quotes', () => {
  it('retourne la liste des devis', async () => {
    const mockQuotes = [
      { id: 'quote-1', numero: 'DEV-001', status: 'draft' },
      { id: 'quote-2', numero: 'DEV-002', status: 'sent' },
    ];

    const supabase = createMockSupabase({
      quotes: { selectData: mockQuotes },
    });

    const result = await executeToolCall(
      supabase as never,
      TEST_USER_ID,
      'list_quotes' as ToolName,
      {}
    );

    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
  });
});

// ============================================================================
// TESTS: INVOICES (FACTURES)
// ============================================================================

describe('Tool: create_invoice', () => {
  it('retourne erreur si ni client_id ni quote_id fourni', async () => {
    const supabase = createMockSupabase({});

    const result = await executeToolCall(
      supabase as never,
      TEST_USER_ID,
      'create_invoice' as ToolName,
      {}
    );

    expect(result.success).toBe(false);
  });
});

describe('Tool: mark_invoice_paid', () => {
  it('marque une facture comme payée', async () => {
    const mockInvoice = {
      id: 'invoice-1',
      status: 'paid',
      paid_at: new Date().toISOString(),
    };

    const supabase = createMockSupabase({
      invoices: { singleData: mockInvoice },
    });

    const result = await executeToolCall(
      supabase as never,
      TEST_USER_ID,
      'mark_invoice_paid' as ToolName,
      { invoice_id: 'invoice-1' }
    );

    expect(result.success).toBe(true);
  });

  it('retourne erreur si invoice_id manquant', async () => {
    const supabase = createMockSupabase({});

    const result = await executeToolCall(
      supabase as never,
      TEST_USER_ID,
      'mark_invoice_paid' as ToolName,
      {}
    );

    expect(result.success).toBe(false);
  });
});

describe('Tool: list_invoices', () => {
  it('retourne la liste des factures', async () => {
    const mockInvoices = [
      { id: 'invoice-1', numero: 'FAC-001', status: 'draft' },
      { id: 'invoice-2', numero: 'FAC-002', status: 'paid' },
    ];

    const supabase = createMockSupabase({
      invoices: { selectData: mockInvoices },
    });

    const result = await executeToolCall(
      supabase as never,
      TEST_USER_ID,
      'list_invoices' as ToolName,
      {}
    );

    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
  });
});

// ============================================================================
// TESTS: MISSIONS
// ============================================================================

describe('Tool: create_mission', () => {
  it('retourne erreur si ni title ni deal_id fourni', async () => {
    const supabase = createMockSupabase({});

    const result = await executeToolCall(
      supabase as never,
      TEST_USER_ID,
      'create_mission' as ToolName,
      {}
    );

    expect(result.success).toBe(false);
  });
});

describe('Tool: list_missions', () => {
  it('retourne la liste des missions', async () => {
    const mockMissions = [
      { id: 'mission-1', title: 'Mission A', status: 'active' },
      { id: 'mission-2', title: 'Mission B', status: 'completed' },
    ];

    const supabase = createMockSupabase({
      missions: { selectData: mockMissions },
    });

    const result = await executeToolCall(
      supabase as never,
      TEST_USER_ID,
      'list_missions' as ToolName,
      {}
    );

    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
  });
});

// ============================================================================
// TESTS: PROPOSALS
// ============================================================================

describe('Tool: create_proposal', () => {
  it('retourne erreur si title manquant', async () => {
    const supabase = createMockSupabase({});

    const result = await executeToolCall(
      supabase as never,
      TEST_USER_ID,
      'create_proposal' as ToolName,
      { deal_id: 'deal-1' }
    );

    expect(result.success).toBe(false);
  });
});

describe('Tool: set_proposal_status', () => {
  it('met à jour le statut d\'une proposition', async () => {
    const mockProposal = {
      id: 'proposal-1',
      status: 'sent',
    };

    const supabase = createMockSupabase({
      proposals: { singleData: mockProposal },
    });

    const result = await executeToolCall(
      supabase as never,
      TEST_USER_ID,
      'set_proposal_status' as ToolName,
      { proposal_id: 'proposal-1', status: 'sent' }
    );

    expect(result.success).toBe(true);
  });
});

// ============================================================================
// TESTS: BRIEFS
// ============================================================================

describe('Tool: create_brief', () => {
  it('retourne erreur si title manquant', async () => {
    const supabase = createMockSupabase({});

    const result = await executeToolCall(
      supabase as never,
      TEST_USER_ID,
      'create_brief' as ToolName,
      {}
    );

    expect(result.success).toBe(false);
  });
});

// ============================================================================
// TESTS: REVIEWS
// ============================================================================

describe('Tool: create_review_request', () => {
  it('retourne erreur si invoice_id manquant', async () => {
    const supabase = createMockSupabase({});

    const result = await executeToolCall(
      supabase as never,
      TEST_USER_ID,
      'create_review_request' as ToolName,
      {}
    );

    expect(result.success).toBe(false);
  });
});

// ============================================================================
// TESTS: FINANCIAL SUMMARY
// ============================================================================

describe('Tool: get_financial_summary', () => {
  it('retourne un résumé financier', async () => {
    const supabase = createMockSupabase({
      invoices: {
        selectData: [
          { id: 'inv-1', status: 'paid', total_ttc: 1000 },
          { id: 'inv-2', status: 'sent', total_ttc: 500 },
        ],
      },
      quotes: {
        selectData: [
          { id: 'quote-1', status: 'accepted', total_ttc: 2000 },
        ],
      },
    });

    const result = await executeToolCall(
      supabase as never,
      TEST_USER_ID,
      'get_financial_summary' as ToolName,
      {}
    );

    // Le tool devrait retourner une structure valide
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('message');
  });
});

// ============================================================================
// TESTS: CUSTOM FIELDS
// ============================================================================

describe('Tool: create_custom_field', () => {
  it('retourne erreur si name manquant', async () => {
    const supabase = createMockSupabase({});

    const result = await executeToolCall(
      supabase as never,
      TEST_USER_ID,
      'create_custom_field' as ToolName,
      { field_type: 'text', entity_type: 'client' }
    );

    expect(result.success).toBe(false);
  });

  it('retourne erreur si field_type manquant', async () => {
    const supabase = createMockSupabase({});

    const result = await executeToolCall(
      supabase as never,
      TEST_USER_ID,
      'create_custom_field' as ToolName,
      { name: 'Source', entity_type: 'client' }
    );

    expect(result.success).toBe(false);
  });
});

// ============================================================================
// TESTS: ERROR HANDLING
// ============================================================================

describe('Error Handling', () => {
  it('gère les erreurs Supabase gracieusement', async () => {
    const supabase = createMockSupabase({
      clients: {
        selectData: [],
        error: { message: 'Database connection failed' },
      },
    });

    const result = await executeToolCall(
      supabase as never,
      TEST_USER_ID,
      'list_clients' as ToolName,
      {}
    );

    // L'erreur devrait être gérée et non pas lever une exception
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('message');
  });

  it('retourne success=false pour un tool inconnu', async () => {
    const supabase = createMockSupabase({});

    const result = await executeToolCall(
      supabase as never,
      TEST_USER_ID,
      'tool_inexistant' as ToolName,
      {}
    );

    expect(result.success).toBe(false);
  });
});

// ============================================================================
// TESTS: TOOL NAMES
// ============================================================================

describe('Tool Names', () => {
  const validTools: ToolName[] = [
    'list_clients',
    'list_contacts',
    'list_deals',
    'list_quotes',
    'list_invoices',
    'list_missions',
  ];

  validTools.forEach(toolName => {
    it(`${toolName} est un tool valide qui retourne une structure ToolResult`, async () => {
      const supabase = createMockSupabase({
        clients: { selectData: [] },
        contacts: { selectData: [] },
        deals: { selectData: [] },
        quotes: { selectData: [] },
        invoices: { selectData: [] },
        missions: { selectData: [] },
      });

      const result = await executeToolCall(
        supabase as never,
        TEST_USER_ID,
        toolName,
        {}
      );

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
      expect(typeof result.success).toBe('boolean');
    });
  });
});
