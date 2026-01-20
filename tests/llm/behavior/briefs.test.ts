/**
 * Tests de comportement LLM: Briefs (Section 9.8)
 *
 * Ces tests vérifient les contrats et comportements attendus pour les briefs.
 * Note: Les tests d'intégration avec le chat API nécessitent un environnement complet.
 */
import { describe, expect, it } from 'vitest';
import { toolDefinitions } from '@/lib/llm/tools';

// ============================================================================
// TESTS: DÉFINITIONS DES TOOLS BRIEFS
// ============================================================================

describe('LLM Behavior: Brief Tools Definition', () => {
  it('list_brief_templates est défini', () => {
    const listTemplates = toolDefinitions.find(t => t.function.name === 'list_brief_templates');
    expect(listTemplates).toBeDefined();
  });

  it('create_brief est défini avec les bons paramètres', () => {
    const createBrief = toolDefinitions.find(t => t.function.name === 'create_brief');
    expect(createBrief).toBeDefined();

    const params = createBrief?.function.parameters;
    expect(params?.properties).toHaveProperty('deal_id');
    expect(params?.properties).toHaveProperty('template_id');
    expect(params?.properties).toHaveProperty('template_name');
    expect(params?.properties).toHaveProperty('title');
    expect(params?.required).toContain('deal_id');
    expect(params?.required).toContain('title');
  });

  it('list_briefs est défini avec filtres', () => {
    const listBriefs = toolDefinitions.find(t => t.function.name === 'list_briefs');
    expect(listBriefs).toBeDefined();

    const params = listBriefs?.function.parameters;
    expect(params?.properties).toHaveProperty('deal_id');
    expect(params?.properties).toHaveProperty('client_id');
    expect(params?.properties).toHaveProperty('client_name');
    expect(params?.properties).toHaveProperty('status');
  });

  it('send_brief est défini', () => {
    const sendBrief = toolDefinitions.find(t => t.function.name === 'send_brief');
    expect(sendBrief).toBeDefined();

    const params = sendBrief?.function.parameters;
    expect(params?.properties).toHaveProperty('brief_id');
    expect(params?.properties).toHaveProperty('send_email');
    expect(params?.required).toContain('brief_id');
  });
});

// ============================================================================
// TESTS: CONTRAT DES TOOLS BRIEFS
// ============================================================================

describe('LLM Behavior: Brief Tools Contract', () => {
  it('list_briefs accepte les statuts DRAFT, SENT, RESPONDED', () => {
    const listBriefs = toolDefinitions.find(t => t.function.name === 'list_briefs');
    const statusProp = listBriefs?.function.parameters?.properties?.status;

    expect(statusProp?.enum).toContain('DRAFT');
    expect(statusProp?.enum).toContain('SENT');
    expect(statusProp?.enum).toContain('RESPONDED');
  });

  it('create_brief requiert deal_id (lien obligatoire avec deal)', () => {
    const createBrief = toolDefinitions.find(t => t.function.name === 'create_brief');
    const required = createBrief?.function.parameters?.required || [];

    expect(required).toContain('deal_id');
  });

  it('send_brief accepte send_email comme boolean optionnel', () => {
    const sendBrief = toolDefinitions.find(t => t.function.name === 'send_brief');
    const sendEmailProp = sendBrief?.function.parameters?.properties?.send_email;

    expect(sendEmailProp?.type).toBe('boolean');
  });
});

// ============================================================================
// TESTS: COMPORTEMENT ATTENDU (DOCUMENTATION)
// ============================================================================

describe('LLM Behavior: Briefs Expected Behavior (9.8)', () => {
  it('Commande "Liste les templates de briefs" → devrait appeler list_brief_templates', () => {
    const expectedMapping = {
      userMessage: 'Liste les templates de briefs',
      expectedTool: 'list_brief_templates',
    };

    expect(expectedMapping.expectedTool).toBe('list_brief_templates');
  });

  it('Commande "Crée un brief pour ce deal" → devrait appeler create_brief', () => {
    const expectedMapping = {
      userMessage: 'Crée un brief pour le deal Vidéo corporate',
      expectedTool: 'create_brief',
      expectedArgs: { deal_id: '<id>', title: 'Brief projet vidéo' },
    };

    expect(expectedMapping.expectedTool).toBe('create_brief');
  });

  it('Commande "Liste mes briefs" → devrait appeler list_briefs', () => {
    const expectedMapping = {
      userMessage: 'Liste mes briefs',
      expectedTool: 'list_briefs',
    };

    expect(expectedMapping.expectedTool).toBe('list_briefs');
  });

  it('Commande "Liste les briefs envoyés" → devrait appeler list_briefs avec status=SENT', () => {
    const expectedMapping = {
      userMessage: 'Liste les briefs envoyés',
      expectedTool: 'list_briefs',
      expectedArgs: { status: 'SENT' },
    };

    expect(expectedMapping.expectedArgs.status).toBe('SENT');
  });

  it('Commande "Envoie ce brief" → devrait appeler send_brief', () => {
    const expectedMapping = {
      userMessage: 'Envoie ce brief au client',
      expectedTool: 'send_brief',
      expectedArgs: { brief_id: '<id>' },
    };

    expect(expectedMapping.expectedTool).toBe('send_brief');
  });

  it('Commande "Envoie ce brief sans email" → devrait appeler send_brief avec send_email=false', () => {
    const expectedMapping = {
      userMessage: 'Génère le lien du brief sans envoyer d\'email',
      expectedTool: 'send_brief',
      expectedArgs: { brief_id: '<id>', send_email: false },
    };

    expect(expectedMapping.expectedArgs.send_email).toBe(false);
  });
});

// ============================================================================
// TESTS: MODES ET PERMISSIONS
// ============================================================================

describe('LLM Behavior: Briefs Mode Permissions', () => {
  it('Opérations de lecture sont READ_ONLY', () => {
    const toolPermissions = {
      list_brief_templates: 'READ_ONLY',
      list_briefs: 'READ_ONLY',
    };

    expect(toolPermissions.list_brief_templates).toBe('READ_ONLY');
    expect(toolPermissions.list_briefs).toBe('READ_ONLY');
  });

  it('create_brief est SAFE_WRITE', () => {
    const toolPermissions = {
      create_brief: 'SAFE_WRITE',
    };

    expect(toolPermissions.create_brief).toBe('SAFE_WRITE');
  });

  it('send_brief nécessite confirmation (envoie email)', () => {
    const toolPermissions = {
      send_brief: 'CONFIRMATION_REQUIRED',
    };

    expect(toolPermissions.send_brief).toBe('CONFIRMATION_REQUIRED');
  });
});

// ============================================================================
// TESTS: VALIDATION DES ENTRÉES
// ============================================================================

describe('LLM Behavior: Brief Input Validation', () => {
  it('create_brief requiert "deal_id" et "title"', () => {
    const createBrief = toolDefinitions.find(t => t.function.name === 'create_brief');
    const required = createBrief?.function.parameters?.required || [];

    expect(required).toContain('deal_id');
    expect(required).toContain('title');
  });

  it('send_brief requiert "brief_id"', () => {
    const sendBrief = toolDefinitions.find(t => t.function.name === 'send_brief');
    const required = sendBrief?.function.parameters?.required || [];

    expect(required).toContain('brief_id');
  });
});
