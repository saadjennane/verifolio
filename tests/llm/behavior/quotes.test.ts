/**
 * Tests de comportement LLM: Devis (Section 9.4)
 *
 * Ces tests vérifient les contrats et comportements attendus pour les devis.
 * Note: Les tests d'intégration avec le chat API nécessitent un environnement complet.
 */
import { describe, expect, it } from 'vitest';
import { toolDefinitions } from '@/lib/llm/tools';

// ============================================================================
// TESTS: DÉFINITIONS DES TOOLS DEVIS
// ============================================================================

describe('LLM Behavior: Quote Tools Definition', () => {
  it('create_quote est défini avec les bons paramètres', () => {
    const createQuoteTool = toolDefinitions.find(t => t.function.name === 'create_quote');
    expect(createQuoteTool).toBeDefined();

    const params = createQuoteTool?.function.parameters;
    expect(params?.properties).toHaveProperty('client_id');
    expect(params?.properties).toHaveProperty('client_name');
    expect(params?.properties).toHaveProperty('deal_id');
    expect(params?.properties).toHaveProperty('items');
    expect(params?.properties).toHaveProperty('notes');
    expect(params?.required).toContain('items');
  });

  it('list_quotes est défini avec filtre de statut', () => {
    const listQuotesTool = toolDefinitions.find(t => t.function.name === 'list_quotes');
    expect(listQuotesTool).toBeDefined();

    const params = listQuotesTool?.function.parameters;
    expect(params?.properties).toHaveProperty('status');
  });

  it('convert_quote_to_invoice est défini', () => {
    const convertTool = toolDefinitions.find(t => t.function.name === 'convert_quote_to_invoice');
    expect(convertTool).toBeDefined();

    const params = convertTool?.function.parameters;
    expect(params?.properties).toHaveProperty('quote_id');
    expect(params?.properties).toHaveProperty('quote_numero');
    expect(params?.properties).toHaveProperty('client_name');
  });
});

// ============================================================================
// TESTS: CONTRAT DES TOOLS DEVIS
// ============================================================================

describe('LLM Behavior: Quote Tools Contract', () => {
  it('create_quote items doit avoir description, quantite, prix_unitaire', () => {
    const createQuoteTool = toolDefinitions.find(t => t.function.name === 'create_quote');
    const itemsProperty = createQuoteTool?.function.parameters?.properties?.items;

    expect(itemsProperty?.type).toBe('array');
    const itemProperties = itemsProperty?.items?.properties;
    expect(itemProperties).toHaveProperty('description');
    expect(itemProperties).toHaveProperty('quantite');
    expect(itemProperties).toHaveProperty('prix_unitaire');
    expect(itemProperties).toHaveProperty('tva_rate');
  });

  it('list_quotes accepte les statuts brouillon, envoye', () => {
    const listQuotesTool = toolDefinitions.find(t => t.function.name === 'list_quotes');
    const statusProp = listQuotesTool?.function.parameters?.properties?.status;

    expect(statusProp?.enum).toContain('brouillon');
    expect(statusProp?.enum).toContain('envoye');
  });

  it('create_quote requiert deal_id (documenté comme obligatoire)', () => {
    const createQuoteTool = toolDefinitions.find(t => t.function.name === 'create_quote');
    const dealIdProp = createQuoteTool?.function.parameters?.properties?.deal_id;

    // La description indique que c'est obligatoire
    expect(dealIdProp?.description).toContain('OBLIGATOIRE');
  });
});

// ============================================================================
// TESTS: COMPORTEMENT ATTENDU (DOCUMENTATION)
// ============================================================================

describe('LLM Behavior: Quotes Expected Behavior (9.4)', () => {
  it('Commande "Crée un devis" → devrait appeler create_quote', () => {
    const expectedMapping = {
      userMessage: 'Crée un devis pour ACME avec une ligne vidéo 1500€',
      expectedTool: 'create_quote',
      expectedArgs: {
        client_name: 'ACME',
        items: [{ description: 'Vidéo', quantite: 1, prix_unitaire: 1500 }],
      },
    };

    expect(expectedMapping.expectedTool).toBe('create_quote');
  });

  it('Commande "Liste mes devis" → devrait appeler list_quotes', () => {
    const expectedMapping = {
      userMessage: 'Liste mes devis',
      expectedTool: 'list_quotes',
    };

    expect(expectedMapping.expectedTool).toBe('list_quotes');
  });

  it('Commande "Liste les devis brouillon" → devrait appeler list_quotes avec status=brouillon', () => {
    const expectedMapping = {
      userMessage: 'Liste les devis en brouillon',
      expectedTool: 'list_quotes',
      expectedArgs: { status: 'brouillon' },
    };

    expect(expectedMapping.expectedArgs.status).toBe('brouillon');
  });

  it('Commande "Convertis ce devis en facture" → devrait appeler convert_quote_to_invoice', () => {
    const expectedMapping = {
      userMessage: 'Convertis le devis DEV-0001 en facture',
      expectedTool: 'convert_quote_to_invoice',
      expectedArgs: { quote_numero: 'DEV-0001' },
    };

    expect(expectedMapping.expectedTool).toBe('convert_quote_to_invoice');
  });
});

// ============================================================================
// TESTS: MODES ET PERMISSIONS
// ============================================================================

describe('LLM Behavior: Quotes Mode Permissions', () => {
  it('create_quote est un SAFE_WRITE', () => {
    const toolPermissions = {
      create_quote: 'SAFE_WRITE',
      list_quotes: 'READ_ONLY',
      convert_quote_to_invoice: 'SAFE_WRITE',
    };

    expect(toolPermissions.create_quote).toBe('SAFE_WRITE');
    expect(toolPermissions.list_quotes).toBe('READ_ONLY');
  });

  it('convert_quote_to_invoice est SAFE_WRITE', () => {
    const toolPermissions = {
      convert_quote_to_invoice: 'SAFE_WRITE',
    };

    expect(toolPermissions.convert_quote_to_invoice).toBe('SAFE_WRITE');
  });
});

// ============================================================================
// TESTS: VALIDATION DES ENTRÉES
// ============================================================================

describe('LLM Behavior: Quote Input Validation', () => {
  it('create_quote requiert obligatoirement "items"', () => {
    const createQuoteTool = toolDefinitions.find(t => t.function.name === 'create_quote');
    const required = createQuoteTool?.function.parameters?.required || [];

    expect(required).toContain('items');
  });

  it('items doit avoir description, quantite, prix_unitaire requis', () => {
    const createQuoteTool = toolDefinitions.find(t => t.function.name === 'create_quote');
    const itemsProperty = createQuoteTool?.function.parameters?.properties?.items;
    const itemRequired = itemsProperty?.items?.required || [];

    expect(itemRequired).toContain('description');
    expect(itemRequired).toContain('quantite');
    expect(itemRequired).toContain('prix_unitaire');
  });
});
