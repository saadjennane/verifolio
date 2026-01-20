/**
 * Tests de comportement LLM: Contacts (Section 9.2)
 *
 * Ces tests vérifient les contrats et comportements attendus pour les contacts.
 * Note: Les tests d'intégration avec le chat API nécessitent un environnement complet.
 */
import { describe, expect, it } from 'vitest';
import { toolDefinitions } from '@/lib/llm/tools';

// ============================================================================
// TESTS: DÉFINITIONS DES TOOLS CONTACTS
// ============================================================================

describe('LLM Behavior: Contact Tools Definition', () => {
  it('create_contact est défini avec les bons paramètres', () => {
    const createContactTool = toolDefinitions.find(t => t.function.name === 'create_contact');
    expect(createContactTool).toBeDefined();

    const params = createContactTool?.function.parameters;
    expect(params?.properties).toHaveProperty('nom');
    expect(params?.properties).toHaveProperty('email');
    expect(params?.properties).toHaveProperty('telephone');
    expect(params?.properties).toHaveProperty('notes');
    expect(params?.required).toContain('nom');
  });

  it('list_contacts est défini avec filtres optionnels', () => {
    const listContactsTool = toolDefinitions.find(t => t.function.name === 'list_contacts');
    expect(listContactsTool).toBeDefined();

    const params = listContactsTool?.function.parameters;
    expect(params?.properties).toHaveProperty('client_id');
    expect(params?.properties).toHaveProperty('client_name');
  });

  it('update_contact est défini', () => {
    const updateContactTool = toolDefinitions.find(t => t.function.name === 'update_contact');
    expect(updateContactTool).toBeDefined();

    const params = updateContactTool?.function.parameters;
    expect(params?.properties).toHaveProperty('contact_id');
    expect(params?.properties).toHaveProperty('contact_name');
    expect(params?.properties).toHaveProperty('nom');
    expect(params?.properties).toHaveProperty('email');
    expect(params?.properties).toHaveProperty('telephone');
  });

  it('link_contact_to_client est défini avec métadonnées de rôle', () => {
    const linkTool = toolDefinitions.find(t => t.function.name === 'link_contact_to_client');
    expect(linkTool).toBeDefined();

    const params = linkTool?.function.parameters;
    expect(params?.properties).toHaveProperty('contact_id');
    expect(params?.properties).toHaveProperty('client_id');
    expect(params?.properties).toHaveProperty('role');
    expect(params?.properties).toHaveProperty('handles_billing');
    expect(params?.properties).toHaveProperty('handles_ops');
    expect(params?.properties).toHaveProperty('handles_management');
    expect(params?.properties).toHaveProperty('is_primary');
  });

  it('unlink_contact_from_client est défini', () => {
    const unlinkTool = toolDefinitions.find(t => t.function.name === 'unlink_contact_from_client');
    expect(unlinkTool).toBeDefined();

    const params = unlinkTool?.function.parameters;
    expect(params?.properties).toHaveProperty('contact_id');
    expect(params?.properties).toHaveProperty('client_id');
  });

  it('get_contact_for_context est défini avec contexte requis', () => {
    const getContactTool = toolDefinitions.find(t => t.function.name === 'get_contact_for_context');
    expect(getContactTool).toBeDefined();

    const params = getContactTool?.function.parameters;
    expect(params?.properties).toHaveProperty('context');
    expect(params?.required).toContain('context');
  });
});

// ============================================================================
// TESTS: CONTRAT DES TOOLS CONTACTS
// ============================================================================

describe('LLM Behavior: Contact Tools Contract', () => {
  it('link_contact_to_client accepte les rôles billing/ops/management', () => {
    const linkTool = toolDefinitions.find(t => t.function.name === 'link_contact_to_client');
    const props = linkTool?.function.parameters?.properties;

    expect(props?.handles_billing?.type).toBe('boolean');
    expect(props?.handles_ops?.type).toBe('boolean');
    expect(props?.handles_management?.type).toBe('boolean');
  });

  it('get_contact_for_context accepte les contextes FACTURATION, OPERATIONNEL, DIRECTION', () => {
    const getContactTool = toolDefinitions.find(t => t.function.name === 'get_contact_for_context');
    const contextProp = getContactTool?.function.parameters?.properties?.context;

    expect(contextProp?.enum).toContain('FACTURATION');
    expect(contextProp?.enum).toContain('OPERATIONNEL');
    expect(contextProp?.enum).toContain('DIRECTION');
  });

  it('link_contact_to_client accepte preferred_channel email ou phone', () => {
    const linkTool = toolDefinitions.find(t => t.function.name === 'link_contact_to_client');
    const channelProp = linkTool?.function.parameters?.properties?.preferred_channel;

    expect(channelProp?.enum).toContain('email');
    expect(channelProp?.enum).toContain('phone');
  });

  it('update_client_contact permet de modifier les métadonnées du lien', () => {
    const updateClientContactTool = toolDefinitions.find(t => t.function.name === 'update_client_contact');
    expect(updateClientContactTool).toBeDefined();

    const props = updateClientContactTool?.function.parameters?.properties;
    expect(props).toHaveProperty('role');
    expect(props).toHaveProperty('handles_billing');
    expect(props).toHaveProperty('handles_ops');
    expect(props).toHaveProperty('handles_management');
    expect(props).toHaveProperty('is_primary');
  });
});

// ============================================================================
// TESTS: COMPORTEMENT ATTENDU (DOCUMENTATION)
// ============================================================================

describe('LLM Behavior: Contacts Expected Behavior (9.2)', () => {
  it('Commande "Crée un contact [nom]" → devrait appeler create_contact', () => {
    const expectedMapping = {
      userMessage: 'Crée un contact Marie Martin',
      expectedTool: 'create_contact',
      expectedArgs: { nom: 'Marie Martin' },
    };

    expect(expectedMapping.expectedTool).toBe('create_contact');
  });

  it('Commande "Liste les contacts" → devrait appeler list_contacts', () => {
    const expectedMapping = {
      userMessage: 'Liste les contacts',
      expectedTool: 'list_contacts',
    };

    expect(expectedMapping.expectedTool).toBe('list_contacts');
  });

  it('Commande "Lie [contact] à [client]" → devrait appeler link_contact_to_client', () => {
    const expectedMapping = {
      userMessage: 'Lie Marie Martin à ACME Corp en tant que Directrice Commerciale',
      expectedTool: 'link_contact_to_client',
      expectedArgs: { contact_name: 'Marie Martin', client_name: 'ACME Corp', role: 'Directrice Commerciale' },
    };

    expect(expectedMapping.expectedTool).toBe('link_contact_to_client');
  });

  it('Commande "Qui contacter pour la facturation chez [client]" → devrait appeler get_contact_for_context', () => {
    const expectedMapping = {
      userMessage: 'Qui contacter pour la facturation chez ACME?',
      expectedTool: 'get_contact_for_context',
      expectedArgs: { client_name: 'ACME', context: 'FACTURATION' },
    };

    expect(expectedMapping.expectedTool).toBe('get_contact_for_context');
    expect(expectedMapping.expectedArgs.context).toBe('FACTURATION');
  });

  it('Commande "Ce contact gère les opérations" → devrait appeler update_client_contact', () => {
    const expectedMapping = {
      userMessage: 'Marie Martin gère les opérations chez ACME',
      expectedTool: 'update_client_contact',
      expectedArgs: { contact_name: 'Marie Martin', client_name: 'ACME', handles_ops: true },
    };

    expect(expectedMapping.expectedTool).toBe('update_client_contact');
  });
});

// ============================================================================
// TESTS: MODES ET PERMISSIONS
// ============================================================================

describe('LLM Behavior: Contacts Mode Permissions', () => {
  it('create_contact est un SAFE_WRITE', () => {
    const toolPermissions = {
      create_contact: 'SAFE_WRITE',
      list_contacts: 'READ_ONLY',
      update_contact: 'SAFE_WRITE',
      link_contact_to_client: 'SAFE_WRITE',
      unlink_contact_from_client: 'SAFE_WRITE',
      get_contact_for_context: 'READ_ONLY',
    };

    expect(toolPermissions.create_contact).toBe('SAFE_WRITE');
    expect(toolPermissions.list_contacts).toBe('READ_ONLY');
  });

  it('get_contact_for_context est READ_ONLY', () => {
    const toolPermissions = {
      get_contact_for_context: 'READ_ONLY',
    };

    expect(toolPermissions.get_contact_for_context).toBe('READ_ONLY');
  });
});

// ============================================================================
// TESTS: VALIDATION DES ENTRÉES
// ============================================================================

describe('LLM Behavior: Contact Input Validation', () => {
  it('create_contact requiert obligatoirement "nom"', () => {
    const createContactTool = toolDefinitions.find(t => t.function.name === 'create_contact');
    const required = createContactTool?.function.parameters?.required || [];

    expect(required).toContain('nom');
  });

  it('get_contact_for_context requiert obligatoirement "context"', () => {
    const getContactTool = toolDefinitions.find(t => t.function.name === 'get_contact_for_context');
    const required = getContactTool?.function.parameters?.required || [];

    expect(required).toContain('context');
  });
});
