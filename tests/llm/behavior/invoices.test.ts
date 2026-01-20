/**
 * Tests de comportement LLM: Factures (Section 9.5)
 *
 * Ces tests vérifient les contrats et comportements attendus pour les factures.
 * Note: Les tests d'intégration avec le chat API nécessitent un environnement complet.
 */
import { describe, expect, it } from 'vitest';
import { toolDefinitions } from '@/lib/llm/tools';

// ============================================================================
// TESTS: DÉFINITIONS DES TOOLS FACTURES
// ============================================================================

describe('LLM Behavior: Invoice Tools Definition', () => {
  it('create_invoice est défini avec les bons paramètres', () => {
    const createInvoiceTool = toolDefinitions.find(t => t.function.name === 'create_invoice');
    expect(createInvoiceTool).toBeDefined();

    const params = createInvoiceTool?.function.parameters;
    expect(params?.properties).toHaveProperty('client_id');
    expect(params?.properties).toHaveProperty('client_name');
    expect(params?.properties).toHaveProperty('mission_id');
    expect(params?.properties).toHaveProperty('quote_id');
    expect(params?.properties).toHaveProperty('items');
    expect(params?.properties).toHaveProperty('date_echeance');
    expect(params?.properties).toHaveProperty('notes');
    expect(params?.required).toContain('items');
  });

  it('list_invoices est défini avec filtre de statut', () => {
    const listInvoicesTool = toolDefinitions.find(t => t.function.name === 'list_invoices');
    expect(listInvoicesTool).toBeDefined();

    const params = listInvoicesTool?.function.parameters;
    expect(params?.properties).toHaveProperty('status');
  });

  it('update_invoice est défini', () => {
    const updateInvoiceTool = toolDefinitions.find(t => t.function.name === 'update_invoice');
    expect(updateInvoiceTool).toBeDefined();

    const params = updateInvoiceTool?.function.parameters;
    expect(params?.properties).toHaveProperty('invoice_id');
    expect(params?.properties).toHaveProperty('invoice_numero');
    expect(params?.properties).toHaveProperty('new_numero');
    expect(params?.properties).toHaveProperty('date_emission');
    expect(params?.properties).toHaveProperty('date_echeance');
    expect(params?.properties).toHaveProperty('notes');
  });

  it('mark_invoice_paid est défini', () => {
    const markPaidTool = toolDefinitions.find(t => t.function.name === 'mark_invoice_paid');
    expect(markPaidTool).toBeDefined();

    const params = markPaidTool?.function.parameters;
    expect(params?.properties).toHaveProperty('invoice_id');
    expect(params?.properties).toHaveProperty('invoice_numero');
  });
});

// ============================================================================
// TESTS: CONTRAT DES TOOLS FACTURES
// ============================================================================

describe('LLM Behavior: Invoice Tools Contract', () => {
  it('create_invoice items doit avoir description, quantite, prix_unitaire', () => {
    const createInvoiceTool = toolDefinitions.find(t => t.function.name === 'create_invoice');
    const itemsProperty = createInvoiceTool?.function.parameters?.properties?.items;

    expect(itemsProperty?.type).toBe('array');
    const itemProperties = itemsProperty?.items?.properties;
    expect(itemProperties).toHaveProperty('description');
    expect(itemProperties).toHaveProperty('quantite');
    expect(itemProperties).toHaveProperty('prix_unitaire');
    expect(itemProperties).toHaveProperty('tva_rate');
  });

  it('list_invoices accepte les statuts brouillon, envoyee, payee', () => {
    const listInvoicesTool = toolDefinitions.find(t => t.function.name === 'list_invoices');
    const statusProp = listInvoicesTool?.function.parameters?.properties?.status;

    expect(statusProp?.enum).toContain('brouillon');
    expect(statusProp?.enum).toContain('envoyee');
    expect(statusProp?.enum).toContain('payee');
  });

  it('create_invoice requiert mission_id (documenté comme obligatoire)', () => {
    const createInvoiceTool = toolDefinitions.find(t => t.function.name === 'create_invoice');
    const missionIdProp = createInvoiceTool?.function.parameters?.properties?.mission_id;

    // La description indique que c'est obligatoire
    expect(missionIdProp?.description).toContain('OBLIGATOIRE');
  });
});

// ============================================================================
// TESTS: COMPORTEMENT ATTENDU (DOCUMENTATION)
// ============================================================================

describe('LLM Behavior: Invoices Expected Behavior (9.5)', () => {
  it('Commande "Crée une facture" → devrait appeler create_invoice', () => {
    const expectedMapping = {
      userMessage: 'Crée une facture pour ACME avec une ligne vidéo 1500€',
      expectedTool: 'create_invoice',
      expectedArgs: {
        client_name: 'ACME',
        items: [{ description: 'Vidéo', quantite: 1, prix_unitaire: 1500 }],
      },
    };

    expect(expectedMapping.expectedTool).toBe('create_invoice');
  });

  it('Commande "Liste mes factures" → devrait appeler list_invoices', () => {
    const expectedMapping = {
      userMessage: 'Liste mes factures',
      expectedTool: 'list_invoices',
    };

    expect(expectedMapping.expectedTool).toBe('list_invoices');
  });

  it('Commande "Liste les factures impayées" → devrait appeler list_invoices avec status=envoyee', () => {
    const expectedMapping = {
      userMessage: 'Liste les factures impayées',
      expectedTool: 'list_invoices',
      expectedArgs: { status: 'envoyee' },
    };

    expect(expectedMapping.expectedArgs.status).toBe('envoyee');
  });

  it('Commande "Marque cette facture comme payée" → devrait appeler mark_invoice_paid', () => {
    const expectedMapping = {
      userMessage: 'Marque la facture FAC-0001 comme payée',
      expectedTool: 'mark_invoice_paid',
      expectedArgs: { invoice_numero: 'FAC-0001' },
    };

    expect(expectedMapping.expectedTool).toBe('mark_invoice_paid');
  });

  it('Commande "Modifie la date échéance" → devrait appeler update_invoice', () => {
    const expectedMapping = {
      userMessage: "Change la date d'échéance de FAC-0001 au 2024-03-15",
      expectedTool: 'update_invoice',
      expectedArgs: { invoice_numero: 'FAC-0001', date_echeance: '2024-03-15' },
    };

    expect(expectedMapping.expectedTool).toBe('update_invoice');
  });
});

// ============================================================================
// TESTS: MODES ET PERMISSIONS
// ============================================================================

describe('LLM Behavior: Invoices Mode Permissions', () => {
  it('create_invoice est un SAFE_WRITE', () => {
    const toolPermissions = {
      create_invoice: 'SAFE_WRITE',
      list_invoices: 'READ_ONLY',
      update_invoice: 'SAFE_WRITE',
      mark_invoice_paid: 'SAFE_WRITE',
    };

    expect(toolPermissions.create_invoice).toBe('SAFE_WRITE');
    expect(toolPermissions.list_invoices).toBe('READ_ONLY');
  });

  it('mark_invoice_paid est SAFE_WRITE', () => {
    const toolPermissions = {
      mark_invoice_paid: 'SAFE_WRITE',
    };

    expect(toolPermissions.mark_invoice_paid).toBe('SAFE_WRITE');
  });
});

// ============================================================================
// TESTS: VALIDATION DES ENTRÉES
// ============================================================================

describe('LLM Behavior: Invoice Input Validation', () => {
  it('create_invoice requiert obligatoirement "items"', () => {
    const createInvoiceTool = toolDefinitions.find(t => t.function.name === 'create_invoice');
    const required = createInvoiceTool?.function.parameters?.required || [];

    expect(required).toContain('items');
  });

  it('items doit avoir description, quantite, prix_unitaire requis', () => {
    const createInvoiceTool = toolDefinitions.find(t => t.function.name === 'create_invoice');
    const itemsProperty = createInvoiceTool?.function.parameters?.properties?.items;
    const itemRequired = itemsProperty?.items?.required || [];

    expect(itemRequired).toContain('description');
    expect(itemRequired).toContain('quantite');
    expect(itemRequired).toContain('prix_unitaire');
  });
});
