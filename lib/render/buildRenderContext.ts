import { SupabaseClient } from '@supabase/supabase-js';
import { getCompany } from '@/lib/settings/company';
import { listCustomFields, listFieldValuesForEntity } from '@/lib/settings/custom-fields';
import { getDefaultTemplate, getTemplate, getTemplateBlocksByZone } from '@/lib/settings/templates';
import type {
  Company,
  CustomField,
  CustomFieldValue,
  Template,
  TemplateBlock,
  TemplateZone,
  DocType,
  EntityType,
} from '@/lib/types/settings';

// ============================================================================
// Types
// ============================================================================

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  tva_rate: number;
  total_ht: number;
}

export interface DocumentData {
  id: string;
  numero: string;
  date: string;
  date_echeance?: string;
  status: string;
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  notes?: string;
  conditions?: string;
}

export interface ClientData {
  id: string;
  nom: string;
  email?: string;
  phone?: string;
  address?: string;
  type: 'particulier' | 'entreprise';
  country?: string;
}

export interface RenderBlock extends TemplateBlock {
  // Resolved field info for field-type blocks
  fieldKey?: string;
  fieldLabel?: string;
  fieldValue?: string;
}

export interface RenderContext {
  // Entity info
  entityType: 'quote' | 'invoice';
  entityId: string;

  // Core data
  company: Company | null;
  client: ClientData | null;
  document: DocumentData | null;
  lineItems: LineItem[];

  // Custom field values by scope, keyed by field key
  fields: {
    company: Record<string, string>;
    client: Record<string, string>;
    document: Record<string, string>;
  };

  // Custom field definitions (for labels)
  fieldDefinitions: {
    company: Record<string, CustomField>;
    client: Record<string, CustomField>;
    document: Record<string, CustomField>;
  };

  // Template info
  template: Template | null;
  blocksByZone: Record<TemplateZone, RenderBlock[]>;
}

export interface BuildRenderContextParams {
  entityType: 'quote' | 'invoice';
  entityId: string;
  templateId?: string;
}

// ============================================================================
// Main Function
// ============================================================================

export async function buildRenderContext(
  supabase: SupabaseClient,
  userId: string,
  params: BuildRenderContextParams
): Promise<RenderContext> {
  const { entityType, entityId, templateId } = params;

  // Initialize context with defaults
  const context: RenderContext = {
    entityType,
    entityId,
    company: null,
    client: null,
    document: null,
    lineItems: [],
    fields: {
      company: {},
      client: {},
      document: {},
    },
    fieldDefinitions: {
      company: {},
      client: {},
      document: {},
    },
    template: null,
    blocksByZone: {
      header: [],
      doc_info: [],
      client: [],
      items: [],
      totals: [],
      footer: [],
    },
  };

  // Fetch all data in parallel where possible
  const [
    company,
    companyFields,
    clientFields,
    documentFields,
    documentResult,
  ] = await Promise.all([
    // Company
    getCompany(supabase, userId),
    // Custom field definitions
    listCustomFields(supabase, userId, 'company'),
    listCustomFields(supabase, userId, 'client'),
    listCustomFields(supabase, userId, 'document'),
    // Document (quote or invoice)
    fetchDocument(supabase, entityType, entityId),
  ]);

  context.company = company;

  // Store field definitions
  companyFields.forEach(f => {
    context.fieldDefinitions.company[f.key] = f;
  });
  clientFields.forEach(f => {
    context.fieldDefinitions.client[f.key] = f;
  });
  documentFields.forEach(f => {
    context.fieldDefinitions.document[f.key] = f;
  });

  // Process document data
  if (documentResult) {
    const doc = documentResult as Record<string, string | number | null>;
    context.document = {
      id: String(doc.id || ''),
      numero: String(doc.numero || ''),
      date: String(doc.date || ''),
      date_echeance: doc.date_echeance ? String(doc.date_echeance) : undefined,
      status: String(doc.status || doc.statut || ''),
      total_ht: Number(doc.total_ht) || 0,
      total_tva: Number(doc.total_tva) || 0,
      total_ttc: Number(doc.total_ttc) || 0,
      notes: doc.notes ? String(doc.notes) : undefined,
      conditions: doc.conditions ? String(doc.conditions) : undefined,
    };

    // Fetch client
    if (doc.client_id) {
      context.client = await fetchClient(supabase, String(doc.client_id));
    }

    // Fetch line items
    context.lineItems = await fetchLineItems(supabase, entityType, entityId);
  }

  // Fetch custom field values
  const [companyValues, clientValues, documentValues] = await Promise.all([
    company ? listFieldValuesForEntity(supabase, userId, 'company', company.id) : [],
    context.client ? listFieldValuesForEntity(supabase, userId, 'client', context.client.id) : [],
    listFieldValuesForEntity(supabase, userId, entityType as EntityType, entityId),
  ]);

  // Map values to field keys
  context.fields.company = mapFieldValues(companyValues, companyFields);
  context.fields.client = mapFieldValues(clientValues, clientFields);
  context.fields.document = mapFieldValues(documentValues, documentFields);

  // Fetch template
  let template: Template | null = null;

  if (templateId) {
    template = await getTemplate(supabase, templateId, false) as Template | null;
  }

  if (!template) {
    // Get default template for this doc type
    const docType: DocType = entityType === 'quote' ? 'quote' : 'invoice';
    const defaultTemplate = await getDefaultTemplate(supabase, userId, docType);
    template = defaultTemplate;
  }

  if (template) {
    context.template = template;
    const blocksByZone = await getTemplateBlocksByZone(supabase, template.id);

    // Enrich blocks with field values
    for (const zone of Object.keys(blocksByZone) as TemplateZone[]) {
      context.blocksByZone[zone] = blocksByZone[zone].map(block =>
        enrichBlock(block, context)
      );
    }
  } else {
    // No template - create default blocks
    context.blocksByZone = createDefaultBlocks();
  }

  return context;
}

// ============================================================================
// Helper Functions
// ============================================================================

async function fetchDocument(
  supabase: SupabaseClient,
  entityType: 'quote' | 'invoice',
  entityId: string
): Promise<Record<string, unknown> | null> {
  const table = entityType === 'quote' ? 'quotes' : 'invoices';

  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('id', entityId)
    .single();

  if (error) {
    console.error(`fetchDocument error (${table}):`, error);
    return null;
  }

  return data;
}

async function fetchClient(
  supabase: SupabaseClient,
  clientId: string
): Promise<ClientData | null> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single();

  if (error) {
    console.error('fetchClient error:', error);
    return null;
  }

  return {
    id: data.id,
    nom: data.nom,
    email: data.email,
    phone: data.phone,
    address: data.address,
    type: data.type || 'particulier',
    country: data.country,
  };
}

async function fetchLineItems(
  supabase: SupabaseClient,
  entityType: 'quote' | 'invoice',
  entityId: string
): Promise<LineItem[]> {
  const foreignKey = entityType === 'quote' ? 'quote_id' : 'invoice_id';

  const { data, error } = await supabase
    .from('line_items')
    .select('*')
    .eq(foreignKey, entityId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('fetchLineItems error:', error);
    return [];
  }

  return (data || []).map(item => ({
    id: item.id,
    description: item.description,
    quantity: Number(item.quantity) || 0,
    unit_price: Number(item.unit_price) || 0,
    tva_rate: Number(item.tva_rate) || 0,
    total_ht: Number(item.total_ht) || 0,
  }));
}

function mapFieldValues(
  values: CustomFieldValue[],
  definitions: CustomField[]
): Record<string, string> {
  const result: Record<string, string> = {};

  // Create a map of field_id -> key
  const fieldIdToKey = new Map<string, string>();
  definitions.forEach(def => {
    fieldIdToKey.set(def.id, def.key);
  });

  values.forEach(val => {
    const key = fieldIdToKey.get(val.field_id);
    if (key && val.value_text) {
      result[key] = val.value_text;
    }
  });

  return result;
}

function enrichBlock(block: TemplateBlock, context: RenderContext): RenderBlock {
  const renderBlock: RenderBlock = { ...block };

  // For field-type blocks, resolve the field info
  if (block.field_id) {
    let fieldDef: CustomField | undefined;
    let fieldValue: string | undefined;

    switch (block.block_type) {
      case 'company_field':
        fieldDef = Object.values(context.fieldDefinitions.company).find(f => f.id === block.field_id);
        if (fieldDef) {
          fieldValue = context.fields.company[fieldDef.key];
        }
        break;
      case 'client_field':
        fieldDef = Object.values(context.fieldDefinitions.client).find(f => f.id === block.field_id);
        if (fieldDef) {
          fieldValue = context.fields.client[fieldDef.key];
        }
        break;
      case 'document_field':
        fieldDef = Object.values(context.fieldDefinitions.document).find(f => f.id === block.field_id);
        if (fieldDef) {
          fieldValue = context.fields.document[fieldDef.key];
        }
        break;
    }

    if (fieldDef) {
      renderBlock.fieldKey = fieldDef.key;
      renderBlock.fieldLabel = block.label_override || fieldDef.label;
      renderBlock.fieldValue = fieldValue || '';
    }
  }

  return renderBlock;
}

function createDefaultBlocks(): Record<TemplateZone, RenderBlock[]> {
  // Default block structure when no template exists
  const now = new Date().toISOString();
  const baseBlock = {
    template_id: '',
    field_id: null,
    label_override: null,
    is_visible: true,
    config: {},
    created_at: now,
    updated_at: now,
  };

  return {
    header: [
      { ...baseBlock, id: 'default-logo', zone: 'header', block_type: 'company_logo', sort_order: 0 },
      { ...baseBlock, id: 'default-contact', zone: 'header', block_type: 'company_contact', sort_order: 1 },
    ],
    doc_info: [],
    client: [
      { ...baseBlock, id: 'default-client', zone: 'client', block_type: 'client_contact', sort_order: 0 },
    ],
    items: [
      { ...baseBlock, id: 'default-items', zone: 'items', block_type: 'items_table', sort_order: 0 },
    ],
    totals: [
      { ...baseBlock, id: 'default-totals', zone: 'totals', block_type: 'totals_table', sort_order: 0 },
    ],
    footer: [
      { ...baseBlock, id: 'default-notes', zone: 'footer', block_type: 'notes', sort_order: 0 },
      { ...baseBlock, id: 'default-legal', zone: 'footer', block_type: 'legal_text', sort_order: 1 },
    ],
  };
}

// ============================================================================
// Export Types
// ============================================================================

export type { TemplateZone };
