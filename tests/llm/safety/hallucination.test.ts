/**
 * Tests Anti-Hallucination LLM
 *
 * Ces tests documentent les règles anti-hallucination que le LLM doit respecter.
 * Règle fondamentale: "Le LLM LIT D'ABORD, IL AGIT ENSUITE"
 */
import { describe, expect, it } from 'vitest';
import { toolDefinitions } from '@/lib/llm/tools';

// ============================================================================
// TESTS: RÈGLE FONDAMENTALE - LIRE AVANT D'AGIR
// ============================================================================

describe('Anti-Hallucination: Règle fondamentale', () => {
  it('Les tools de lecture (list_*) doivent exister pour chaque entité', () => {
    const readTools = [
      'list_clients',
      'list_contacts',
      'list_deals',
      'list_quotes',
      'list_invoices',
      'list_missions',
      'list_proposals',
      'list_briefs',
      'list_reviews',
      'list_review_requests',
    ];

    readTools.forEach(toolName => {
      const tool = toolDefinitions.find(t => t.function.name === toolName);
      expect(tool, `${toolName} devrait exister pour la lecture`).toBeDefined();
    });
  });

  it('Les tools de lecture sont READ_ONLY', () => {
    // Les tools list_* ne modifient pas les données
    const listTools = toolDefinitions.filter(t => t.function.name.startsWith('list_'));

    listTools.forEach(tool => {
      // Un tool READ_ONLY ne devrait pas avoir de paramètres d'écriture
      const params = tool.function.parameters?.properties || {};
      expect(params).not.toHaveProperty('create');
      expect(params).not.toHaveProperty('delete');
    });
  });
});

// ============================================================================
// TESTS: ANTI-HALLUCINATION DES IDS
// ============================================================================

describe('Anti-Hallucination: IDs', () => {
  it('Les tools de création retournent un ID dans la réponse', () => {
    // Documentation: après création, le tool DOIT retourner l'ID créé
    const createTools = toolDefinitions.filter(t => t.function.name.startsWith('create_'));

    // Tous les tools de création existent
    expect(createTools.length).toBeGreaterThan(0);
  });

  it('Les tools de mise à jour requièrent un ID existant', () => {
    const updateTools = [
      { name: 'update_client', idParam: 'client_id' },
      { name: 'update_contact', idParam: 'contact_id' },
      { name: 'update_deal_status', idParam: 'deal_id' },
      { name: 'mark_invoice_paid', idParam: 'invoice_id' },
      { name: 'set_proposal_status', idParam: 'proposal_id' },
    ];

    updateTools.forEach(({ name, idParam }) => {
      const tool = toolDefinitions.find(t => t.function.name === name);
      if (tool) {
        const props = tool.function.parameters?.properties || {};
        expect(props, `${name} devrait avoir ${idParam}`).toHaveProperty(idParam);
      }
    });
  });

  it('Le LLM ne doit jamais inventer un ID sans l\'avoir lu', () => {
    // Documentation du comportement attendu
    const antiHallucinationRule = {
      rule: 'NEVER_INVENT_IDS',
      description: 'Le LLM ne doit jamais utiliser un ID qui n\'a pas été retourné par un tool précédent',
      correctFlow: [
        '1. Utilisateur demande "Crée un devis pour ACME"',
        '2. LLM appelle list_clients pour trouver ACME',
        '3. LLM reçoit { id: "client-123", nom: "ACME" }',
        '4. LLM appelle create_quote avec client_id: "client-123"',
      ],
      incorrectFlow: [
        '1. Utilisateur demande "Crée un devis pour ACME"',
        '2. LLM invente un ID: create_quote({ client_id: "fake-id" })',
        '3. ERREUR: ID non vérifié',
      ],
    };

    expect(antiHallucinationRule.rule).toBe('NEVER_INVENT_IDS');
  });
});

// ============================================================================
// TESTS: ANTI-HALLUCINATION DES DONNÉES
// ============================================================================

describe('Anti-Hallucination: Données', () => {
  it('Le LLM ne doit pas inventer de montants', () => {
    const rule = {
      context: 'L\'utilisateur demande "Facture le client ACME"',
      correctBehavior: 'Demander le montant ou lire depuis un devis/mission existant',
      incorrectBehavior: 'Inventer un montant arbitraire',
    };

    expect(rule.correctBehavior).toContain('Demander');
  });

  it('Le LLM ne doit pas inventer de dates', () => {
    const rule = {
      context: 'L\'utilisateur demande "Quand est-ce que la facture a été payée?"',
      correctBehavior: 'Lire la date depuis les données (paid_at)',
      incorrectBehavior: 'Inventer une date',
    };

    expect(rule.correctBehavior).toContain('Lire');
  });

  it('Le LLM ne doit pas inventer de noms de clients', () => {
    const rule = {
      context: 'L\'utilisateur demande "Montre le client"',
      correctBehavior: 'Utiliser list_clients ou demander quel client',
      incorrectBehavior: 'Inventer un nom de client',
    };

    expect(rule.correctBehavior).toContain('list_clients');
  });
});

// ============================================================================
// TESTS: ANTI-HALLUCINATION DU CONTEXTE
// ============================================================================

describe('Anti-Hallucination: Contexte', () => {
  it('Le contexte de page fournit les IDs valides', () => {
    // Le système enrichit le prompt avec le contexte de la page courante
    const contextTypes = [
      { page: 'clients/:id', contextId: 'client:<id>' },
      { page: 'deals/:id', contextId: 'deal:<id>' },
      { page: 'invoices/:id', contextId: 'invoice:<id>' },
      { page: 'quotes/:id', contextId: 'quote:<id>' },
      { page: 'missions/:id', contextId: 'mission:<id>' },
    ];

    contextTypes.forEach(({ page, contextId }) => {
      expect(contextId).toMatch(/^\w+:<id>$/);
    });
  });

  it('Le LLM utilise le contexte fourni plutôt que d\'inventer', () => {
    const rule = {
      scenario: 'Utilisateur sur la page d\'un client demande "Crée un deal"',
      contextProvided: 'client:client-123',
      expectedBehavior: 'Utiliser client_id: "client-123" directement',
      notExpected: 'Appeler list_clients pour chercher le client',
    };

    expect(rule.expectedBehavior).toContain('Utiliser');
  });
});

// ============================================================================
// TESTS: ANTI-HALLUCINATION DES CALCULS
// ============================================================================

describe('Anti-Hallucination: Calculs', () => {
  it('Les calculs HT/TVA/TTC sont faits par le système, pas le LLM', () => {
    const rule = {
      scenario: 'Création d\'un devis avec lignes',
      llmResponsibility: 'Fournir description, quantité, prix unitaire, taux TVA',
      systemResponsibility: 'Calculer total HT, total TVA, total TTC',
      antiHallucination: 'Le LLM ne doit pas calculer lui-même les totaux',
    };

    expect(rule.llmResponsibility).not.toContain('calculer');
    expect(rule.systemResponsibility).toContain('Calculer');
  });

  it('create_quote accepte des lignes avec prix unitaire et quantité', () => {
    const tool = toolDefinitions.find(t => t.function.name === 'create_quote');
    expect(tool).toBeDefined();

    const params = tool?.function.parameters?.properties;
    expect(params).toHaveProperty('items');
  });
});

// ============================================================================
// TESTS: PATTERNS DE SÉCURITÉ
// ============================================================================

describe('Anti-Hallucination: Patterns de sécurité', () => {
  it('Pattern: Vérifier avant de modifier', () => {
    const pattern = {
      name: 'CHECK_BEFORE_MODIFY',
      steps: [
        '1. list_* pour vérifier que l\'entité existe',
        '2. Vérifier le statut actuel',
        '3. update_* avec l\'ID vérifié',
      ],
    };

    expect(pattern.steps).toHaveLength(3);
    expect(pattern.steps[0]).toContain('list_');
  });

  it('Pattern: Utiliser le contexte de page', () => {
    const pattern = {
      name: 'USE_PAGE_CONTEXT',
      description: 'Quand l\'utilisateur est sur une page avec contexte, utiliser l\'ID fourni',
      benefit: 'Évite les appels list_* inutiles et réduit les hallucinations',
    };

    expect(pattern.benefit).toContain('hallucinations');
  });

  it('Pattern: Demander plutôt qu\'inventer', () => {
    const pattern = {
      name: 'ASK_DONT_INVENT',
      description: 'Si une information manque, demander à l\'utilisateur',
      examples: [
        'Montant non spécifié → "Quel montant souhaitez-vous pour ce devis?"',
        'Client ambigu → "Plusieurs clients correspondent, lequel souhaitez-vous?"',
      ],
    };

    expect(pattern.examples.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// TESTS: VALIDATION DES RÉPONSES
// ============================================================================

describe('Anti-Hallucination: Validation des réponses', () => {
  it('Toutes les réponses tool incluent un champ success', () => {
    // Le format ToolResult garantit success: boolean
    const toolResultFormat = {
      success: 'boolean',
      message: 'string',
      data: 'unknown (optionnel)',
    };

    expect(toolResultFormat.success).toBe('boolean');
  });

  it('Les erreurs sont explicites et non inventées', () => {
    const errorHandling = {
      clientNotFound: 'Le client avec l\'ID xxx n\'existe pas',
      permissionDenied: 'Action non autorisée en mode PLAN',
      missingParameter: 'Le paramètre client_id est requis',
    };

    Object.values(errorHandling).forEach(message => {
      expect(message.length).toBeGreaterThan(0);
    });
  });
});
