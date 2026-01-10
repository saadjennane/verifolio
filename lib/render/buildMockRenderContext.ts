import type { SupabaseClient } from '@supabase/supabase-js';
import { getCompany } from '@/lib/settings/company';
import { listCustomFields, listFieldValuesForEntity } from '@/lib/settings/custom-fields';
import type { RenderContext, DocumentData, ClientData, LineItem } from './buildRenderContext';
import type { Company, CustomField } from '@/lib/types/settings';

/**
 * Build a mock RenderContext for template preview
 * Uses real company data but mock document/client data
 */
export async function buildMockRenderContext(
  supabase: SupabaseClient,
  userId: string
): Promise<RenderContext> {
  // Get real company data
  const company = await getCompany(supabase, userId);

  // Get custom field definitions
  const companyFields = await listCustomFields(supabase, userId, 'company');
  const clientFields = await listCustomFields(supabase, userId, 'client');

  // Get company field values if company exists
  let companyFieldValues: Record<string, string> = {};
  if (company) {
    const values = await listFieldValuesForEntity(supabase, userId, 'company', company.id);
    // Map field values by field key
    for (const value of values) {
      const field = companyFields.find(f => f.id === value.field_id);
      if (field && value.value_text) {
        companyFieldValues[field.key] = value.value_text;
      }
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

  // Mock document data
  const today = new Date();
  const dueDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

  const mockDocument: DocumentData = {
    id: 'preview',
    numero: 'FA-001-25',
    date: today.toISOString().split('T')[0],
    date_echeance: dueDate.toISOString().split('T')[0],
    status: 'brouillon',
    total_ht: 1500.00,
    total_tva: 300.00,
    total_ttc: 1800.00,
    notes: 'Merci pour votre confiance.',
    conditions: 'Paiement à 30 jours par virement bancaire',
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

  // Mock client field values (ICE example)
  const mockClientFieldValues: Record<string, string> = {
    ice: '001234567890123',
  };

  return {
    entityType: 'invoice',
    entityId: 'preview',
    company: company as Company | null,
    client: mockClient,
    document: mockDocument,
    lineItems: mockLineItems,
    fields: {
      company: companyFieldValues,
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
