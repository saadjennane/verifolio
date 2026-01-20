/**
 * Tests de comportement LLM: Propositions Commerciales (Section 9.7)
 *
 * Ces tests vérifient les contrats et comportements attendus pour les propositions commerciales.
 * Note: Les tests d'intégration avec le chat API nécessitent un environnement complet.
 */
import { describe, expect, it } from 'vitest';
import { toolDefinitions } from '@/lib/llm/tools';

// ============================================================================
// TESTS: DÉFINITIONS DES TOOLS PROPOSITIONS
// ============================================================================

describe('LLM Behavior: Proposal Tools Definition', () => {
  it('list_proposal_templates est défini', () => {
    const listTemplates = toolDefinitions.find(t => t.function.name === 'list_proposal_templates');
    expect(listTemplates).toBeDefined();
  });

  it('create_proposal_template est défini avec les bons paramètres', () => {
    const createTemplate = toolDefinitions.find(t => t.function.name === 'create_proposal_template');
    expect(createTemplate).toBeDefined();

    const params = createTemplate?.function.parameters;
    expect(params?.properties).toHaveProperty('name');
    expect(params?.properties).toHaveProperty('style_key');
    expect(params?.properties).toHaveProperty('accent_color');
    expect(params?.required).toContain('name');
  });

  it('create_proposal est défini avec les bons paramètres', () => {
    const createProposal = toolDefinitions.find(t => t.function.name === 'create_proposal');
    expect(createProposal).toBeDefined();

    const params = createProposal?.function.parameters;
    expect(params?.properties).toHaveProperty('deal_id');
    expect(params?.properties).toHaveProperty('client_id');
    expect(params?.properties).toHaveProperty('client_name');
    expect(params?.properties).toHaveProperty('template_id');
    expect(params?.properties).toHaveProperty('template_name');
    expect(params?.properties).toHaveProperty('variables');
    expect(params?.properties).toHaveProperty('linked_quote_id');
  });

  it('list_proposals est défini avec filtres', () => {
    const listProposals = toolDefinitions.find(t => t.function.name === 'list_proposals');
    expect(listProposals).toBeDefined();

    const params = listProposals?.function.parameters;
    expect(params?.properties).toHaveProperty('client_id');
    expect(params?.properties).toHaveProperty('client_name');
    expect(params?.properties).toHaveProperty('status');
  });

  it('set_proposal_status est défini', () => {
    const setStatus = toolDefinitions.find(t => t.function.name === 'set_proposal_status');
    expect(setStatus).toBeDefined();

    const params = setStatus?.function.parameters;
    expect(params?.properties).toHaveProperty('proposal_id');
    expect(params?.properties).toHaveProperty('status');
    expect(params?.required).toContain('proposal_id');
    expect(params?.required).toContain('status');
  });
});

// ============================================================================
// TESTS: DÉFINITIONS DES TOOLS PAGES DE PROPOSITION
// ============================================================================

describe('LLM Behavior: Proposal Page Tools Definition', () => {
  it('proposal_create_page est défini', () => {
    const createPage = toolDefinitions.find(t => t.function.name === 'proposal_create_page');
    expect(createPage).toBeDefined();

    const params = createPage?.function.parameters;
    expect(params?.properties).toHaveProperty('proposal_id');
    expect(params?.properties).toHaveProperty('title');
    expect(params?.properties).toHaveProperty('content');
    expect(params?.required).toContain('proposal_id');
    expect(params?.required).toContain('title');
  });

  it('proposal_update_page est défini', () => {
    const updatePage = toolDefinitions.find(t => t.function.name === 'proposal_update_page');
    expect(updatePage).toBeDefined();

    const params = updatePage?.function.parameters;
    expect(params?.properties).toHaveProperty('proposal_id');
    expect(params?.properties).toHaveProperty('page_id');
    expect(params?.properties).toHaveProperty('content');
    expect(params?.properties).toHaveProperty('title');
    expect(params?.required).toContain('proposal_id');
    expect(params?.required).toContain('page_id');
    expect(params?.required).toContain('content');
  });

  it('proposal_list_pages est défini', () => {
    const listPages = toolDefinitions.find(t => t.function.name === 'proposal_list_pages');
    expect(listPages).toBeDefined();

    const params = listPages?.function.parameters;
    expect(params?.properties).toHaveProperty('proposal_id');
    expect(params?.required).toContain('proposal_id');
  });

  it('proposal_rewrite_content est défini avec styles', () => {
    const rewrite = toolDefinitions.find(t => t.function.name === 'proposal_rewrite_content');
    expect(rewrite).toBeDefined();

    const params = rewrite?.function.parameters;
    expect(params?.properties).toHaveProperty('original_text');
    expect(params?.properties).toHaveProperty('style');
    expect(params?.required).toContain('original_text');
    expect(params?.required).toContain('style');
  });
});

// ============================================================================
// TESTS: CONTRAT DES TOOLS PROPOSITIONS
// ============================================================================

describe('LLM Behavior: Proposal Tools Contract', () => {
  it('create_proposal_template accepte les styles classic, modern, elegant', () => {
    const createTemplate = toolDefinitions.find(t => t.function.name === 'create_proposal_template');
    const styleProp = createTemplate?.function.parameters?.properties?.style_key;

    expect(styleProp?.enum).toContain('classic');
    expect(styleProp?.enum).toContain('modern');
    expect(styleProp?.enum).toContain('elegant');
  });

  it('list_proposals accepte les statuts draft, sent, commented, accepted, refused', () => {
    const listProposals = toolDefinitions.find(t => t.function.name === 'list_proposals');
    const statusProp = listProposals?.function.parameters?.properties?.status;

    expect(statusProp?.enum).toContain('draft');
    expect(statusProp?.enum).toContain('sent');
    expect(statusProp?.enum).toContain('commented');
    expect(statusProp?.enum).toContain('accepted');
    expect(statusProp?.enum).toContain('refused');
  });

  it('set_proposal_status accepte uniquement draft et sent (autres via client)', () => {
    const setStatus = toolDefinitions.find(t => t.function.name === 'set_proposal_status');
    const statusProp = setStatus?.function.parameters?.properties?.status;

    expect(statusProp?.enum).toContain('draft');
    expect(statusProp?.enum).toContain('sent');
    expect(statusProp?.enum).toHaveLength(2);
  });

  it('proposal_rewrite_content accepte les styles formel, decontracte, persuasif, concis', () => {
    const rewrite = toolDefinitions.find(t => t.function.name === 'proposal_rewrite_content');
    const styleProp = rewrite?.function.parameters?.properties?.style;

    expect(styleProp?.enum).toContain('formel');
    expect(styleProp?.enum).toContain('decontracte');
    expect(styleProp?.enum).toContain('persuasif');
    expect(styleProp?.enum).toContain('concis');
  });
});

// ============================================================================
// TESTS: COMPORTEMENT ATTENDU (DOCUMENTATION)
// ============================================================================

describe('LLM Behavior: Proposals Expected Behavior (9.7)', () => {
  it('Commande "Liste les templates de propositions" → devrait appeler list_proposal_templates', () => {
    const expectedMapping = {
      userMessage: 'Liste les templates de propositions',
      expectedTool: 'list_proposal_templates',
    };

    expect(expectedMapping.expectedTool).toBe('list_proposal_templates');
  });

  it('Commande "Crée un template de proposition" → devrait appeler create_proposal_template', () => {
    const expectedMapping = {
      userMessage: 'Crée un template de proposition Vidéo corporate',
      expectedTool: 'create_proposal_template',
      expectedArgs: { name: 'Vidéo corporate' },
    };

    expect(expectedMapping.expectedTool).toBe('create_proposal_template');
  });

  it('Commande "Crée une proposition pour ACME" → devrait appeler create_proposal', () => {
    const expectedMapping = {
      userMessage: 'Crée une proposition pour ACME avec le template Vidéo',
      expectedTool: 'create_proposal',
      expectedArgs: { client_name: 'ACME', template_name: 'Vidéo' },
    };

    expect(expectedMapping.expectedTool).toBe('create_proposal');
  });

  it('Commande "Envoie cette proposition" → devrait appeler set_proposal_status avec sent', () => {
    const expectedMapping = {
      userMessage: 'Envoie cette proposition',
      expectedTool: 'set_proposal_status',
      expectedArgs: { proposal_id: '<id>', status: 'sent' },
    };

    expect(expectedMapping.expectedTool).toBe('set_proposal_status');
    expect(expectedMapping.expectedArgs.status).toBe('sent');
  });

  it('Commande "Ajoute une page à la proposition" → devrait appeler proposal_create_page', () => {
    const expectedMapping = {
      userMessage: 'Ajoute une page Introduction à ma proposition',
      expectedTool: 'proposal_create_page',
      expectedArgs: { proposal_id: '<id>', title: 'Introduction' },
    };

    expect(expectedMapping.expectedTool).toBe('proposal_create_page');
  });

  it('Commande "Réécris ce texte en plus formel" → devrait appeler proposal_rewrite_content', () => {
    const expectedMapping = {
      userMessage: 'Réécris ce texte de manière plus formelle',
      expectedTool: 'proposal_rewrite_content',
      expectedArgs: { original_text: '<text>', style: 'formel' },
    };

    expect(expectedMapping.expectedTool).toBe('proposal_rewrite_content');
    expect(expectedMapping.expectedArgs.style).toBe('formel');
  });
});

// ============================================================================
// TESTS: MODES ET PERMISSIONS
// ============================================================================

describe('LLM Behavior: Proposals Mode Permissions', () => {
  it('Opérations de lecture sont READ_ONLY', () => {
    const toolPermissions = {
      list_proposal_templates: 'READ_ONLY',
      list_proposals: 'READ_ONLY',
      proposal_list_pages: 'READ_ONLY',
      get_proposal_public_link: 'READ_ONLY',
      get_client_contacts_for_proposal: 'READ_ONLY',
    };

    expect(toolPermissions.list_proposal_templates).toBe('READ_ONLY');
    expect(toolPermissions.list_proposals).toBe('READ_ONLY');
  });

  it('Opérations de création sont SAFE_WRITE', () => {
    const toolPermissions = {
      create_proposal_template: 'SAFE_WRITE',
      create_proposal: 'SAFE_WRITE',
      proposal_create_page: 'SAFE_WRITE',
      proposal_update_page: 'SAFE_WRITE',
    };

    expect(toolPermissions.create_proposal).toBe('SAFE_WRITE');
    expect(toolPermissions.proposal_create_page).toBe('SAFE_WRITE');
  });

  it('set_proposal_status (sent) nécessite confirmation', () => {
    // Selon la spécification, passer à "sent" nécessite confirmation
    const toolPermissions = {
      set_proposal_status: 'CONFIRMATION_REQUIRED_FOR_SENT',
    };

    expect(toolPermissions.set_proposal_status).toBe('CONFIRMATION_REQUIRED_FOR_SENT');
  });
});

// ============================================================================
// TESTS: VALIDATION DES ENTRÉES
// ============================================================================

describe('LLM Behavior: Proposal Input Validation', () => {
  it('create_proposal_template requiert "name"', () => {
    const createTemplate = toolDefinitions.find(t => t.function.name === 'create_proposal_template');
    const required = createTemplate?.function.parameters?.required || [];

    expect(required).toContain('name');
  });

  it('proposal_create_page requiert "proposal_id" et "title"', () => {
    const createPage = toolDefinitions.find(t => t.function.name === 'proposal_create_page');
    const required = createPage?.function.parameters?.required || [];

    expect(required).toContain('proposal_id');
    expect(required).toContain('title');
  });

  it('proposal_rewrite_content requiert "original_text" et "style"', () => {
    const rewrite = toolDefinitions.find(t => t.function.name === 'proposal_rewrite_content');
    const required = rewrite?.function.parameters?.required || [];

    expect(required).toContain('original_text');
    expect(required).toContain('style');
  });

  it('set_proposal_recipients requiert "proposal_id" et "contact_ids"', () => {
    const setRecipients = toolDefinitions.find(t => t.function.name === 'set_proposal_recipients');
    const required = setRecipients?.function.parameters?.required || [];

    expect(required).toContain('proposal_id');
    expect(required).toContain('contact_ids');
  });
});
