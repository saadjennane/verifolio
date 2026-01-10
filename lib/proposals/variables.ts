/**
 * Proposal Variables Engine
 *
 * Replaces {{key}} placeholders in text with values from a context.
 * Variables are resolved in priority order:
 * 1. proposal_variables (custom overrides)
 * 2. deal (deal_title, deal_amount)
 * 3. client (client_name, client_email, client_address)
 * 4. contact (contact_name, contact_email, contact_phone)
 * 5. company (company_name, company_email, company_phone, company_address)
 *
 * Unknown variables are left as-is ({{unknown_key}}) for visibility.
 */

// ============================================================================
// Types
// ============================================================================

export interface VariableContext {
  // Custom overrides (highest priority)
  custom?: Record<string, string>;

  // Deal data
  deal?: {
    title?: string | null;
    amount?: number | null;
    currency?: string | null;
    description?: string | null;
  };

  // Client data
  client?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    postal_code?: string | null;
    country?: string | null;
  };

  // Primary contact
  contact?: {
    civility?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    full_name?: string | null;
    email?: string | null;
    phone?: string | null;
  };

  // Company (user's company)
  company?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    postal_code?: string | null;
    country?: string | null;
    siret?: string | null;
    vat_number?: string | null;
  };
}

// ============================================================================
// Variable Resolution
// ============================================================================

/**
 * Build a flat key-value map from the context.
 * Keys follow snake_case convention.
 */
export function buildVariableMap(context: VariableContext): Record<string, string> {
  const map: Record<string, string> = {};

  // Company variables (lowest priority, added first)
  if (context.company) {
    const c = context.company;
    if (c.name) map['company_name'] = c.name;
    if (c.email) map['company_email'] = c.email;
    if (c.phone) map['company_phone'] = c.phone;
    if (c.address) map['company_address'] = c.address;
    if (c.city) map['company_city'] = c.city;
    if (c.postal_code) map['company_postal_code'] = c.postal_code;
    if (c.country) map['company_country'] = c.country;
    if (c.siret) map['company_siret'] = c.siret;
    if (c.vat_number) map['company_vat_number'] = c.vat_number;

    // Full address helper
    const addressParts = [c.address, c.postal_code, c.city, c.country].filter(Boolean);
    if (addressParts.length > 0) {
      map['company_full_address'] = addressParts.join(', ');
    }
  }

  // Contact variables
  if (context.contact) {
    const ct = context.contact;
    if (ct.full_name) {
      map['contact_name'] = ct.full_name;
    } else if (ct.first_name || ct.last_name) {
      map['contact_name'] = [ct.first_name, ct.last_name].filter(Boolean).join(' ');
    }
    if (ct.first_name) map['contact_first_name'] = ct.first_name;
    if (ct.last_name) map['contact_last_name'] = ct.last_name;
    if (ct.civility) map['contact_civility'] = ct.civility;
    if (ct.email) map['contact_email'] = ct.email;
    if (ct.phone) map['contact_phone'] = ct.phone;
  }

  // Client variables
  if (context.client) {
    const cl = context.client;
    if (cl.name) map['client_name'] = cl.name;
    if (cl.email) map['client_email'] = cl.email;
    if (cl.phone) map['client_phone'] = cl.phone;
    if (cl.address) map['client_address'] = cl.address;
    if (cl.city) map['client_city'] = cl.city;
    if (cl.postal_code) map['client_postal_code'] = cl.postal_code;
    if (cl.country) map['client_country'] = cl.country;

    // Full address helper
    const addressParts = [cl.address, cl.postal_code, cl.city, cl.country].filter(Boolean);
    if (addressParts.length > 0) {
      map['client_full_address'] = addressParts.join(', ');
    }
  }

  // Deal variables
  if (context.deal) {
    const d = context.deal;
    if (d.title) map['deal_title'] = d.title;
    if (d.description) map['deal_description'] = d.description;
    if (d.amount !== null && d.amount !== undefined) {
      map['deal_amount'] = formatAmount(d.amount, d.currency || 'EUR');
      map['deal_amount_raw'] = d.amount.toString();
    }
    if (d.currency) map['deal_currency'] = d.currency;
  }

  // Custom overrides (highest priority, added last to override)
  if (context.custom) {
    for (const [key, value] of Object.entries(context.custom)) {
      if (value !== null && value !== undefined && value !== '') {
        map[key] = value;
      }
    }
  }

  return map;
}

/**
 * Format an amount with currency symbol
 */
function formatAmount(amount: number, currency: string): string {
  const symbols: Record<string, string> = {
    EUR: '€',
    USD: '$',
    GBP: '£',
    CHF: 'CHF',
  };
  const symbol = symbols[currency] || currency;
  const formatted = amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${formatted} ${symbol}`;
}

// ============================================================================
// Template Rendering
// ============================================================================

/**
 * Replace all {{key}} placeholders in text with values from the variable map.
 * Unknown variables are left as-is for visibility.
 *
 * @param text - The template text with {{key}} placeholders
 * @param variables - Key-value map of variable values
 * @returns The rendered text with placeholders replaced
 */
export function renderTemplate(text: string, variables: Record<string, string>): string {
  if (!text) return '';

  // Match {{key}} where key is snake_case (letters, numbers, underscores)
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = variables[key];
    // If value exists and is not empty, use it; otherwise keep placeholder
    return value !== undefined && value !== '' ? value : match;
  });
}

/**
 * Render template text using a full context object.
 * Convenience function that builds the variable map internally.
 *
 * @param text - The template text with {{key}} placeholders
 * @param context - The variable context with all data sources
 * @returns The rendered text with placeholders replaced
 */
export function renderTemplateWithContext(text: string, context: VariableContext): string {
  const variables = buildVariableMap(context);
  return renderTemplate(text, variables);
}

/**
 * Extract all variable keys from a template text.
 * Useful for showing which variables are used.
 *
 * @param text - The template text
 * @returns Array of unique variable keys found
 */
export function extractVariableKeys(text: string): string[] {
  if (!text) return [];

  const matches = text.match(/\{\{(\w+)\}\}/g);
  if (!matches) return [];

  // Extract keys and deduplicate
  const keys = matches.map((m) => m.slice(2, -2));
  return [...new Set(keys)];
}

// ============================================================================
// Context Building from Proposal
// ============================================================================

/**
 * Build a variable context from a proposal with its relations.
 * This is the main function to use when rendering a proposal.
 */
export function buildContextFromProposal(proposal: {
  variables?: { key: string; value: string }[];
  deal?: {
    title?: string | null;
    estimated_amount?: number | null;
    currency?: string | null;
    description?: string | null;
  } | null;
  client?: {
    nom?: string | null;
    email?: string | null;
    telephone?: string | null;
    adresse?: string | null;
    ville?: string | null;
    code_postal?: string | null;
    pays?: string | null;
  } | null;
  recipients?: Array<{
    contact?: {
      civilite?: string | null;
      prenom?: string | null;
      nom?: string | null;
      email?: string | null;
      telephone?: string | null;
    } | null;
  }>;
  company?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    postal_code?: string | null;
    country?: string | null;
    siret?: string | null;
    vat_number?: string | null;
  } | null;
}): VariableContext {
  const context: VariableContext = {};

  // Custom variables from proposal_variables
  if (proposal.variables && proposal.variables.length > 0) {
    context.custom = {};
    for (const v of proposal.variables) {
      context.custom[v.key] = v.value;
    }
  }

  // Deal
  if (proposal.deal) {
    context.deal = {
      title: proposal.deal.title,
      amount: proposal.deal.estimated_amount,
      currency: proposal.deal.currency,
      description: proposal.deal.description,
    };
  }

  // Client
  if (proposal.client) {
    context.client = {
      name: proposal.client.nom,
      email: proposal.client.email,
      phone: proposal.client.telephone,
      address: proposal.client.adresse,
      city: proposal.client.ville,
      postal_code: proposal.client.code_postal,
      country: proposal.client.pays,
    };
  }

  // Primary contact (first recipient)
  if (proposal.recipients && proposal.recipients.length > 0) {
    const primaryContact = proposal.recipients[0]?.contact;
    if (primaryContact) {
      context.contact = {
        civility: primaryContact.civilite,
        first_name: primaryContact.prenom,
        last_name: primaryContact.nom,
        full_name: [primaryContact.prenom, primaryContact.nom].filter(Boolean).join(' ') || null,
        email: primaryContact.email,
        phone: primaryContact.telephone,
      };
    }
  }

  // Company
  if (proposal.company) {
    context.company = {
      name: proposal.company.name,
      email: proposal.company.email,
      phone: proposal.company.phone,
      address: proposal.company.address,
      city: proposal.company.city,
      postal_code: proposal.company.postal_code,
      country: proposal.company.country,
      siret: proposal.company.siret,
      vat_number: proposal.company.vat_number,
    };
  }

  return context;
}

/**
 * Render all sections of a proposal with variables replaced.
 */
export function renderProposalSections(
  sections: { id: string; title: string; body: string; position: number; is_enabled: boolean }[],
  context: VariableContext
): { id: string; title: string; body: string; position: number; is_enabled: boolean }[] {
  const variables = buildVariableMap(context);

  return sections.map((section) => ({
    ...section,
    title: renderTemplate(section.title, variables),
    body: renderTemplate(section.body, variables),
  }));
}

/**
 * Get all available variable keys with descriptions.
 * Useful for documentation and UI helpers.
 */
export function getAvailableVariables(): { key: string; description: string; source: string }[] {
  return [
    // Custom
    { key: 'custom_*', description: 'Variables personnalisées', source: 'custom' },

    // Deal
    { key: 'deal_title', description: 'Titre du deal', source: 'deal' },
    { key: 'deal_description', description: 'Description du deal', source: 'deal' },
    { key: 'deal_amount', description: 'Montant formaté (ex: 1 500,00 €)', source: 'deal' },
    { key: 'deal_amount_raw', description: 'Montant brut (ex: 1500)', source: 'deal' },
    { key: 'deal_currency', description: 'Devise (EUR, USD...)', source: 'deal' },

    // Client
    { key: 'client_name', description: 'Nom du client', source: 'client' },
    { key: 'client_email', description: 'Email du client', source: 'client' },
    { key: 'client_phone', description: 'Téléphone du client', source: 'client' },
    { key: 'client_address', description: 'Adresse du client', source: 'client' },
    { key: 'client_city', description: 'Ville du client', source: 'client' },
    { key: 'client_postal_code', description: 'Code postal du client', source: 'client' },
    { key: 'client_country', description: 'Pays du client', source: 'client' },
    { key: 'client_full_address', description: 'Adresse complète du client', source: 'client' },

    // Contact
    { key: 'contact_name', description: 'Nom complet du contact', source: 'contact' },
    { key: 'contact_first_name', description: 'Prénom du contact', source: 'contact' },
    { key: 'contact_last_name', description: 'Nom du contact', source: 'contact' },
    { key: 'contact_civility', description: 'Civilité (M., Mme...)', source: 'contact' },
    { key: 'contact_email', description: 'Email du contact', source: 'contact' },
    { key: 'contact_phone', description: 'Téléphone du contact', source: 'contact' },

    // Company
    { key: 'company_name', description: 'Nom de l\'entreprise', source: 'company' },
    { key: 'company_email', description: 'Email de l\'entreprise', source: 'company' },
    { key: 'company_phone', description: 'Téléphone de l\'entreprise', source: 'company' },
    { key: 'company_address', description: 'Adresse de l\'entreprise', source: 'company' },
    { key: 'company_city', description: 'Ville de l\'entreprise', source: 'company' },
    { key: 'company_postal_code', description: 'Code postal de l\'entreprise', source: 'company' },
    { key: 'company_country', description: 'Pays de l\'entreprise', source: 'company' },
    { key: 'company_full_address', description: 'Adresse complète de l\'entreprise', source: 'company' },
    { key: 'company_siret', description: 'Numéro SIRET', source: 'company' },
    { key: 'company_vat_number', description: 'Numéro de TVA', source: 'company' },
  ];
}
