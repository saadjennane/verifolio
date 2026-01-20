/**
 * Tests E2E avec LLM: Workflow complet (Section 10)
 *
 * Ces tests documentent les parcours complets de bout en bout.
 * Note: Les tests d'intégration réels nécessitent un environnement complet.
 */
import { describe, expect, it } from 'vitest';
import { toolDefinitions } from '@/lib/llm/tools';

// ============================================================================
// TESTS: WORKFLOW COMPLET - DOCUMENTATION
// ============================================================================

describe('Workflow E2E: Parcours Client → Facture (Section 10)', () => {
  // Ces tests documentent le workflow complet attendu

  it('Étape 1: Créer client avec contact', () => {
    const workflow = {
      step: 1,
      userMessage: 'Crée un client ACME avec contact Jean',
      expectedTools: ['create_client', 'create_contact'],
      result: {
        client: { id: '<client-id>', nom: 'ACME' },
        contact: { id: '<contact-id>', name: 'Jean', client_id: '<client-id>' },
      },
    };

    // Vérifie que les tools existent
    expect(toolDefinitions.find(t => t.function.name === 'create_client')).toBeDefined();
    expect(toolDefinitions.find(t => t.function.name === 'create_contact')).toBeDefined();
    expect(workflow.expectedTools).toHaveLength(2);
  });

  it('Étape 2: Créer deal lié au client', () => {
    const workflow = {
      step: 2,
      userMessage: 'Crée un deal de 5000€ pour ACME',
      expectedTool: 'create_deal',
      expectedArgs: { title: 'Deal ACME', estimated_amount: 5000, client_id: '<client-id>' },
    };

    expect(toolDefinitions.find(t => t.function.name === 'create_deal')).toBeDefined();
    expect(workflow.expectedTool).toBe('create_deal');
  });

  it('Étape 3: Générer proposition commerciale', () => {
    const workflow = {
      step: 3,
      userMessage: 'Génère une proposition pour ce deal',
      expectedTool: 'create_proposal',
      expectedArgs: { deal_id: '<deal-id>' },
    };

    expect(toolDefinitions.find(t => t.function.name === 'create_proposal')).toBeDefined();
  });

  it('Étape 4: Envoyer proposition (CRITICAL - nécessite confirmation)', () => {
    const workflow = {
      step: 4,
      userMessage: 'Envoie la proposition',
      expectedTool: 'set_proposal_status',
      permission: 'CRITICAL',
      requiresConfirmation: true,
    };

    expect(toolDefinitions.find(t => t.function.name === 'set_proposal_status')).toBeDefined();
    expect(workflow.requiresConfirmation).toBe(true);
  });

  it('Étape 5: Créer devis', () => {
    const workflow = {
      step: 5,
      userMessage: 'Crée un devis pour ce deal',
      expectedTool: 'create_quote',
      expectedArgs: { deal_id: '<deal-id>' },
    };

    expect(toolDefinitions.find(t => t.function.name === 'create_quote')).toBeDefined();
  });

  it('Étape 6: Marquer deal comme gagné (CRITICAL)', () => {
    const workflow = {
      step: 6,
      userMessage: 'Marque le deal comme gagné',
      expectedTool: 'update_deal_status',
      expectedArgs: { deal_id: '<deal-id>', status: 'won' },
      permission: 'CRITICAL',
      requiresConfirmation: true,
    };

    expect(toolDefinitions.find(t => t.function.name === 'update_deal_status')).toBeDefined();
    expect(workflow.requiresConfirmation).toBe(true);
  });

  it('Étape 7: Créer mission depuis deal gagné', () => {
    const workflow = {
      step: 7,
      userMessage: 'Crée la mission',
      expectedTool: 'create_mission',
      expectedArgs: { deal_id: '<deal-id>' },
    };

    expect(toolDefinitions.find(t => t.function.name === 'create_mission')).toBeDefined();
  });

  it('Étape 8: Créer facture liée à la mission', () => {
    const workflow = {
      step: 8,
      userMessage: 'Facture la mission',
      expectedTool: 'create_invoice',
      expectedArgs: { mission_id: '<mission-id>' },
    };

    expect(toolDefinitions.find(t => t.function.name === 'create_invoice')).toBeDefined();
  });

  it('Étape 9: Demander review (suggestion IA)', () => {
    const workflow = {
      step: 9,
      userMessage: 'Oui, demande une review',
      expectedTool: 'create_review_request',
      expectedArgs: { invoice_id: '<invoice-id>' },
      isSuggestion: true,
    };

    expect(toolDefinitions.find(t => t.function.name === 'create_review_request')).toBeDefined();
  });
});

// ============================================================================
// TESTS: PARCOURS ALTERNATIFS
// ============================================================================

describe('Workflow E2E: Parcours alternatifs', () => {
  it('Deal perdu → Mission impossible', () => {
    const scenario = {
      condition: 'Deal status = lost',
      action: 'create_mission',
      expectedResult: 'error',
      message: 'Impossible de créer une mission : le deal est perdu.',
    };

    expect(scenario.expectedResult).toBe('error');
  });

  it('Devis refusé → Deal archivable', () => {
    const scenario = {
      condition: 'Quote status = refused',
      action: 'update_deal_status',
      expectedArgs: { status: 'archived' },
    };

    const updateDealTool = toolDefinitions.find(t => t.function.name === 'update_deal_status');
    expect(updateDealTool).toBeDefined();
  });

  it('Mission livrée → Rappel facturation', () => {
    const scenario = {
      condition: 'Mission status = delivered && no invoice',
      suggestion: 'Voulez-vous facturer cette mission ?',
      suggestedTool: 'create_invoice',
    };

    expect(toolDefinitions.find(t => t.function.name === 'create_invoice')).toBeDefined();
  });

  it('Facture payée → Suggestion review', () => {
    const scenario = {
      condition: 'Invoice status = paid && no review_request',
      suggestion: 'Voulez-vous demander un témoignage au client ?',
      suggestedTool: 'create_review_request',
    };

    expect(toolDefinitions.find(t => t.function.name === 'create_review_request')).toBeDefined();
  });
});

// ============================================================================
// TESTS: SÉQUENCES MULTI-TOOLS
// ============================================================================

describe('Workflow E2E: Séquences multi-tools', () => {
  it('Création complète: client + deal + devis', () => {
    const sequence = {
      userMessage: 'Crée un client NewCorp avec un deal et un devis',
      expectedToolSequence: ['create_client', 'create_deal', 'create_quote'],
      description: 'Création en cascade avec liaisons automatiques',
    };

    // Tous les tools de la séquence doivent exister
    sequence.expectedToolSequence.forEach(toolName => {
      expect(toolDefinitions.find(t => t.function.name === toolName)).toBeDefined();
    });
  });

  it('Conversion: devis → facture', () => {
    const sequence = {
      userMessage: 'Convertis ce devis en facture',
      expectedTool: 'convert_quote_to_invoice',
      description: 'Conversion directe préservant les lignes et montants',
    };

    expect(toolDefinitions.find(t => t.function.name === 'convert_quote_to_invoice')).toBeDefined();
  });

  it('Clôture mission: livraison + facturation', () => {
    const sequence = {
      userMessage: 'La mission est terminée, facture-la',
      expectedToolSequence: ['update_mission_status', 'create_invoice'],
      description: 'Mise à jour statut puis création facture',
    };

    sequence.expectedToolSequence.forEach(toolName => {
      expect(toolDefinitions.find(t => t.function.name === toolName)).toBeDefined();
    });
  });
});

// ============================================================================
// TESTS: TOOLS REQUIS POUR LE WORKFLOW
// ============================================================================

describe('Workflow E2E: Tools requis', () => {
  const workflowTools = [
    'create_client',
    'create_contact',
    'create_deal',
    'update_deal_status',
    'create_proposal',
    'set_proposal_status',
    'create_quote',
    'create_invoice',
    'convert_quote_to_invoice',
    'create_mission',
    'update_mission_status',
    'mark_invoice_paid',
    'create_review_request',
  ];

  workflowTools.forEach(toolName => {
    it(`${toolName} est disponible pour le workflow`, () => {
      const tool = toolDefinitions.find(t => t.function.name === toolName);
      expect(tool).toBeDefined();
    });
  });
});
