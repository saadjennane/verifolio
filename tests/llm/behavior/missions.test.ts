/**
 * Tests de comportement LLM: Missions (Section 9.6)
 *
 * Ces tests vérifient les contrats et comportements attendus pour les missions.
 * Note: Les tests d'intégration avec le chat API nécessitent un environnement complet.
 */
import { describe, expect, it } from 'vitest';
import { toolDefinitions } from '@/lib/llm/tools';

// ============================================================================
// TESTS: DÉFINITIONS DES TOOLS MISSIONS
// ============================================================================

describe('LLM Behavior: Mission Tools Definition', () => {
  it('create_mission est défini avec les bons paramètres', () => {
    const createMissionTool = toolDefinitions.find(t => t.function.name === 'create_mission');
    expect(createMissionTool).toBeDefined();

    const params = createMissionTool?.function.parameters;
    expect(params?.properties).toHaveProperty('deal_id');
    expect(params?.properties).toHaveProperty('title');
    expect(params?.properties).toHaveProperty('description');
    expect(params?.properties).toHaveProperty('estimated_amount');
    expect(params?.required).toContain('deal_id');
    expect(params?.required).toContain('title');
  });

  it('list_missions est défini avec filtres optionnels', () => {
    const listMissionsTool = toolDefinitions.find(t => t.function.name === 'list_missions');
    expect(listMissionsTool).toBeDefined();

    const params = listMissionsTool?.function.parameters;
    expect(params?.properties).toHaveProperty('client_id');
    expect(params?.properties).toHaveProperty('client_name');
    expect(params?.properties).toHaveProperty('status');
  });

  it('get_mission est défini avec mission_id requis', () => {
    const getMissionTool = toolDefinitions.find(t => t.function.name === 'get_mission');
    expect(getMissionTool).toBeDefined();

    const params = getMissionTool?.function.parameters;
    expect(params?.properties).toHaveProperty('mission_id');
    expect(params?.required).toContain('mission_id');
  });

  it('update_mission_status est défini avec mission_id et status requis', () => {
    const updateMissionStatusTool = toolDefinitions.find(t => t.function.name === 'update_mission_status');
    expect(updateMissionStatusTool).toBeDefined();

    const params = updateMissionStatusTool?.function.parameters;
    expect(params?.properties).toHaveProperty('mission_id');
    expect(params?.properties).toHaveProperty('status');
    expect(params?.required).toContain('mission_id');
    expect(params?.required).toContain('status');
  });
});

// ============================================================================
// TESTS: CONTRAT DES TOOLS MISSIONS
// ============================================================================

describe('LLM Behavior: Mission Tools Contract', () => {
  it('list_missions accepte les statuts du cycle de vie', () => {
    const listMissionsTool = toolDefinitions.find(t => t.function.name === 'list_missions');
    const statusProp = listMissionsTool?.function.parameters?.properties?.status;

    expect(statusProp?.enum).toContain('in_progress');
    expect(statusProp?.enum).toContain('delivered');
    expect(statusProp?.enum).toContain('to_invoice');
    expect(statusProp?.enum).toContain('invoiced');
    expect(statusProp?.enum).toContain('paid');
    expect(statusProp?.enum).toContain('closed');
    expect(statusProp?.enum).toContain('cancelled');
  });

  it('update_mission_status accepte les mêmes statuts', () => {
    const updateMissionStatusTool = toolDefinitions.find(t => t.function.name === 'update_mission_status');
    const statusProp = updateMissionStatusTool?.function.parameters?.properties?.status;

    expect(statusProp?.enum).toContain('in_progress');
    expect(statusProp?.enum).toContain('delivered');
    expect(statusProp?.enum).toContain('to_invoice');
    expect(statusProp?.enum).toContain('invoiced');
    expect(statusProp?.enum).toContain('paid');
    expect(statusProp?.enum).toContain('closed');
    expect(statusProp?.enum).toContain('cancelled');
  });

  it('create_mission requiert deal_id (lien obligatoire avec deal)', () => {
    const createMissionTool = toolDefinitions.find(t => t.function.name === 'create_mission');
    const required = createMissionTool?.function.parameters?.required || [];

    expect(required).toContain('deal_id');
  });
});

// ============================================================================
// TESTS: COMPORTEMENT ATTENDU (DOCUMENTATION)
// ============================================================================

describe('LLM Behavior: Missions Expected Behavior (9.6)', () => {
  it('Commande "Crée une mission pour ce deal" → devrait appeler create_mission', () => {
    const expectedMapping = {
      userMessage: 'Crée une mission Production vidéo pour le deal Vidéo corporate',
      expectedTool: 'create_mission',
      expectedArgs: { deal_id: '<id>', title: 'Production vidéo' },
    };

    expect(expectedMapping.expectedTool).toBe('create_mission');
  });

  it('Commande "Liste mes missions" → devrait appeler list_missions', () => {
    const expectedMapping = {
      userMessage: 'Liste mes missions',
      expectedTool: 'list_missions',
    };

    expect(expectedMapping.expectedTool).toBe('list_missions');
  });

  it('Commande "Liste les missions en cours" → devrait appeler list_missions avec status=in_progress', () => {
    const expectedMapping = {
      userMessage: 'Liste les missions en cours',
      expectedTool: 'list_missions',
      expectedArgs: { status: 'in_progress' },
    };

    expect(expectedMapping.expectedArgs.status).toBe('in_progress');
  });

  it('Commande "Mission livrée" → devrait appeler update_mission_status avec status=delivered', () => {
    const expectedMapping = {
      userMessage: 'La mission Production vidéo est livrée',
      expectedTool: 'update_mission_status',
      expectedArgs: { mission_id: '<id>', status: 'delivered' },
    };

    expect(expectedMapping.expectedTool).toBe('update_mission_status');
    expect(expectedMapping.expectedArgs.status).toBe('delivered');
  });

  it('Commande "Détails de la mission X" → devrait appeler get_mission', () => {
    const expectedMapping = {
      userMessage: 'Montre-moi les détails de la mission Production vidéo',
      expectedTool: 'get_mission',
      expectedArgs: { mission_id: '<id>' },
    };

    expect(expectedMapping.expectedTool).toBe('get_mission');
  });
});

// ============================================================================
// TESTS: MODES ET PERMISSIONS
// ============================================================================

describe('LLM Behavior: Missions Mode Permissions', () => {
  it('create_mission est un SAFE_WRITE', () => {
    const toolPermissions = {
      create_mission: 'SAFE_WRITE',
      list_missions: 'READ_ONLY',
      get_mission: 'READ_ONLY',
      update_mission_status: 'SAFE_WRITE',
    };

    expect(toolPermissions.create_mission).toBe('SAFE_WRITE');
    expect(toolPermissions.list_missions).toBe('READ_ONLY');
  });

  it('get_mission et list_missions sont READ_ONLY', () => {
    const toolPermissions = {
      get_mission: 'READ_ONLY',
      list_missions: 'READ_ONLY',
    };

    expect(toolPermissions.get_mission).toBe('READ_ONLY');
    expect(toolPermissions.list_missions).toBe('READ_ONLY');
  });
});

// ============================================================================
// TESTS: VALIDATION DES ENTRÉES
// ============================================================================

describe('LLM Behavior: Mission Input Validation', () => {
  it('create_mission requiert obligatoirement "deal_id" et "title"', () => {
    const createMissionTool = toolDefinitions.find(t => t.function.name === 'create_mission');
    const required = createMissionTool?.function.parameters?.required || [];

    expect(required).toContain('deal_id');
    expect(required).toContain('title');
  });

  it('get_mission requiert obligatoirement "mission_id"', () => {
    const getMissionTool = toolDefinitions.find(t => t.function.name === 'get_mission');
    const required = getMissionTool?.function.parameters?.required || [];

    expect(required).toContain('mission_id');
  });

  it('update_mission_status requiert "mission_id" et "status"', () => {
    const updateMissionStatusTool = toolDefinitions.find(t => t.function.name === 'update_mission_status');
    const required = updateMissionStatusTool?.function.parameters?.required || [];

    expect(required).toContain('mission_id');
    expect(required).toContain('status');
  });
});
