/**
 * Client-side types and utilities for building RenderContext from API data
 * Used for real-time template preview rendering
 */

import type { Company, CustomField } from '@/lib/types/settings';
import type { RenderContext, DocumentData, ClientData, LineItem } from './buildRenderContext';

/**
 * Data returned by /api/settings/template-context
 */
export interface TemplateContextData {
  company: Company | null;
  companyFields: CustomField[];
  clientFields: CustomField[];
  companyFieldValues: { field_id: string; value_text: string | null }[];
  docType?: 'invoice' | 'quote';
}

/**
 * Build a mock RenderContext for template preview on the client side
 * Uses real company data but mock document/client data
 */
export function buildClientRenderContext(data: TemplateContextData): RenderContext {
  const { company, companyFields, clientFields, companyFieldValues, docType = 'invoice' } = data;

  // Map company field values by field key
  const companyFieldValuesMap: Record<string, string> = {};
  for (const value of companyFieldValues) {
    const field = companyFields.find(f => f.id === value.field_id);
    if (field && value.value_text) {
      companyFieldValuesMap[field.key] = value.value_text;
    }
  }

  // Build field definitions map
  const companyFieldDefs: Record<string, CustomField> = {};
  for (const field of companyFields) {
    companyFieldDefs[field.key] = field;
  }

  const clientFieldDefs: Record<string, CustomField> = {};
  for (const field of clientFields) {
    clientFieldDefs[field.key] = field;
  }

  // Mock document data - adapted to doc type
  const today = new Date();
  const dueDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

  const mockDocument: DocumentData = {
    id: 'preview',
    numero: docType === 'invoice' ? 'FA-001-25' : 'DE-001-25',
    date: today.toISOString().split('T')[0],
    date_echeance: dueDate.toISOString().split('T')[0],
    status: 'brouillon',
    total_ht: 1500.00,
    total_tva: 300.00,
    total_ttc: 1800.00,
    notes: 'Merci pour votre confiance.',
    conditions: docType === 'invoice'
      ? 'Paiement à 30 jours par virement bancaire'
      : 'Devis valable 30 jours',
  };

  // Mock client data
  const mockClient: ClientData = {
    id: 'preview-client',
    nom: 'Client Exemple SARL',
    email: 'contact@exemple.com',
    phone: '+212 522 123 456',
    address: '123 Boulevard Mohammed V\nCasablanca 20000',
    type: 'entreprise',
    country: 'MA',
  };

  // Mock line items
  const mockLineItems: LineItem[] = [
    {
      id: '1',
      description: 'Prestation de conseil',
      quantity: 10,
      unit_price: 100,
      tva_rate: 20,
      total_ht: 1000,
    },
    {
      id: '2',
      description: 'Développement sur mesure',
      quantity: 5,
      unit_price: 100,
      tva_rate: 20,
      total_ht: 500,
    },
  ];

  // Mock client field values (use all client fields with example values)
  const mockClientFieldValues: Record<string, string> = {};
  for (const field of clientFields) {
    // Generate mock value based on field key
    if (field.key === 'ice') {
      mockClientFieldValues[field.key] = '001234567890123';
    } else if (field.key === 'rc') {
      mockClientFieldValues[field.key] = 'RC-12345';
    } else {
      mockClientFieldValues[field.key] = `Valeur ${field.label}`;
    }
  }

  return {
    entityType: docType,
    entityId: 'preview',
    company: company,
    client: mockClient,
    document: mockDocument,
    lineItems: mockLineItems,
    fields: {
      company: companyFieldValuesMap,
      client: mockClientFieldValues,
      document: {},
    },
    fieldDefinitions: {
      company: companyFieldDefs,
      client: clientFieldDefs,
      document: {},
    },
    template: null,
    blocksByZone: {} as Record<string, never>,
  };
}
