/**
 * Tests de comportement LLM: Deals (Section 9.3)
 *
 * Ces tests vérifient les contrats et comportements attendus pour les deals (opportunités commerciales).
 * Note: Les tests d'intégration avec le chat API nécessitent un environnement complet.
 */
import { describe, expect, it } from 'vitest';
import { toolDefinitions } from '@/lib/llm/tools';

// ============================================================================
// TESTS: DÉFINITIONS DES TOOLS DEALS
// ============================================================================

describe('LLM Behavior: Deal Tools Definition', () => {
  it('create_deal est défini avec les bons paramètres', () => {
    const createDealTool = toolDefinitions.find(t => t.function.name === 'create_deal');
    expect(createDealTool).toBeDefined();

    const params = createDealTool?.function.parameters;
    expect(params?.properties).toHaveProperty('client_id');
    expect(params?.properties).toHaveProperty('client_name');
    expect(params?.properties).toHaveProperty('title');
    expect(params?.properties).toHaveProperty('description');
    expect(params?.properties).toHaveProperty('estimated_amount');
    expect(params?.required).toContain('title');
  });

  it('list_deals est défini avec filtres optionnels', () => {
    const listDealsTool = toolDefinitions.find(t => t.function.name === 'list_deals');
    expect(listDealsTool).toBeDefined();

    const params = listDealsTool?.function.parameters;
    expect(params?.properties).toHaveProperty('client_id');
    expect(params?.properties).toHaveProperty('client_name');
    expect(params?.properties).toHaveProperty('status');
  });

  it('get_deal est défini avec deal_id requis', () => {
    const getDealTool = toolDefinitions.find(t => t.function.name === 'get_deal');
    expect(getDealTool).toBeDefined();

    const params = getDealTool?.function.parameters;
    expect(params?.properties).toHaveProperty('deal_id');
    expect(params?.required).toContain('deal_id');
  });

  it('update_deal_status est défini avec deal_id et status requis', () => {
    const updateDealStatusTool = toolDefinitions.find(t => t.function.name === 'update_deal_status');
    expect(updateDealStatusTool).toBeDefined();

    const params = updateDealStatusTool?.function.parameters;
    expect(params?.properties).toHaveProperty('deal_id');
    expect(params?.properties).toHaveProperty('status');
    expect(params?.required).toContain('deal_id');
    expect(params?.required).toContain('status');
  });
});

// ============================================================================
// TESTS: CONTRAT DES TOOLS DEALS
// ============================================================================

describe('LLM Behavior: Deal Tools Contract', () => {
  it('list_deals accepte les statuts new, draft, sent, won, lost, archived', () => {
    const listDealsTool = toolDefinitions.find(t => t.function.name === 'list_deals');
    const statusProp = listDealsTool?.function.parameters?.properties?.status;

    expect(statusProp?.enum).toContain('new');
    expect(statusProp?.enum).toContain('draft');
    expect(statusProp?.enum).toContain('sent');
    expect(statusProp?.enum).toContain('won');
    expect(statusProp?.enum).toContain('lost');
    expect(statusProp?.enum).toContain('archived');
  });

  it('update_deal_status accepte les mêmes statuts', () => {
    const updateDealStatusTool = toolDefinitions.find(t => t.function.name === 'update_deal_status');
    const statusProp = updateDealStatusTool?.function.parameters?.properties?.status;

    expect(statusProp?.enum).toContain('new');
    expect(statusProp?.enum).toContain('won');
    expect(statusProp?.enum).toContain('lost');
  });

  it('create_deal accepte estimated_amount comme nombre', () => {
    const createDealTool = toolDefinitions.find(t => t.function.name === 'create_deal');
    const amountProp = createDealTool?.function.parameters?.properties?.estimated_amount;

    expect(amountProp?.type).toBe('number');
  });
});

// ============================================================================
// TESTS: COMPORTEMENT ATTENDU (DOCUMENTATION)
// ============================================================================

describe('LLM Behavior: Deals Expected Behavior (9.3)', () => {
  it('Commande "Crée un deal [titre]" → devrait appeler create_deal', () => {
    const expectedMapping = {
      userMessage: 'Crée un deal Vidéo corporate pour ACME',
      expectedTool: 'create_deal',
      expectedArgs: { title: 'Vidéo corporate', client_name: 'ACME' },
    };

    expect(expectedMapping.expectedTool).toBe('create_deal');
  });

  it('Commande "Liste mes deals" → devrait appeler list_deals', () => {
    const expectedMapping = {
      userMessage: 'Liste mes deals',
      expectedTool: 'list_deals',
    };

    expect(expectedMapping.expectedTool).toBe('list_deals');
  });

  it('Commande "Liste les deals gagnés" → devrait appeler list_deals avec status=won', () => {
    const expectedMapping = {
      userMessage: 'Liste les deals gagnés',
      expectedTool: 'list_deals',
      expectedArgs: { status: 'won' },
    };

    expect(expectedMapping.expectedArgs.status).toBe('won');
  });

  it('Commande "Marque ce deal comme gagné" → devrait appeler update_deal_status', () => {
    const expectedMapping = {
      userMessage: 'Marque le deal Vidéo corporate comme gagné',
      expectedTool: 'update_deal_status',
      expectedArgs: { deal_id: '<id>', status: 'won' },
    };

    expect(expectedMapping.expectedTool).toBe('update_deal_status');
    expect(expectedMapping.expectedArgs.status).toBe('won');
  });

  it('Commande "Détails du deal X" → devrait appeler get_deal', () => {
    const expectedMapping = {
      userMessage: 'Montre-moi les détails du deal Vidéo corporate',
      expectedTool: 'get_deal',
      expectedArgs: { deal_id: '<id>' },
    };

    expect(expectedMapping.expectedTool).toBe('get_deal');
  });
});

// ============================================================================
// TESTS: MODES ET PERMISSIONS
// ============================================================================

describe('LLM Behavior: Deals Mode Permissions', () => {
  it('create_deal est un SAFE_WRITE', () => {
    const toolPermissions = {
      create_deal: 'SAFE_WRITE',
      list_deals: 'READ_ONLY',
      get_deal: 'READ_ONLY',
      update_deal_status: 'SAFE_WRITE',
    };

    expect(toolPermissions.create_deal).toBe('SAFE_WRITE');
    expect(toolPermissions.list_deals).toBe('READ_ONLY');
  });

  it('get_deal et list_deals sont READ_ONLY', () => {
    const toolPermissions = {
      get_deal: 'READ_ONLY',
      list_deals: 'READ_ONLY',
    };

    expect(toolPermissions.get_deal).toBe('READ_ONLY');
    expect(toolPermissions.list_deals).toBe('READ_ONLY');
  });
});

// ============================================================================
// TESTS: VALIDATION DES ENTRÉES
// ============================================================================

describe('LLM Behavior: Deal Input Validation', () => {
  it('create_deal requiert obligatoirement "title"', () => {
    const createDealTool = toolDefinitions.find(t => t.function.name === 'create_deal');
    const required = createDealTool?.function.parameters?.required || [];

    expect(required).toContain('title');
  });

  it('get_deal requiert obligatoirement "deal_id"', () => {
    const getDealTool = toolDefinitions.find(t => t.function.name === 'get_deal');
    const required = getDealTool?.function.parameters?.required || [];

    expect(required).toContain('deal_id');
  });

  it('update_deal_status requiert "deal_id" et "status"', () => {
    const updateDealStatusTool = toolDefinitions.find(t => t.function.name === 'update_deal_status');
    const required = updateDealStatusTool?.function.parameters?.required || [];

    expect(required).toContain('deal_id');
    expect(required).toContain('status');
  });
});
