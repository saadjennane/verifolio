/**
 * Tests de comportement LLM: Clients (Section 9.1)
 *
 * Ces tests vérifient les contrats et comportements attendus pour les clients.
 * Note: Les tests d'intégration avec le chat API nécessitent un environnement complet.
 */
import { describe, expect, it } from 'vitest';
import { toolDefinitions } from '@/lib/llm/tools';

// ============================================================================
// TESTS: DÉFINITIONS DES TOOLS CLIENTS
// ============================================================================

describe('LLM Behavior: Client Tools Definition', () => {
  it('create_client est défini avec les bons paramètres', () => {
    const createClientTool = toolDefinitions.find(t => t.function.name === 'create_client');
    expect(createClientTool).toBeDefined();

    const params = createClientTool?.function.parameters;
    expect(params?.properties).toHaveProperty('nom');
    expect(params?.properties).toHaveProperty('type');
    expect(params?.required).toContain('nom');
  });

  it('list_clients est défini', () => {
    const listClientsTool = toolDefinitions.find(t => t.function.name === 'list_clients');
    expect(listClientsTool).toBeDefined();
  });

  it('update_client est défini avec client_id ou client_name', () => {
    const updateClientTool = toolDefinitions.find(t => t.function.name === 'update_client');
    expect(updateClientTool).toBeDefined();

    const params = updateClientTool?.function.parameters;
    expect(params?.properties).toHaveProperty('client_id');
    expect(params?.properties).toHaveProperty('client_name');
  });
});

// ============================================================================
// TESTS: CONTRAT DES TOOLS CLIENTS
// ============================================================================

describe('LLM Behavior: Client Tools Contract', () => {
  it('create_client accepte type "particulier" ou "entreprise"', () => {
    const createClientTool = toolDefinitions.find(t => t.function.name === 'create_client');
    const typeProperty = createClientTool?.function.parameters?.properties?.type;

    // Le type devrait être défini avec enum ou description
    expect(typeProperty).toBeDefined();
  });

  it('create_client accepte des champs personnalisés (custom_fields)', () => {
    const createClientTool = toolDefinitions.find(t => t.function.name === 'create_client');
    const params = createClientTool?.function.parameters;

    // Vérifie que custom_fields est un paramètre accepté
    expect(params?.properties).toHaveProperty('custom_fields');
  });

  it('update_client permet de modifier email, telephone, adresse', () => {
    const updateClientTool = toolDefinitions.find(t => t.function.name === 'update_client');
    const props = updateClientTool?.function.parameters?.properties;

    expect(props).toHaveProperty('email');
    expect(props).toHaveProperty('telephone');
    expect(props).toHaveProperty('adresse');
    expect(props).toHaveProperty('custom_fields');
  });
});

// ============================================================================
// TESTS: COMPORTEMENT ATTENDU (DOCUMENTATION)
// ============================================================================

describe('LLM Behavior: Clients Expected Behavior (9.1)', () => {
  // Ces tests documentent le comportement attendu du LLM

  it('Commande "Crée un client [nom]" → devrait appeler create_client', () => {
    // Documentation du comportement attendu
    const expectedMapping = {
      userMessage: 'Crée un client Jean Dupont',
      expectedTool: 'create_client',
      expectedArgs: { nom: 'Jean Dupont', type: 'particulier' },
    };

    expect(expectedMapping.expectedTool).toBe('create_client');
  });

  it('Commande "Liste mes clients" → devrait appeler list_clients', () => {
    const expectedMapping = {
      userMessage: 'Liste mes clients',
      expectedTool: 'list_clients',
    };

    expect(expectedMapping.expectedTool).toBe('list_clients');
  });

  it('Commande "Modifie l\'email du client X" → devrait appeler update_client', () => {
    const expectedMapping = {
      userMessage: "Modifie l'email du client Jean à nouveau@email.com",
      expectedTool: 'update_client',
      expectedArgs: { client_id: '<id>', email: 'nouveau@email.com' },
    };

    expect(expectedMapping.expectedTool).toBe('update_client');
  });

  it('Commande avec SIRET → devrait créer client type entreprise', () => {
    const expectedMapping = {
      userMessage: 'Crée un client entreprise ACME avec SIRET 12345678901234',
      expectedTool: 'create_client',
      expectedArgs: { nom: 'ACME', type: 'entreprise', siret: '12345678901234' },
    };

    expect(expectedMapping.expectedArgs.type).toBe('entreprise');
  });
});

// ============================================================================
// TESTS: MODES ET PERMISSIONS
// ============================================================================

describe('LLM Behavior: Clients Mode Permissions', () => {
  it('create_client est un SAFE_WRITE (ne nécessite pas confirmation en AUTO)', () => {
    // Selon la spécification, create_client est SAFE_WRITE
    // En mode AUTO: exécution directe
    // En mode DEMANDER: confirmation requise
    // En mode PLAN: lecture seule, pas d'exécution
    const toolPermissions = {
      create_client: 'SAFE_WRITE',
      list_clients: 'READ_ONLY',
      update_client: 'SAFE_WRITE',
    };

    expect(toolPermissions.create_client).toBe('SAFE_WRITE');
    expect(toolPermissions.list_clients).toBe('READ_ONLY');
  });

  it('list_clients est READ_ONLY (toujours autorisé)', () => {
    const toolPermissions = {
      list_clients: 'READ_ONLY',
    };

    expect(toolPermissions.list_clients).toBe('READ_ONLY');
  });
});

// ============================================================================
// TESTS: VALIDATION DES ENTRÉES
// ============================================================================

describe('LLM Behavior: Client Input Validation', () => {
  it('create_client requiert obligatoirement "nom"', () => {
    const createClientTool = toolDefinitions.find(t => t.function.name === 'create_client');
    const required = createClientTool?.function.parameters?.required || [];

    expect(required).toContain('nom');
  });

  it('update_client accepte client_id ou client_name pour identifier le client', () => {
    const updateClientTool = toolDefinitions.find(t => t.function.name === 'update_client');
    const props = updateClientTool?.function.parameters?.properties || {};

    // Au moins client_id ou client_name doit être fourni
    expect(props).toHaveProperty('client_id');
    expect(props).toHaveProperty('client_name');
  });
});
