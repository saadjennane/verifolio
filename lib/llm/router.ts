import { SupabaseClient } from '@supabase/supabase-js';
import type { ToolName } from './tools';
import { generateDocNumber, DEFAULT_PATTERNS } from '@/lib/numbering/generateDocNumber';
import { getCurrencySymbol } from '@/lib/utils/currency';
import { logActivity } from '@/lib/activity';
import type { ActivityEntityType, ActivityAction } from '@/lib/activity/types';
import {
  createTaskTemplate,
  listTaskTemplates,
  getTaskTemplate,
  updateTaskTemplate,
  deleteTaskTemplate,
  applyTaskTemplate,
  getEntityTasks,
  listTaskTemplateCategories,
  listTaskTemplateItemsByCategory,
  type TaskTemplateWithCounts,
  type TemplateTargetEntityType,
} from '@/lib/tasks/templates';
import type { TaskEntityType } from '@/lib/tasks/types';

type Supabase = SupabaseClient;

// Mapping des tools vers les types d'entité pour le logging
const TOOL_TO_ENTITY: Record<string, { entityType: ActivityEntityType; action: ActivityAction }> = {
  create_client: { entityType: 'client', action: 'create' },
  update_client: { entityType: 'client', action: 'update' },
  create_contact: { entityType: 'contact', action: 'create' },
  update_contact: { entityType: 'contact', action: 'update' },
  create_deal: { entityType: 'deal', action: 'create' },
  update_deal_status: { entityType: 'deal', action: 'update' },
  create_mission: { entityType: 'mission', action: 'create' },
  update_mission_status: { entityType: 'mission', action: 'update' },
  create_quote: { entityType: 'quote', action: 'create' },
  create_invoice: { entityType: 'invoice', action: 'create' },
  convert_quote_to_invoice: { entityType: 'invoice', action: 'create' },
  mark_invoice_paid: { entityType: 'invoice', action: 'update' },
  create_proposal: { entityType: 'proposal', action: 'create' },
  set_proposal_status: { entityType: 'proposal', action: 'update' },
  create_brief: { entityType: 'brief', action: 'create' },
  send_brief: { entityType: 'brief', action: 'update' },
  create_review_request: { entityType: 'review_request', action: 'create' },
  create_payment: { entityType: 'payment', action: 'create' },
  update_payment: { entityType: 'payment', action: 'update' },
  delete_payment: { entityType: 'payment', action: 'delete' },
};

// Extraire le titre de l'entité depuis le résultat
function extractEntityTitle(toolName: string, result: ToolResult): string {
  const data = result.data as Record<string, unknown> | undefined;
  if (!data) return 'Sans titre';

  // Chercher le titre dans différents champs possibles
  if (data.nom) return data.nom as string;
  if (data.title) return data.title as string;
  if (data.numero) return data.numero as string;
  if (data.name) return data.name as string;

  return 'Sans titre';
}

// Extraire l'ID de l'entité depuis le résultat
function extractEntityId(result: ToolResult): string | null {
  const data = result.data as Record<string, unknown> | undefined;
  if (!data) return null;
  return (data.id as string) || null;
}

interface ToolResult {
  success: boolean;
  data?: unknown;
  message: string;
}

export async function executeToolCall(
  supabase: Supabase,
  userId: string | null,
  toolName: ToolName,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const result = await executeToolCallInternal(supabase, userId, toolName, args);

  // Log activity for CRUD operations from assistant
  if (result.success && TOOL_TO_ENTITY[toolName]) {
    const { entityType, action } = TOOL_TO_ENTITY[toolName];
    const entityId = extractEntityId(result);
    const entityTitle = extractEntityTitle(toolName, result);

    if (entityId) {
      await logActivity({
        action,
        entity_type: entityType,
        entity_id: entityId,
        entity_title: entityTitle,
        source: 'assistant',
      });
    }
  }

  return result;
}

async function executeToolCallInternal(
  supabase: Supabase,
  userId: string | null,
  toolName: ToolName,
  args: Record<string, unknown>
): Promise<ToolResult> {
  switch (toolName) {
    case 'create_client':
      return await createClient(supabase, userId, args);
    case 'list_clients':
      return await listClients(supabase, userId);
    case 'update_client':
      return await updateClient(supabase, userId, args);
    case 'get_client_overview':
      return await getClientOverview(supabase, userId, args);
    case 'create_quote':
      return await createQuote(supabase, userId, args);
    case 'list_quotes':
      return await listQuotes(supabase, userId, args);
    case 'update_quote_status':
      return await updateQuoteStatus(supabase, userId, args);
    case 'create_invoice':
      return await createInvoice(supabase, userId, args);
    case 'list_invoices':
      return await listInvoices(supabase, userId, args);
    case 'update_invoice':
      return await updateInvoice(supabase, userId, args);
    case 'update_invoice_status':
      return await updateInvoiceStatus(supabase, userId, args);
    case 'convert_quote_to_invoice':
      return await convertQuoteToInvoice(supabase, userId, args);
    case 'mark_invoice_paid':
      return await markInvoicePaid(supabase, userId, args);
    case 'send_email':
      return await prepareSendEmail(supabase, userId, args);
    case 'get_financial_summary':
      return await getFinancialSummary(supabase, userId, args);
    case 'get_debts_to_suppliers':
      return await getDebtsToSuppliers(supabase, userId, args);
    case 'get_company_settings':
      return await getCompanySettings(supabase, userId);
    case 'update_company_settings':
      return await updateCompanySettings(supabase, userId, args);
    case 'list_custom_fields':
      return await listCustomFields(supabase, userId, args);
    case 'create_custom_field':
      return await createCustomField(supabase, userId, args);
    case 'update_custom_field_value':
      return await updateCustomFieldValue(supabase, userId, args);
    case 'delete_custom_field':
      return await deleteCustomField(supabase, userId, args);
    case 'list_templates':
      return await listTemplates(supabase, userId, args);
    case 'get_template_blocks':
      return await getTemplateBlocks(supabase, userId, args);
    case 'add_template_block':
      return await addTemplateBlock(supabase, userId, args);
    case 'update_template_block':
      return await updateTemplateBlock(supabase, userId, args);
    case 'remove_template_block':
      return await removeTemplateBlock(supabase, userId, args);
    case 'create_contact':
      return await createContact(supabase, userId, args);
    case 'list_contacts':
      return await listContacts(supabase, userId, args);
    case 'link_contact_to_client':
      return await linkContactToClient(supabase, userId, args);
    case 'unlink_contact_from_client':
      return await unlinkContactFromClient(supabase, userId, args);
    case 'update_contact':
      return await updateContact(supabase, userId, args);
    case 'update_client_contact':
      return await updateClientContact(supabase, userId, args);
    case 'get_contact_for_context':
      return await getContactForContext(supabase, userId, args);
    case 'list_proposal_templates':
      return await listProposalTemplates(supabase, userId);
    case 'create_proposal_template':
      return await createProposalTemplate(supabase, userId, args);
    case 'add_template_section':
      return await addProposalTemplateSection(supabase, userId, args);
    case 'list_proposals':
      return await listProposalsHandler(supabase, userId, args);
    case 'create_proposal':
      return await createProposalHandler(supabase, userId, args);
    case 'get_client_contacts_for_proposal':
      return await getClientContactsForProposal(supabase, userId, args);
    case 'set_proposal_recipients':
      return await setProposalRecipientsHandler(supabase, userId, args);
    case 'set_proposal_status':
      return await setProposalStatusHandler(supabase, userId, args);
    case 'get_proposal_public_link':
      return await getProposalPublicLink(supabase, userId, args);
    case 'proposal_create_page':
      return await proposalCreatePage(supabase, userId, args);
    case 'proposal_update_page':
      return await proposalUpdatePage(supabase, userId, args);
    case 'proposal_list_pages':
      return await proposalListPages(supabase, userId, args);
    case 'proposal_rewrite_content':
      return await proposalRewriteContent(args);
    // Deal tools
    case 'create_deal':
      return await createDeal(supabase, userId, args);
    case 'list_deals':
      return await listDeals(supabase, userId, args);
    case 'get_deal':
      return await getDeal(supabase, userId, args);
    case 'update_deal_status':
      return await updateDealStatus(supabase, userId, args);
    // Mission tools
    case 'create_mission':
      return await createMission(supabase, userId, args);
    case 'list_missions':
      return await listMissions(supabase, userId, args);
    case 'get_mission':
      return await getMission(supabase, userId, args);
    case 'update_mission_status':
      return await updateMissionStatus(supabase, userId, args);
    // Brief tools
    case 'list_brief_templates':
      return await listBriefTemplates(supabase, userId);
    case 'create_brief':
      return await createBrief(supabase, userId, args);
    case 'list_briefs':
      return await listBriefs(supabase, userId, args);
    case 'send_brief':
      return await sendBrief(supabase, userId, args);
    case 'update_brief_status':
      return await updateBriefStatus(supabase, userId, args);
    // Review tools
    case 'create_review_request':
      return await createReviewRequest(supabase, userId, args);
    case 'list_reviews':
      return await listReviews(supabase, userId, args);
    case 'list_review_requests':
      return await listReviewRequests(supabase, userId, args);
    // Payment tools
    case 'create_payment':
      return await createPayment(supabase, userId, args);
    case 'list_payments':
      return await listPaymentsHandler(supabase, userId, args);
    case 'update_payment':
      return await updatePaymentHandler(supabase, userId, args);
    case 'delete_payment':
      return await deletePaymentHandler(supabase, userId, args);
    case 'get_client_payment_balance':
      return await getClientPaymentBalanceHandler(supabase, userId, args);
    case 'get_mission_payments':
      return await getMissionPaymentsHandler(supabase, userId, args);
    case 'get_invoice_payments':
      return await getInvoicePaymentsHandler(supabase, userId, args);
    // Task template tools
    case 'create_task_template':
      return await createTaskTemplateHandler(supabase, userId, args);
    case 'list_task_templates':
      return await listTaskTemplatesHandler(supabase, userId, args);
    case 'list_task_template_categories':
      return await listTaskTemplateCategoriesHandler(supabase, userId);
    case 'get_task_template':
      return await getTaskTemplateHandler(supabase, userId, args);
    case 'update_task_template':
      return await updateTaskTemplateHandler(supabase, userId, args);
    case 'delete_task_template':
      return await deleteTaskTemplateHandler(supabase, userId, args);
    case 'apply_task_template':
      return await applyTaskTemplateHandler(supabase, userId, args);
    case 'get_entity_tasks':
      return await getEntityTasksHandler(supabase, userId, args);
    // UI Navigation
    case 'open_tab':
      return openTabHandler(args);
    default:
      return { success: false, message: `Outil inconnu: ${toolName}` };
  }
}

async function createClient(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const { type, nom, email, telephone, adresse, custom_fields } = args;

  if (!type || !nom) {
    return { success: false, message: 'Le type et le nom sont requis' };
  }

  const { data, error } = await supabase
    .from('clients')
    .insert({
      user_id: userId || null,
      type: type as 'particulier' | 'entreprise',
      nom: nom as string,
      email: (email as string) || null,
      telephone: (telephone as string) || null,
      adresse: (adresse as string) || null,
    })
    .select()
    .single();

  if (error) {
    return { success: false, message: `Erreur: ${error.message}` };
  }

  // Save custom field values if provided
  const customFieldsData = custom_fields as Record<string, string> | undefined;
  if (customFieldsData && Object.keys(customFieldsData).length > 0) {
    // Get all active custom fields for clients
    const { data: fields } = await supabase
      .from('custom_fields')
      .select('id, label')
      .eq('user_id', userId)
      .eq('scope', 'client')
      .eq('is_active', true);

    if (fields) {
      // Create a map from label (lowercase) to field id
      const fieldMap = new Map<string, string>();
      for (const f of fields) {
        fieldMap.set(f.label.toLowerCase(), f.id);
      }

      // Save each custom field value
      for (const [label, value] of Object.entries(customFieldsData)) {
        const fieldId = fieldMap.get(label.toLowerCase());
        if (fieldId && value) {
          await supabase.from('custom_field_values').upsert(
            {
              user_id: userId,
              field_id: fieldId,
              entity_type: 'client',
              entity_id: data.id,
              value_text: value,
            },
            { onConflict: 'user_id,field_id,entity_type,entity_id' }
          );
        }
      }
    }
  }

  return {
    success: true,
    data,
    message: `Client "${data.nom}" créé avec succès (${data.type}).\n(ID: ${data.id})`,
  };
}

async function listClients(supabase: Supabase, userId: string | null): Promise<ToolResult> {
  let query = supabase.from('clients').select('*').order('nom');

  // Filtrer par userId seulement si connecté
  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;

  if (error) {
    return { success: false, message: `Erreur: ${error.message}` };
  }

  if (!data || data.length === 0) {
    return { success: true, data: [], message: 'Aucun client trouvé.' };
  }

  const clientList = data.map(c => `- ${c.nom} (${c.type})${c.email ? ` - ${c.email}` : ''}`).join('\n');

  return {
    success: true,
    data,
    message: `${data.length} client(s) trouvé(s):\n${clientList}`,
  };
}

async function findClientByName(
  supabase: Supabase,
  userId: string | null,
  name: string
): Promise<{ id: string; nom: string; email: string | null } | null> {
  let query = supabase
    .from('clients')
    .select('id, nom, email')
    .ilike('nom', `%${name}%`)
    .limit(1);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data } = await query.single();

  return data;
}

async function updateClient(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const { client_id, client_name, email, telephone, adresse, custom_fields } = args;

  // Find client by ID or name
  let clientId = client_id as string | undefined;
  let clientData: { id: string; nom: string } | null = null;

  if (!clientId && client_name) {
    const found = await findClientByName(supabase, userId, client_name as string);
    if (found) {
      clientId = found.id;
      clientData = found;
    }
  }

  if (!clientId) {
    return { success: false, message: 'Client non trouvé. Précisez le nom ou l\'ID du client.' };
  }

  // Build update object with only provided fields
  const updates: Record<string, unknown> = {};
  if (email !== undefined) updates.email = email;
  if (telephone !== undefined) updates.telephone = telephone;
  if (adresse !== undefined) updates.adresse = adresse;

  // Update client basic fields if any
  if (Object.keys(updates).length > 0) {
    const { error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', clientId)
      .eq('user_id', userId);

    if (error) {
      return { success: false, message: `Erreur: ${error.message}` };
    }
  }

  // Update custom field values if provided
  const customFieldsData = custom_fields as Record<string, string> | undefined;
  if (customFieldsData && Object.keys(customFieldsData).length > 0) {
    const { data: fields } = await supabase
      .from('custom_fields')
      .select('id, label')
      .eq('user_id', userId)
      .eq('scope', 'client')
      .eq('is_active', true);

    if (fields) {
      const fieldMap = new Map<string, string>();
      for (const f of fields) {
        fieldMap.set(f.label.toLowerCase(), f.id);
      }

      for (const [label, value] of Object.entries(customFieldsData)) {
        const fieldId = fieldMap.get(label.toLowerCase());
        if (fieldId && value) {
          await supabase.from('custom_field_values').upsert(
            {
              user_id: userId,
              field_id: fieldId,
              entity_type: 'client',
              entity_id: clientId,
              value_text: value,
            },
            { onConflict: 'user_id,field_id,entity_type,entity_id' }
          );
        }
      }
    }
  }

  // Get updated client data
  const { data: updatedClient } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single();

  const updatedFields = [
    ...Object.keys(updates),
    ...(customFieldsData ? Object.keys(customFieldsData) : []),
  ];

  return {
    success: true,
    data: updatedClient,
    message: `Client "${updatedClient?.nom || clientData?.nom}" mis à jour (${updatedFields.join(', ')}).`,
  };
}

async function getClientOverview(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  if (!userId) {
    return {
      success: false,
      message: 'Vous devez être connecté pour voir les informations client.',
    };
  }

  const { client_id, client_name } = args;

  // Find client by ID or name
  let clientId = client_id as string | undefined;
  let client: { id: string; nom: string; email: string | null; telephone: string | null } | null = null;

  if (clientId) {
    const { data } = await supabase
      .from('clients')
      .select('id, nom, email, telephone')
      .eq('id', clientId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single();
    client = data;
  } else if (client_name) {
    const found = await findClientByName(supabase, userId, client_name as string);
    if (found) {
      clientId = found.id;
      const { data } = await supabase
        .from('clients')
        .select('id, nom, email, telephone')
        .eq('id', found.id)
        .single();
      client = data;
    }
  }

  if (!client || !clientId) {
    return {
      success: false,
      message: client_name
        ? `Client "${client_name}" non trouvé. Vérifiez le nom ou utilisez list_clients pour voir les clients existants.`
        : 'Précisez le nom du client pour voir sa situation.',
    };
  }

  // Fetch all related data in parallel
  const [dealsResult, missionsResult, quotesResult, invoicesResult, contactsResult] = await Promise.all([
    // Deals for this client
    supabase
      .from('deals')
      .select('id, title, status, estimated_value, created_at')
      .eq('client_id', clientId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10),

    // Missions for this client
    supabase
      .from('missions')
      .select('id, title, status, estimated_amount, created_at, deal:deals(title)')
      .eq('client_id', clientId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10),

    // Quotes for this client
    supabase
      .from('quotes')
      .select('id, numero, status, total_ttc, created_at')
      .eq('client_id', clientId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10),

    // Invoices for this client
    supabase
      .from('invoices')
      .select('id, numero, status, total_ttc, date_echeance, created_at')
      .eq('client_id', clientId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10),

    // Primary contact
    supabase
      .from('client_contacts')
      .select('contact:contacts(id, nom, prenom, email, telephone)')
      .eq('client_id', clientId)
      .eq('is_primary', true)
      .limit(1),
  ]);

  const deals = dealsResult.data || [];
  const missions = missionsResult.data || [];
  const quotes = quotesResult.data || [];
  const invoices = invoicesResult.data || [];

  // Extract primary contact (handling Supabase join which may return array or object)
  const contactData = contactsResult.data?.[0]?.contact;
  let primaryContact: { nom: string; prenom: string; email: string | null } | null = null;
  if (contactData) {
    if (Array.isArray(contactData)) {
      const first = contactData[0] as { nom?: string; prenom?: string; email?: string | null } | undefined;
      if (first) {
        primaryContact = { nom: first.nom || '', prenom: first.prenom || '', email: first.email || null };
      }
    } else {
      const c = contactData as { nom?: string; prenom?: string; email?: string | null };
      primaryContact = { nom: c.nom || '', prenom: c.prenom || '', email: c.email || null };
    }
  }

  // Calculate financial summary
  const unpaidInvoices = invoices.filter((i) => i.status !== 'payee');
  const totalUnpaid = unpaidInvoices.reduce((sum, i) => sum + (i.total_ttc || 0), 0);
  const paidInvoices = invoices.filter((i) => i.status === 'payee');
  const totalPaid = paidInvoices.reduce((sum, i) => sum + (i.total_ttc || 0), 0);

  // Categorize deals
  const activeDeals = deals.filter((d) => d.status === 'new' || d.status === 'sent');
  const wonDeals = deals.filter((d) => d.status === 'won');
  const lostDeals = deals.filter((d) => d.status === 'lost');

  // Categorize missions
  const activeMissions = missions.filter((m) => m.status === 'in_progress');
  const deliveredMissions = missions.filter((m) => m.status === 'delivered' || m.status === 'to_invoice');

  // Categorize quotes
  const pendingQuotes = quotes.filter((q) => q.status === 'brouillon' || q.status === 'envoye');

  // Build comprehensive message
  let message = `## Situation de ${client.nom}\n\n`;

  // Client info
  message += `**Contact** : ${client.email || 'Pas d\'email'}`;
  if (client.telephone) message += ` | ${client.telephone}`;
  if (primaryContact) {
    message += `\n**Contact principal** : ${primaryContact.prenom || ''} ${primaryContact.nom}`;
    if (primaryContact.email) message += ` (${primaryContact.email})`;
  }
  message += '\n\n';

  // Deals summary
  if (deals.length > 0) {
    message += `### Deals\n`;
    if (activeDeals.length > 0) {
      message += `**En cours** (${activeDeals.length}) :\n`;
      activeDeals.forEach((d) => {
        const value = d.estimated_value ? ` - ${d.estimated_value.toLocaleString('fr-FR')}€` : '';
        message += `• ${d.title}${value}\n`;
      });
    }
    if (wonDeals.length > 0) message += `✓ ${wonDeals.length} gagné(s)\n`;
    if (lostDeals.length > 0) message += `✗ ${lostDeals.length} perdu(s)\n`;
    message += '\n';
  } else {
    message += `### Deals\nAucun deal avec ce client.\n\n`;
  }

  // Missions summary
  if (missions.length > 0) {
    message += `### Missions\n`;
    if (activeMissions.length > 0) {
      message += `**En cours** (${activeMissions.length}) :\n`;
      activeMissions.forEach((m) => {
        const amount = m.estimated_amount ? ` - ${m.estimated_amount.toLocaleString('fr-FR')}€` : '';
        message += `• ${m.title}${amount}\n`;
      });
    }
    if (deliveredMissions.length > 0) {
      message += `**Livrées/À facturer** (${deliveredMissions.length}) :\n`;
      deliveredMissions.forEach((m) => {
        message += `• ${m.title}\n`;
      });
    }
    message += '\n';
  } else {
    message += `### Missions\nAucune mission avec ce client.\n\n`;
  }

  // Quotes summary
  if (quotes.length > 0) {
    message += `### Devis\n`;
    if (pendingQuotes.length > 0) {
      message += `**En attente** (${pendingQuotes.length}) :\n`;
      pendingQuotes.forEach((q) => {
        const amount = q.total_ttc ? ` - ${q.total_ttc.toLocaleString('fr-FR')}€` : '';
        message += `• ${q.numero || 'Sans numéro'}${amount} (${q.status})\n`;
      });
    }
    message += '\n';
  }

  // Financial summary
  message += `### Finances\n`;
  if (unpaidInvoices.length > 0) {
    message += `**Impayés** : ${totalUnpaid.toLocaleString('fr-FR')}€ (${unpaidInvoices.length} facture(s))\n`;
    unpaidInvoices.forEach((i) => {
      const overdue = i.date_echeance && new Date(i.date_echeance) < new Date() ? ' ⚠️ EN RETARD' : '';
      message += `• ${i.numero || 'Sans numéro'} - ${(i.total_ttc || 0).toLocaleString('fr-FR')}€${overdue}\n`;
    });
  } else {
    message += `**Impayés** : Aucun, ce client est à jour !\n`;
  }
  message += `**Total facturé** : ${(totalPaid + totalUnpaid).toLocaleString('fr-FR')}€`;
  if (paidInvoices.length > 0) {
    message += ` (dont ${totalPaid.toLocaleString('fr-FR')}€ encaissé)`;
  }

  return {
    success: true,
    data: {
      client,
      deals: { active: activeDeals.length, won: wonDeals.length, lost: lostDeals.length, items: deals },
      missions: { active: activeMissions.length, delivered: deliveredMissions.length, items: missions },
      quotes: { pending: pendingQuotes.length, items: quotes },
      invoices: { unpaid: unpaidInvoices.length, totalUnpaid, totalPaid, items: invoices },
    },
    message,
  };
}

async function createQuote(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  let clientId = args.client_id as string | undefined;
  let clientName = args.client_name as string | undefined;
  const dealId = args.deal_id as string | undefined;
  const items = args.items as Array<{
    description: string;
    quantite: number;
    prix_unitaire: number;
    tva_rate?: number;
  }>;
  const notes = args.notes as string | undefined;

  if (!items || items.length === 0) {
    return { success: false, message: 'Au moins une ligne est requise' };
  }

  // Vérifier que deal_id est fourni (obligatoire)
  if (!dealId) {
    return {
      success: false,
      message: 'deal_id obligatoire. À quel deal/opportunité veux-tu rattacher ce devis ? Utilise list_deals pour voir les deals existants, ou crée un nouveau deal.',
    };
  }

  // Détecter si client_id contient un nom au lieu d'un UUID
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (clientId && !uuidPattern.test(clientId)) {
    // client_id contient probablement un nom, pas un UUID
    clientName = clientId;
    clientId = undefined;
  }

  // Rechercher le client par nom si pas d'ID valide
  if (!clientId && clientName) {
    const client = await findClientByName(supabase, userId, clientName);
    if (client) {
      clientId = client.id;
    } else {
      return {
        success: false,
        message: `Client "${clientName}" non trouvé. Voulez-vous le créer ?`,
      };
    }
  }

  if (!clientId) {
    return { success: false, message: 'Veuillez spécifier un client' };
  }

  // Vérifier que le deal existe
  let dealName = '';
  if (dealId) {
    const { data: deal } = await supabase
      .from('deals')
      .select('name')
      .eq('id', dealId)
      .single();

    if (deal) {
      dealName = deal.name;
    }
  }

  // Récupérer les paramètres company
  const { data: company } = userId
    ? await supabase
        .from('companies')
        .select('quote_number_pattern, default_tax_rate, default_currency')
        .eq('user_id', userId)
        .single()
    : { data: null };

  const pattern = company?.quote_number_pattern || DEFAULT_PATTERNS.quote;
  const defaultTva = company?.default_tax_rate || 20;
  const currency = company?.default_currency || 'EUR';

  // Générer le numéro avec le nouveau système
  let numero: string;
  try {
    numero = await generateDocNumber({
      supabase,
      userId: userId || '00000000-0000-0000-0000-000000000001',
      docType: 'quote',
      pattern,
      date: new Date(),
    });
  } catch (error) {
    return {
      success: false,
      message: `Erreur de numérotation: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
    };
  }

  // Calculer les totaux
  let totalHT = 0;
  let totalTVA = 0;

  const lineItems = items.map((item, index) => {
    const tvaRate = item.tva_rate ?? defaultTva;
    const ht = item.quantite * item.prix_unitaire;
    const tva = ht * (tvaRate / 100);
    totalHT += ht;
    totalTVA += tva;

    return {
      description: item.description,
      quantite: item.quantite,
      prix_unitaire: item.prix_unitaire,
      tva_rate: tvaRate,
      montant_ht: ht,
      montant_tva: tva,
      montant_ttc: ht + tva,
      ordre: index,
    };
  });

  // Créer le devis
  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .insert({
      user_id: userId || null,
      client_id: clientId,
      deal_id: dealId || null,
      numero,
      date_emission: new Date().toISOString().split('T')[0],
      status: 'brouillon',
      devise: currency,
      total_ht: totalHT,
      total_tva: totalTVA,
      total_ttc: totalHT + totalTVA,
      notes: notes || null,
    })
    .select('*, client:clients(nom)')
    .single();

  if (quoteError || !quote) {
    return { success: false, message: `Erreur: ${quoteError?.message}` };
  }

  // Ajouter les lignes
  const lineItemsWithQuoteId = lineItems.map(item => ({
    ...item,
    quote_id: quote.id,
  }));

  await supabase.from('quote_line_items').insert(lineItemsWithQuoteId);

  // Note: Le compteur est maintenant géré automatiquement par generateDocNumber

  const clientNom = (quote.client as { nom: string })?.nom || 'Client';

  const dealInfo = dealName ? `\nDeal: ${dealName}` : '';
  return {
    success: true,
    data: quote,
    message: `Devis ${numero} créé pour ${clientNom}.${dealInfo}\nTotal: ${(totalHT + totalTVA).toFixed(2)} ${getCurrencySymbol(currency)} TTC\n(ID: ${quote.id})`,
  };
}

async function listQuotes(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const status = args.status as string | undefined;

  let query = supabase
    .from('quotes')
    .select('*, client:clients(nom)')
    .order('created_at', { ascending: false });

  if (userId) {
    query = query.eq('user_id', userId);
  }

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query.limit(10);

  if (error) {
    return { success: false, message: `Erreur: ${error.message}` };
  }

  if (!data || data.length === 0) {
    return { success: true, data: [], message: 'Aucun devis trouvé.' };
  }

  const quoteList = data.map(q => {
    const clientNom = (q.client as { nom: string })?.nom || 'N/A';
    const currencySymbol = getCurrencySymbol(q.devise);
    return `- ${q.numero}: ${clientNom} - ${Number(q.total_ttc).toFixed(2)} ${currencySymbol} (${q.status})`;
  }).join('\n');

  return {
    success: true,
    data,
    message: `${data.length} devis trouvé(s):\n${quoteList}`,
  };
}

async function updateQuoteStatus(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const { quote_id, quote_numero, status } = args;

  if (!status) {
    return { success: false, message: 'Le nouveau statut est requis.' };
  }

  const validStatuses = ['brouillon', 'envoye', 'accepted', 'refused'];
  if (!validStatuses.includes(status as string)) {
    return { success: false, message: `Statut invalide. Valeurs possibles: ${validStatuses.join(', ')}` };
  }

  // Find quote by ID or numero
  let quoteId = quote_id as string | undefined;

  if (!quoteId && quote_numero) {
    const { data: found } = await supabase
      .from('quotes')
      .select('id')
      .eq('user_id', userId)
      .eq('numero', quote_numero)
      .single();

    if (found) {
      quoteId = found.id;
    }
  }

  if (!quoteId) {
    return { success: false, message: 'Devis non trouvé. Précisez l\'ID ou le numéro du devis.' };
  }

  // Get current quote
  const { data: currentQuote } = await supabase
    .from('quotes')
    .select('*, client:clients(nom)')
    .eq('id', quoteId)
    .eq('user_id', userId)
    .single();

  if (!currentQuote) {
    return { success: false, message: 'Devis non trouvé.' };
  }

  // Update status
  const { data, error } = await supabase
    .from('quotes')
    .update({ status: status as string })
    .eq('id', quoteId)
    .select()
    .single();

  if (error) {
    return { success: false, message: `Erreur: ${error.message}` };
  }

  const statusLabels: Record<string, string> = {
    brouillon: 'Brouillon',
    envoye: 'Envoyé',
    accepted: 'Accepté',
    refused: 'Refusé',
  };

  const clientNom = (currentQuote.client as { nom: string })?.nom || 'N/A';
  const statusLabel = statusLabels[status as string] || status;

  return {
    success: true,
    data,
    message: `Devis ${currentQuote.numero} pour ${clientNom} marqué comme "${statusLabel}".`,
  };
}

async function createInvoice(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  let clientId = args.client_id as string | undefined;
  let clientName = args.client_name as string | undefined;
  const missionId = args.mission_id as string | undefined;
  const quoteId = args.quote_id as string | undefined;
  const items = args.items as Array<{
    description: string;
    quantite: number;
    prix_unitaire: number;
    tva_rate?: number;
  }>;
  const dateEcheance = args.date_echeance as string | undefined;
  const notes = args.notes as string | undefined;

  if (!items || items.length === 0) {
    return { success: false, message: 'Au moins une ligne est requise' };
  }

  // Vérifier que mission_id est fourni (obligatoire)
  if (!missionId) {
    return {
      success: false,
      message: 'mission_id obligatoire. Pour quelle mission est cette facture ? Utilise list_missions pour voir les missions existantes, ou crée une mission à partir d\'un deal.',
    };
  }

  // Détecter si client_id contient un nom au lieu d'un UUID
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (clientId && !uuidPattern.test(clientId)) {
    // client_id contient probablement un nom, pas un UUID
    clientName = clientId;
    clientId = undefined;
  }

  // Rechercher le client par nom si pas d'ID valide
  if (!clientId && clientName) {
    const client = await findClientByName(supabase, userId, clientName);
    if (client) {
      clientId = client.id;
    } else {
      return {
        success: false,
        message: `Client "${clientName}" non trouvé. Voulez-vous le créer ?`,
      };
    }
  }

  if (!clientId) {
    return { success: false, message: 'Veuillez spécifier un client' };
  }

  // Récupérer les paramètres company
  const { data: company } = userId
    ? await supabase
        .from('companies')
        .select('invoice_number_pattern, default_tax_rate, default_currency')
        .eq('user_id', userId)
        .single()
    : { data: null };

  const pattern = company?.invoice_number_pattern || DEFAULT_PATTERNS.invoice;
  const defaultTva = company?.default_tax_rate || 20;
  const currency = company?.default_currency || 'EUR';

  // Générer le numéro avec le nouveau système
  let numero: string;
  try {
    numero = await generateDocNumber({
      supabase,
      userId: userId || '00000000-0000-0000-0000-000000000001',
      docType: 'invoice',
      pattern,
      date: new Date(),
    });
  } catch (error) {
    return {
      success: false,
      message: `Erreur de numérotation: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
    };
  }

  // Calculer les totaux
  let totalHT = 0;
  let totalTVA = 0;

  const lineItems = items.map((item, index) => {
    const tvaRate = item.tva_rate ?? defaultTva;
    const ht = item.quantite * item.prix_unitaire;
    const tva = ht * (tvaRate / 100);
    totalHT += ht;
    totalTVA += tva;

    return {
      description: item.description,
      quantite: item.quantite,
      prix_unitaire: item.prix_unitaire,
      tva_rate: tvaRate,
      montant_ht: ht,
      montant_tva: tva,
      montant_ttc: ht + tva,
      ordre: index,
    };
  });

  // Créer la facture
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      user_id: userId || null,
      client_id: clientId,
      quote_id: quoteId || null,
      numero,
      date_emission: new Date().toISOString().split('T')[0],
      date_echeance: dateEcheance || null,
      status: 'brouillon',
      devise: currency,
      total_ht: totalHT,
      total_tva: totalTVA,
      total_ttc: totalHT + totalTVA,
      notes: notes || null,
    })
    .select('*, client:clients(nom)')
    .single();

  if (invoiceError || !invoice) {
    return { success: false, message: `Erreur: ${invoiceError?.message}` };
  }

  // Ajouter les lignes
  const lineItemsWithInvoiceId = lineItems.map(item => ({
    ...item,
    invoice_id: invoice.id,
  }));

  await supabase.from('invoice_line_items').insert(lineItemsWithInvoiceId);

  // Lier à la mission si spécifié
  let missionName = '';
  if (missionId) {
    // Vérifier que la mission existe et récupérer son nom
    const { data: mission } = await supabase
      .from('missions')
      .select('name')
      .eq('id', missionId)
      .single();

    if (mission) {
      await supabase.from('mission_invoices').insert({
        mission_id: missionId,
        invoice_id: invoice.id,
      });
      missionName = mission.name;
    }
  }

  // Note: Le compteur est maintenant géré automatiquement par generateDocNumber

  const clientNom = (invoice.client as { nom: string })?.nom || 'Client';

  const missionInfo = missionName ? `\nMission: ${missionName}` : '';
  return {
    success: true,
    data: invoice,
    message: `Facture ${numero} créée pour ${clientNom}.${missionInfo}\nTotal: ${(totalHT + totalTVA).toFixed(2)} ${getCurrencySymbol(currency)} TTC\n(ID: ${invoice.id})`,
  };
}

async function listInvoices(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const status = args.status as string | undefined;
  const numero = args.numero as string | undefined;

  let query = supabase
    .from('invoices')
    .select('*, client:clients(nom)')
    .order('created_at', { ascending: false });

  if (userId) {
    query = query.eq('user_id', userId);
  }

  if (status) {
    query = query.eq('status', status);
  }

  if (numero) {
    query = query.ilike('numero', `%${numero}%`);
  }

  const { data, error } = await query.limit(10);

  if (error) {
    return { success: false, message: `Erreur: ${error.message}` };
  }

  if (!data || data.length === 0) {
    return { success: true, data: [], message: 'Aucune facture trouvée.' };
  }

  const invoiceList = data.map(i => {
    const clientNom = (i.client as { nom: string })?.nom || 'N/A';
    const currencySymbol = getCurrencySymbol(i.devise);
    return `- ${i.numero} [ID: ${i.id}]: ${clientNom} - ${Number(i.total_ttc).toFixed(2)} ${currencySymbol} (${i.status})`;
  }).join('\n');

  return {
    success: true,
    data,
    message: `${data.length} facture(s) trouvée(s):\n${invoiceList}`,
  };
}

async function updateInvoice(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  let invoiceId = args.invoice_id as string | undefined;
  const invoiceNumero = args.invoice_numero as string | undefined;
  const newNumero = args.new_numero as string | undefined;
  const dateEmission = args.date_emission as string | undefined;
  const dateEcheance = args.date_echeance as string | undefined;
  const notes = args.notes as string | undefined;

  // Rechercher par numéro si pas d'ID
  if (!invoiceId && invoiceNumero) {
    let searchQuery = supabase
      .from('invoices')
      .select('id, status')
      .ilike('numero', `%${invoiceNumero}%`)
      .limit(1);

    if (userId) {
      searchQuery = searchQuery.eq('user_id', userId);
    }

    const { data: found } = await searchQuery.single();
    if (found) {
      invoiceId = found.id;
      if (found.status !== 'brouillon') {
        return {
          success: false,
          message: `La facture ${invoiceNumero} est en statut "${found.status}". Seules les factures en brouillon peuvent être modifiées.`,
        };
      }
    }
  }

  if (!invoiceId) {
    return { success: false, message: 'Veuillez spécifier une facture (ID ou numéro)' };
  }

  // Vérifier que la facture existe et est en brouillon
  const { data: invoice, error: fetchError } = await supabase
    .from('invoices')
    .select('id, numero, status, client:clients(nom)')
    .eq('id', invoiceId)
    .single();

  if (fetchError || !invoice) {
    return { success: false, message: 'Facture non trouvée.' };
  }

  if (invoice.status !== 'brouillon') {
    return {
      success: false,
      message: `La facture ${invoice.numero} est en statut "${invoice.status}". Seules les factures en brouillon peuvent être modifiées.`,
    };
  }

  // Construire l'objet de mise à jour
  const updateData: Record<string, unknown> = {};
  const changes: string[] = [];

  if (newNumero) {
    updateData.numero = newNumero;
    changes.push(`Numéro: ${invoice.numero} → ${newNumero}`);
  }
  if (dateEmission) {
    updateData.date_emission = dateEmission;
    changes.push(`Date d'émission: ${dateEmission}`);
  }
  if (dateEcheance) {
    updateData.date_echeance = dateEcheance;
    changes.push(`Date d'échéance: ${dateEcheance}`);
  }
  if (notes !== undefined) {
    updateData.notes = notes || null;
    changes.push(`Notes mises à jour`);
  }

  if (Object.keys(updateData).length === 0) {
    return { success: false, message: 'Aucune modification spécifiée.' };
  }

  // Effectuer la mise à jour
  const { error: updateError } = await supabase
    .from('invoices')
    .update(updateData)
    .eq('id', invoiceId);

  if (updateError) {
    return { success: false, message: `Erreur: ${updateError.message}` };
  }

  const clientData = invoice.client;
  const clientNom = (Array.isArray(clientData) ? clientData[0]?.nom : (clientData as { nom: string } | null)?.nom) || 'Client';
  const finalNumero = newNumero || invoice.numero;

  return {
    success: true,
    data: { id: invoiceId, numero: finalNumero },
    message: `Facture ${finalNumero} modifiée pour ${clientNom}.\nModifications:\n- ${changes.join('\n- ')}\n(ID: ${invoiceId})`,
  };
}

async function updateInvoiceStatus(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const { invoice_id, invoice_numero, status } = args;

  if (!status) {
    return { success: false, message: 'Le nouveau statut est requis.' };
  }

  const validStatuses = ['brouillon', 'envoyee', 'payee', 'annulee'];
  if (!validStatuses.includes(status as string)) {
    return { success: false, message: `Statut invalide. Valeurs possibles: ${validStatuses.join(', ')}` };
  }

  // Find invoice by ID or numero
  let invoiceId = invoice_id as string | undefined;

  if (!invoiceId && invoice_numero) {
    const { data: found } = await supabase
      .from('invoices')
      .select('id')
      .eq('user_id', userId)
      .ilike('numero', `%${invoice_numero}%`)
      .single();

    if (found) {
      invoiceId = found.id;
    }
  }

  if (!invoiceId) {
    return { success: false, message: 'Facture non trouvée. Précisez l\'ID ou le numéro de la facture.' };
  }

  // Get current invoice
  const { data: currentInvoice } = await supabase
    .from('invoices')
    .select('*, client:clients(nom)')
    .eq('id', invoiceId)
    .eq('user_id', userId)
    .single();

  if (!currentInvoice) {
    return { success: false, message: 'Facture non trouvée.' };
  }

  // Update status
  const updateData: Record<string, unknown> = { status: status as string };

  // Set paid_at if marking as paid
  if (status === 'payee') {
    updateData.paid_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('invoices')
    .update(updateData)
    .eq('id', invoiceId)
    .select()
    .single();

  if (error) {
    return { success: false, message: `Erreur: ${error.message}` };
  }

  const statusLabels: Record<string, string> = {
    brouillon: 'Brouillon',
    envoyee: 'Envoyée',
    payee: 'Payée',
    annulee: 'Annulée',
  };

  const clientNom = (currentInvoice.client as { nom: string })?.nom || 'N/A';
  const statusLabel = statusLabels[status as string] || status;

  return {
    success: true,
    data,
    message: `Facture ${currentInvoice.numero} pour ${clientNom} marquée comme "${statusLabel}".`,
  };
}

async function convertQuoteToInvoice(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  let quoteId = args.quote_id as string | undefined;
  const quoteNumero = args.quote_numero as string | undefined;
  const clientName = args.client_name as string | undefined;

  // Rechercher par numéro si pas d'ID
  if (!quoteId && quoteNumero) {
    let searchQuery = supabase
      .from('quotes')
      .select('id')
      .ilike('numero', `%${quoteNumero}%`)
      .limit(1);

    if (userId) {
      searchQuery = searchQuery.eq('user_id', userId);
    }

    const { data: quoteData } = await searchQuery.single();

    if (quoteData) {
      quoteId = quoteData.id;
    }
  }

  // Rechercher par nom de client si pas d'ID ni de numéro
  if (!quoteId && clientName) {
    // D'abord trouver le client
    const client = await findClientByName(supabase, userId, clientName);
    if (client) {
      // Puis trouver le devis le plus récent de ce client
      const clientQuoteQuery = supabase
        .from('quotes')
        .select('id')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false })
        .limit(1);

      const { data: quoteData } = await clientQuoteQuery.single();

      if (quoteData) {
        quoteId = quoteData.id;
      } else {
        return { success: false, message: `Aucun devis trouvé pour le client "${client.nom}".` };
      }
    } else {
      return { success: false, message: `Client "${clientName}" non trouvé.` };
    }
  }

  if (!quoteId) {
    return { success: false, message: 'Devis non trouvé. Veuillez préciser le numéro du devis (ex: DEV-0001).' };
  }

  // Récupérer le devis avec ses lignes
  let quoteQuery = supabase
    .from('quotes')
    .select('*, items:quote_line_items(*), client:clients(nom)')
    .eq('id', quoteId);

  if (userId) {
    quoteQuery = quoteQuery.eq('user_id', userId);
  }

  const { data: quote, error: quoteError } = await quoteQuery.single();

  if (quoteError || !quote) {
    return { success: false, message: 'Devis non trouvé' };
  }

  // Récupérer le pattern de numérotation
  const { data: company } = userId
    ? await supabase
        .from('companies')
        .select('invoice_number_pattern')
        .eq('user_id', userId)
        .single()
    : { data: null };

  const pattern = company?.invoice_number_pattern || DEFAULT_PATTERNS.invoice;

  // Générer le numéro avec le nouveau système
  let numero: string;
  try {
    numero = await generateDocNumber({
      supabase,
      userId: userId || '00000000-0000-0000-0000-000000000001',
      docType: 'invoice',
      pattern,
      date: new Date(),
    });
  } catch (error) {
    return {
      success: false,
      message: `Erreur de numérotation: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
    };
  }

  // Créer la facture
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      user_id: userId || null,
      client_id: quote.client_id,
      quote_id: quote.id,
      numero,
      date_emission: new Date().toISOString().split('T')[0],
      status: 'brouillon',
      devise: quote.devise,
      total_ht: quote.total_ht,
      total_tva: quote.total_tva,
      total_ttc: quote.total_ttc,
      notes: quote.notes,
    })
    .select()
    .single();

  if (invoiceError || !invoice) {
    return { success: false, message: `Erreur: ${invoiceError?.message}` };
  }

  // Copier les lignes
  const items = quote.items || [];
  if (items.length > 0) {
    const invoiceItems = items.map((item: {
      description: string;
      quantite: number;
      prix_unitaire: number;
      tva_rate: number;
      montant_ht: number;
      montant_tva: number;
      montant_ttc: number;
      ordre: number;
    }) => ({
      invoice_id: invoice.id,
      description: item.description,
      quantite: item.quantite,
      prix_unitaire: item.prix_unitaire,
      tva_rate: item.tva_rate,
      montant_ht: item.montant_ht,
      montant_tva: item.montant_tva,
      montant_ttc: item.montant_ttc,
      ordre: item.ordre,
    }));

    await supabase.from('invoice_line_items').insert(invoiceItems);
  }

  // Note: Le compteur est maintenant géré automatiquement par generateDocNumber

  const clientNom = (quote.client as { nom: string })?.nom || 'Client';
  const currencySymbol = getCurrencySymbol(quote.devise);

  return {
    success: true,
    data: invoice,
    message: `Facture ${numero} créée à partir du devis ${quote.numero} pour ${clientNom}.\nTotal: ${Number(quote.total_ttc).toFixed(2)} ${currencySymbol} TTC\n(ID: ${invoice.id})`,
  };
}

async function markInvoicePaid(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  let invoiceId = args.invoice_id as string | undefined;
  const invoiceNumero = args.invoice_numero as string | undefined;

  // Rechercher par numéro si pas d'ID
  if (!invoiceId && invoiceNumero) {
    let searchQuery = supabase
      .from('invoices')
      .select('id')
      .ilike('numero', `%${invoiceNumero}%`)
      .limit(1);

    if (userId) {
      searchQuery = searchQuery.eq('user_id', userId);
    }

    const { data: invoiceData } = await searchQuery.single();

    if (invoiceData) {
      invoiceId = invoiceData.id;
    }
  }

  if (!invoiceId) {
    return { success: false, message: 'Facture non trouvée. Veuillez préciser le numéro.' };
  }

  let updateQuery = supabase
    .from('invoices')
    .update({ status: 'payee' })
    .eq('id', invoiceId);

  if (userId) {
    updateQuery = updateQuery.eq('user_id', userId);
  }

  const { data: invoice, error } = await updateQuery.select().single();

  if (error || !invoice) {
    return { success: false, message: 'Facture non trouvée' };
  }

  return {
    success: true,
    data: invoice,
    message: `Facture ${invoice.numero} marquée comme payée.`,
  };
}

async function prepareSendEmail(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const entityType = args.entity_type as 'quote' | 'invoice';
  const entityId = args.entity_id as string;
  const toEmail = args.to_email as string;

  if (!entityType || !entityId || !toEmail) {
    return { success: false, message: 'Paramètres manquants' };
  }

  // Vérifier que le document existe
  const table = entityType === 'invoice' ? 'invoices' : 'quotes';
  let docQuery = supabase.from(table).select('numero').eq('id', entityId);

  if (userId) {
    docQuery = docQuery.eq('user_id', userId);
  }

  const { data: document, error } = await docQuery.single();

  if (error || !document) {
    return { success: false, message: 'Document non trouvé' };
  }

  // Note: L'envoi réel se fait via l'API /api/email/send
  // Ici on retourne les infos pour que le LLM confirme avec l'utilisateur
  return {
    success: true,
    data: {
      type: entityType,
      id: entityId,
      numero: document.numero,
      to: toEmail,
    },
    message: `Prêt à envoyer ${entityType === 'invoice' ? 'la facture' : 'le devis'} ${document.numero} à ${toEmail}. Confirmez-vous l'envoi ?`,
  };
}

async function getFinancialSummary(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const queryType = args.query_type as 'unpaid' | 'revenue' | 'by_client' | 'all';
  const clientName = args.client_name as string | undefined;

  // Récupérer la devise par défaut
  const { data: company } = userId
    ? await supabase
        .from('companies')
        .select('default_currency')
        .eq('user_id', userId)
        .single()
    : { data: null };

  const currencySymbol = getCurrencySymbol(company?.default_currency);

  // Récupérer toutes les factures avec infos client
  let query = supabase
    .from('invoices')
    .select('*, client:clients(nom)');

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data: invoices, error } = await query;

  if (error) {
    return { success: false, message: `Erreur: ${error.message}` };
  }

  if (!invoices || invoices.length === 0) {
    return { success: true, data: [], message: 'Aucune facture trouvée.' };
  }

  // Filtrer par client si spécifié
  let filteredInvoices = invoices;
  if (clientName) {
    const lowerName = clientName.toLowerCase();
    filteredInvoices = invoices.filter(inv => {
      const nom = (inv.client as { nom: string })?.nom;
      return nom?.toLowerCase().includes(lowerName);
    });
  }

  // Calculer selon le type de requête
  if (queryType === 'unpaid') {
    const unpaid = filteredInvoices.filter((inv) => inv.status !== 'payee');

    if (unpaid.length === 0) {
      return {
        success: true,
        data: [],
        message: 'Aucune facture impayée. Tous les clients sont à jour ! ✅',
      };
    }

    // Grouper par client (ENTITÉS D'ABORD)
    const byClient = new Map<
      string,
      { id: string; nom: string; total: number; invoices: typeof unpaid }
    >();

    unpaid.forEach((inv) => {
      const clientId = inv.client_id || 'unknown';
      const clientNom = (inv.client as { nom: string })?.nom || 'Inconnu';

      if (!byClient.has(clientId)) {
        byClient.set(clientId, {
          id: clientId,
          nom: clientNom,
          total: 0,
          invoices: [],
        });
      }
      const entry = byClient.get(clientId)!;
      entry.total += Number(inv.total_ttc) || 0;
      entry.invoices.push(inv);
    });

    const total = unpaid.reduce(
      (sum, inv) => sum + (Number(inv.total_ttc) || 0),
      0
    );
    const clientCount = byClient.size;

    let message = `💰 ${clientCount} client(s) te doi(ven)t ${total.toFixed(2)} ${currencySymbol} :\n\n`;

    Array.from(byClient.values())
      .sort((a, b) => b.total - a.total)
      .forEach((entry) => {
        message += `• **${entry.nom}** : ${entry.total.toFixed(2)} ${currencySymbol} (${entry.invoices.length} facture${entry.invoices.length > 1 ? 's' : ''})\n`;
      });

    return {
      success: true,
      data: { byClient: Object.fromEntries(byClient), total },
      message,
    };
  }

  if (queryType === 'revenue') {
    const paid = filteredInvoices.filter(inv => inv.status === 'payee');
    const total = paid.reduce((sum, inv) => sum + (Number(inv.total_ttc) || 0), 0);

    return {
      success: true,
      data: paid,
      message: `📊 Chiffre d'affaires encaissé: ${total.toFixed(2)} ${currencySymbol} (${paid.length} facture(s) payée(s))`,
    };
  }

  if (queryType === 'by_client' || queryType === 'all') {
    // Grouper par client
    const byClient = new Map<string, { total: number; unpaid: number; count: number }>();

    filteredInvoices.forEach(inv => {
      const clientNom = (inv.client as { nom: string })?.nom || 'Inconnu';
      if (!byClient.has(clientNom)) {
        byClient.set(clientNom, { total: 0, unpaid: 0, count: 0 });
      }
      const stats = byClient.get(clientNom)!;
      const amount = Number(inv.total_ttc) || 0;
      stats.total += amount;
      stats.count += 1;
      if (inv.status !== 'payee') {
        stats.unpaid += amount;
      }
    });

    const summary = Array.from(byClient.entries())
      .map(([name, stats]) => {
        const unpaidInfo = stats.unpaid > 0
          ? `dont ${stats.unpaid.toFixed(2)} ${currencySymbol} impayé`
          : 'tout payé';
        return `• ${name}: ${stats.total.toFixed(2)} ${currencySymbol} (${unpaidInfo})`;
      })
      .join('\n');

    const totalUnpaid = filteredInvoices
      .filter(i => i.status !== 'payee')
      .reduce((s, i) => s + (Number(i.total_ttc) || 0), 0);
    const totalRevenue = filteredInvoices
      .filter(i => i.status === 'payee')
      .reduce((s, i) => s + (Number(i.total_ttc) || 0), 0);

    return {
      success: true,
      data: { byClient: Object.fromEntries(byClient), totalUnpaid, totalRevenue },
      message: `📊 Résumé financier:\n• CA encaissé: ${totalRevenue.toFixed(2)} ${currencySymbol}\n• Impayés: ${totalUnpaid.toFixed(2)} ${currencySymbol}\n\nPar client:\n${summary}`,
    };
  }

  return { success: false, message: 'Type de requête non reconnu.' };
}

async function getDebtsToSuppliers(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const supplierName = args.supplier_name as string | undefined;
  const includeDetails = (args.include_details as boolean) ?? false;

  // Récupérer devise
  const { data: company } = userId
    ? await supabase
        .from('companies')
        .select('default_currency')
        .eq('user_id', userId)
        .single()
    : { data: null };

  const currencySymbol = getCurrencySymbol(company?.default_currency);

  // Requête factures fournisseurs impayées
  let query = supabase
    .from('supplier_invoices')
    .select('*, supplier:suppliers(id, nom)')
    .neq('status', 'paid')
    .neq('status', 'cancelled');

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data: invoices, error } = await query;

  if (error) {
    return { success: false, message: `Erreur: ${error.message}` };
  }

  if (!invoices || invoices.length === 0) {
    return {
      success: true,
      data: [],
      message: 'Aucune dette envers les fournisseurs. Tout est réglé ! ✅',
    };
  }

  // Filtrer par nom si spécifié
  let filtered = invoices;
  if (supplierName) {
    const lowerName = supplierName.toLowerCase();
    filtered = invoices.filter((inv) => {
      const nom = (inv.supplier as { nom: string })?.nom;
      return nom?.toLowerCase().includes(lowerName);
    });
  }

  // Grouper par fournisseur
  const bySupplier = new Map<
    string,
    { id: string; nom: string; total: number; invoices: typeof filtered }
  >();

  filtered.forEach((inv) => {
    const supplier = inv.supplier as { id: string; nom: string };
    const supplierId = supplier?.id || 'unknown';
    const supplierNom = supplier?.nom || 'Inconnu';

    if (!bySupplier.has(supplierId)) {
      bySupplier.set(supplierId, {
        id: supplierId,
        nom: supplierNom,
        total: 0,
        invoices: [],
      });
    }
    const entry = bySupplier.get(supplierId)!;
    entry.total += Number(inv.total_ttc) || 0;
    entry.invoices.push(inv);
  });

  const totalDebt = filtered.reduce(
    (sum, inv) => sum + (Number(inv.total_ttc) || 0),
    0
  );
  const supplierCount = bySupplier.size;

  // Format de réponse : ENTITÉS D'ABORD, puis optionnellement détails
  let message = `💸 Tu dois ${totalDebt.toFixed(2)} ${currencySymbol} à ${supplierCount} fournisseur(s) :\n\n`;

  Array.from(bySupplier.values())
    .sort((a, b) => b.total - a.total)
    .forEach((entry) => {
      message += `• **${entry.nom}** : ${entry.total.toFixed(2)} ${currencySymbol}`;
      if (includeDetails && entry.invoices.length > 0) {
        message += '\n';
        entry.invoices.forEach((inv) => {
          message += `  └ ${inv.numero || 'Sans numéro'} : ${Number(inv.total_ttc).toFixed(2)} ${currencySymbol}\n`;
        });
      } else {
        message += ` (${entry.invoices.length} facture${entry.invoices.length > 1 ? 's' : ''})\n`;
      }
    });

  return {
    success: true,
    data: { bySupplier: Object.fromEntries(bySupplier), totalDebt },
    message,
  };
}

// ============================================================================
// SETTINGS HANDLERS
// ============================================================================

async function getCompanySettings(
  supabase: Supabase,
  userId: string | null
): Promise<ToolResult> {
  if (!userId) {
    return { success: false, message: 'Vous devez être connecté pour accéder aux paramètres.' };
  }

  // Récupérer les paramètres de l'entreprise
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (companyError && companyError.code !== 'PGRST116') {
    return { success: false, message: `Erreur: ${companyError.message}` };
  }

  // Récupérer les champs personnalisés avec leurs valeurs
  const { data: fields } = await supabase
    .from('custom_fields')
    .select('id, key, label, scope')
    .eq('user_id', userId)
    .eq('scope', 'company')
    .eq('is_active', true);

  // Récupérer les valeurs des champs personnalisés
  let customFieldsInfo = '';
  if (fields && fields.length > 0 && company) {
    const { data: values } = await supabase
      .from('custom_field_values')
      .select('field_id, value_text')
      .eq('user_id', userId)
      .eq('entity_type', 'company')
      .eq('entity_id', company.id);

    const valueMap = new Map(values?.map(v => [v.field_id, v.value_text]) || []);

    const fieldsList = fields.map(f => {
      const value = valueMap.get(f.id) || '(non défini)';
      return `• ${f.label}: ${value}`;
    }).join('\n');

    if (fieldsList) {
      customFieldsInfo = `\n\nChamps personnalisés:\n${fieldsList}`;
    }
  }

  if (!company) {
    return {
      success: true,
      data: null,
      message: `Aucun paramètre d'entreprise configuré.\n\nVous pouvez configurer:\n• Nom de l'entreprise\n• Adresse\n• Email\n• Téléphone\n• Devise par défaut\n• Taux de TVA par défaut`,
    };
  }

  const info = [
    `Nom: ${company.display_name || '(non défini)'}`,
    `Adresse: ${company.address || '(non définie)'}`,
    `Email: ${company.email || '(non défini)'}`,
    `Téléphone: ${company.phone || '(non défini)'}`,
    `Devise: ${company.default_currency || 'EUR'}`,
    `TVA par défaut: ${company.default_tax_rate || 20}%`,
    `Logo: ${company.logo_url ? 'Configuré' : 'Non configuré'}`,
  ].join('\n');

  return {
    success: true,
    data: company,
    message: `Paramètres de l'entreprise:\n${info}${customFieldsInfo}`,
  };
}

async function updateCompanySettings(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  if (!userId) {
    return { success: false, message: 'Vous devez être connecté pour modifier les paramètres.' };
  }

  const updates: Record<string, unknown> = {};

  if (args.display_name !== undefined) updates.display_name = args.display_name;
  if (args.address !== undefined) updates.address = args.address;
  if (args.email !== undefined) updates.email = args.email;
  if (args.phone !== undefined) updates.phone = args.phone;
  if (args.default_currency !== undefined) updates.default_currency = args.default_currency;
  if (args.default_tax_rate !== undefined) updates.default_tax_rate = args.default_tax_rate;

  if (Object.keys(updates).length === 0) {
    return { success: false, message: 'Aucun paramètre à modifier.' };
  }

  updates.updated_at = new Date().toISOString();

  // Vérifier si une company existe déjà
  const { data: existing } = await supabase
    .from('companies')
    .select('id')
    .eq('user_id', userId)
    .single();

  let result;
  if (existing) {
    result = await supabase
      .from('companies')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();
  } else {
    result = await supabase
      .from('companies')
      .insert({
        user_id: userId,
        display_name: (args.display_name as string) || 'Mon entreprise',
        ...updates,
      })
      .select()
      .single();
  }

  if (result.error) {
    return { success: false, message: `Erreur: ${result.error.message}` };
  }

  const changedFields = Object.keys(updates)
    .filter(k => k !== 'updated_at')
    .map(k => {
      const labels: Record<string, string> = {
        display_name: 'Nom',
        address: 'Adresse',
        email: 'Email',
        phone: 'Téléphone',
        default_currency: 'Devise',
        default_tax_rate: 'TVA',
      };
      return labels[k] || k;
    })
    .join(', ');

  return {
    success: true,
    data: result.data,
    message: `Paramètres mis à jour: ${changedFields}`,
  };
}

async function listCustomFields(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  if (!userId) {
    return { success: false, message: 'Vous devez être connecté.' };
  }

  const scope = args.scope as 'company' | 'client' | 'all' | undefined;

  let query = supabase
    .from('custom_fields')
    .select('id, key, label, scope, is_active')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('label');

  if (scope && scope !== 'all') {
    query = query.eq('scope', scope);
  }

  const { data: fields, error } = await query;

  if (error) {
    return { success: false, message: `Erreur: ${error.message}` };
  }

  if (!fields || fields.length === 0) {
    return {
      success: true,
      data: [],
      message: 'Aucun champ personnalisé créé.\n\nVous pouvez créer des champs comme ICE, SIRET, TVA Intracommunautaire, etc.',
    };
  }

  // Récupérer les valeurs pour les champs entreprise
  const companyFields = fields.filter(f => f.scope === 'company');
  let valueMap = new Map<string, string>();

  if (companyFields.length > 0) {
    // D'abord récupérer l'ID de la company
    const { data: company } = await supabase
      .from('companies')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (company) {
      const { data: values } = await supabase
        .from('custom_field_values')
        .select('field_id, value_text')
        .eq('user_id', userId)
        .eq('entity_type', 'company')
        .eq('entity_id', company.id);

      valueMap = new Map(values?.map(v => [v.field_id, v.value_text || '']) || []);
    }
  }

  const fieldsList = fields.map(f => {
    const scopeLabel = f.scope === 'company' ? 'Entreprise' : f.scope === 'client' ? 'Client' : f.scope;
    const value = f.scope === 'company' ? valueMap.get(f.id) : null;
    const valueInfo = value ? ` = "${value}"` : '';
    return `• ${f.label} (${scopeLabel})${valueInfo}`;
  }).join('\n');

  return {
    success: true,
    data: fields,
    message: `${fields.length} champ(s) personnalisé(s):\n${fieldsList}`,
  };
}

function generateKey(label: string): string {
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

async function createCustomField(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  if (!userId) {
    return { success: false, message: 'Vous devez être connecté.' };
  }

  const label = args.label as string;
  const appliesToCompany = args.applies_to_company as boolean | undefined;
  const appliesToClient = args.applies_to_client as boolean | undefined;
  const companyValue = args.company_value as string | undefined;

  if (!label?.trim()) {
    return { success: false, message: 'Le libellé est requis.' };
  }

  // Par défaut, applique à l'entreprise si rien n'est spécifié
  const forCompany = appliesToCompany ?? (!appliesToClient);
  const forClient = appliesToClient ?? false;

  if (!forCompany && !forClient) {
    return { success: false, message: 'Le champ doit s\'appliquer à au moins une cible (entreprise ou client).' };
  }

  const key = generateKey(label);
  const createdScopes: string[] = [];

  // Créer pour l'entreprise si demandé
  if (forCompany) {
    const { data: companyField, error } = await supabase
      .from('custom_fields')
      .insert({
        user_id: userId,
        scope: 'company',
        key,
        label: label.trim(),
        field_type: 'text',
        is_active: true,
        is_visible_default: true,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { success: false, message: `Un champ "${label}" existe déjà pour l'entreprise.` };
      }
      return { success: false, message: `Erreur: ${error.message}` };
    }

    createdScopes.push('Entreprise');

    // Sauvegarder la valeur si fournie
    if (companyValue && companyField) {
      // D'abord obtenir ou créer la company
      let { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!company) {
        const { data: newCompany } = await supabase
          .from('companies')
          .insert({
            user_id: userId,
            display_name: 'Mon entreprise',
          })
          .select('id')
          .single();
        company = newCompany;
      }

      if (company) {
        await supabase
          .from('custom_field_values')
          .upsert({
            user_id: userId,
            field_id: companyField.id,
            entity_type: 'company',
            entity_id: company.id,
            value_text: companyValue,
          }, {
            onConflict: 'field_id,entity_type,entity_id',
          });
      }
    }
  }

  // Créer pour les clients si demandé
  if (forClient) {
    const { error } = await supabase
      .from('custom_fields')
      .insert({
        user_id: userId,
        scope: 'client',
        key,
        label: label.trim(),
        field_type: 'text',
        is_active: true,
        is_visible_default: true,
      });

    if (error && error.code !== '23505') {
      return { success: false, message: `Erreur: ${error.message}` };
    }
    if (!error) {
      createdScopes.push('Clients');
    }
  }

  const valueInfo = forCompany && companyValue ? ` avec valeur "${companyValue}"` : '';

  return {
    success: true,
    data: { label, key, scopes: createdScopes },
    message: `Champ "${label}" créé pour: ${createdScopes.join(', ')}${valueInfo}`,
  };
}

async function updateCustomFieldValue(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  if (!userId) {
    return { success: false, message: 'Vous devez être connecté.' };
  }

  const fieldLabel = args.field_label as string;
  const value = args.value as string;
  const clientName = args.client_name as string | undefined;

  if (!fieldLabel?.trim()) {
    return { success: false, message: 'Le libellé du champ est requis.' };
  }

  // Chercher le champ
  const targetScope = clientName ? 'client' : 'company';
  const { data: field, error: fieldError } = await supabase
    .from('custom_fields')
    .select('id, label, scope')
    .eq('user_id', userId)
    .eq('scope', targetScope)
    .ilike('label', `%${fieldLabel}%`)
    .single();

  if (fieldError || !field) {
    return { success: false, message: `Champ "${fieldLabel}" non trouvé pour ${targetScope === 'company' ? 'l\'entreprise' : 'les clients'}.` };
  }

  // Déterminer l'entity_id
  let entityId: string;
  let entityName: string;

  if (clientName) {
    // Chercher le client
    const client = await findClientByName(supabase, userId, clientName);
    if (!client) {
      return { success: false, message: `Client "${clientName}" non trouvé.` };
    }
    entityId = client.id;
    entityName = client.nom;
  } else {
    // Utiliser la company
    let { data: company } = await supabase
      .from('companies')
      .select('id, display_name')
      .eq('user_id', userId)
      .single();

    if (!company) {
      const { data: newCompany } = await supabase
        .from('companies')
        .insert({
          user_id: userId,
          display_name: 'Mon entreprise',
        })
        .select('id, display_name')
        .single();
      company = newCompany;
    }

    if (!company) {
      return { success: false, message: 'Impossible de créer/trouver l\'entreprise.' };
    }

    entityId = company.id;
    entityName = company.display_name || 'Mon entreprise';
  }

  // Upsert la valeur
  const { error: valueError } = await supabase
    .from('custom_field_values')
    .upsert({
      user_id: userId,
      field_id: field.id,
      entity_type: targetScope,
      entity_id: entityId,
      value_text: value,
    }, {
      onConflict: 'user_id,field_id,entity_type,entity_id',
    });

  if (valueError) {
    return { success: false, message: `Erreur: ${valueError.message}` };
  }

  return {
    success: true,
    data: { field: field.label, value, entity: entityName },
    message: `${field.label} = "${value}" pour ${entityName}`,
  };
}

async function deleteCustomField(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  if (!userId) {
    return { success: false, message: 'Vous devez être connecté.' };
  }

  const fieldLabel = args.field_label as string;

  if (!fieldLabel?.trim()) {
    return { success: false, message: 'Le libellé du champ est requis.' };
  }

  // Chercher tous les champs avec ce label (company et client)
  const { data: fields, error: fieldsError } = await supabase
    .from('custom_fields')
    .select('id, label, scope')
    .eq('user_id', userId)
    .ilike('label', `%${fieldLabel}%`);

  if (fieldsError) {
    return { success: false, message: `Erreur: ${fieldsError.message}` };
  }

  if (!fields || fields.length === 0) {
    return { success: false, message: `Champ "${fieldLabel}" non trouvé.` };
  }

  // Supprimer tous les champs trouvés
  const { error: deleteError } = await supabase
    .from('custom_fields')
    .delete()
    .in('id', fields.map(f => f.id));

  if (deleteError) {
    return { success: false, message: `Erreur: ${deleteError.message}` };
  }

  const scopes = [...new Set(fields.map(f => f.scope === 'company' ? 'Entreprise' : 'Clients'))];

  return {
    success: true,
    data: { deleted: fields.length },
    message: `Champ "${fields[0].label}" supprimé (${scopes.join(', ')})`,
  };
}

// ============================================================================
// TEMPLATE HANDLERS
// ============================================================================

async function listTemplates(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  if (!userId) {
    return { success: false, message: 'Vous devez être connecté.' };
  }

  const documentType = args.document_type as 'quote' | 'invoice' | 'all' | undefined;

  let query = supabase
    .from('templates')
    .select('id, name, document_type, is_default, created_at')
    .eq('user_id', userId)
    .order('document_type');

  if (documentType && documentType !== 'all') {
    query = query.eq('document_type', documentType);
  }

  const { data: templates, error } = await query;

  if (error) {
    return { success: false, message: `Erreur: ${error.message}` };
  }

  if (!templates || templates.length === 0) {
    return {
      success: true,
      data: [],
      message: 'Aucun template configuré.\n\nVous pouvez créer des templates pour personnaliser vos devis et factures (header, footer, mentions légales, etc.)',
    };
  }

  const typeLabels: Record<string, string> = { quote: 'Devis', invoice: 'Facture' };
  const templateList = templates.map(t => {
    const typeLabel = typeLabels[t.document_type] || t.document_type;
    const defaultMark = t.is_default ? ' (par défaut)' : '';
    return `• ${t.name} - ${typeLabel}${defaultMark}`;
  }).join('\n');

  return {
    success: true,
    data: templates,
    message: `${templates.length} template(s):\n${templateList}`,
  };
}

async function getTemplateBlocks(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  if (!userId) {
    return { success: false, message: 'Vous devez être connecté.' };
  }

  const documentType = args.document_type as 'quote' | 'invoice';

  if (!documentType) {
    return { success: false, message: 'Spécifiez le type de document (quote ou invoice).' };
  }

  // Récupérer le template par défaut pour ce type
  const { data: template, error: templateError } = await supabase
    .from('templates')
    .select('id, name')
    .eq('user_id', userId)
    .eq('document_type', documentType)
    .eq('is_default', true)
    .single();

  if (templateError || !template) {
    return {
      success: true,
      data: [],
      message: `Aucun template par défaut pour les ${documentType === 'quote' ? 'devis' : 'factures'}.\n\nCréez-en un dans les paramètres.`,
    };
  }

  // Récupérer les blocs
  const { data: blocks, error: blocksError } = await supabase
    .from('template_blocks')
    .select('id, block_type, content, order_index')
    .eq('template_id', template.id)
    .order('order_index');

  if (blocksError) {
    return { success: false, message: `Erreur: ${blocksError.message}` };
  }

  if (!blocks || blocks.length === 0) {
    return {
      success: true,
      data: { template, blocks: [] },
      message: `Template "${template.name}" n'a aucun bloc configuré.`,
    };
  }

  const blockTypeLabels: Record<string, string> = {
    header: 'En-tête',
    company_info: 'Infos entreprise',
    client_info: 'Infos client',
    items: 'Lignes',
    totals: 'Totaux',
    footer: 'Pied de page',
    custom: 'Personnalisé',
  };

  const blockList = blocks.map(b => {
    const label = blockTypeLabels[b.block_type] || b.block_type;
    const contentPreview = b.content ? b.content.substring(0, 50) + (b.content.length > 50 ? '...' : '') : '(vide)';
    return `• ${label}: ${contentPreview}`;
  }).join('\n');

  return {
    success: true,
    data: { template, blocks },
    message: `Template "${template.name}" - ${blocks.length} bloc(s):\n${blockList}`,
  };
}

async function getOrCreateDefaultTemplate(
  supabase: Supabase,
  userId: string,
  documentType: 'quote' | 'invoice'
): Promise<{ id: string; name: string } | null> {
  // Chercher le template par défaut
  const { data: existing } = await supabase
    .from('templates')
    .select('id, name')
    .eq('user_id', userId)
    .eq('document_type', documentType)
    .eq('is_default', true)
    .single();

  if (existing) return existing;

  // Créer un template par défaut
  const name = documentType === 'quote' ? 'Devis standard' : 'Facture standard';
  const { data: created, error } = await supabase
    .from('templates')
    .insert({
      user_id: userId,
      name,
      document_type: documentType,
      is_default: true,
    })
    .select('id, name')
    .single();

  if (error) return null;
  return created;
}

async function addTemplateBlock(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  if (!userId) {
    return { success: false, message: 'Vous devez être connecté.' };
  }

  const documentType = args.document_type as 'quote' | 'invoice';
  const blockType = args.block_type as string;
  const content = args.content as string;
  const position = args.position as 'start' | 'end' | undefined;

  if (!documentType || !blockType || !content) {
    return { success: false, message: 'Paramètres manquants (document_type, block_type, content).' };
  }

  // Obtenir ou créer le template par défaut
  const template = await getOrCreateDefaultTemplate(supabase, userId, documentType);
  if (!template) {
    return { success: false, message: 'Impossible de créer le template.' };
  }

  // Récupérer les blocs existants pour déterminer l'ordre
  const { data: existingBlocks } = await supabase
    .from('template_blocks')
    .select('order_index')
    .eq('template_id', template.id)
    .order('order_index', { ascending: position !== 'start' });

  let orderIndex = 0;
  if (existingBlocks && existingBlocks.length > 0) {
    if (position === 'start') {
      // Décaler tous les blocs existants
      const minOrder = existingBlocks[0].order_index;
      orderIndex = minOrder - 1;
    } else {
      // Ajouter à la fin
      const maxOrder = existingBlocks[existingBlocks.length - 1].order_index;
      orderIndex = maxOrder + 1;
    }
  }

  const { data: block, error } = await supabase
    .from('template_blocks')
    .insert({
      template_id: template.id,
      block_type: blockType,
      content,
      order_index: orderIndex,
    })
    .select()
    .single();

  if (error) {
    return { success: false, message: `Erreur: ${error.message}` };
  }

  const typeLabel = documentType === 'quote' ? 'devis' : 'factures';

  return {
    success: true,
    data: block,
    message: `Bloc "${blockType}" ajouté au template ${typeLabel}.\nContenu: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
  };
}

async function updateTemplateBlock(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  if (!userId) {
    return { success: false, message: 'Vous devez être connecté.' };
  }

  const documentType = args.document_type as 'quote' | 'invoice';
  const blockType = args.block_type as string;
  const content = args.content as string;

  if (!documentType || !blockType || content === undefined) {
    return { success: false, message: 'Paramètres manquants.' };
  }

  // Trouver le template par défaut
  const { data: template } = await supabase
    .from('templates')
    .select('id')
    .eq('user_id', userId)
    .eq('document_type', documentType)
    .eq('is_default', true)
    .single();

  if (!template) {
    return { success: false, message: `Aucun template pour les ${documentType === 'quote' ? 'devis' : 'factures'}.` };
  }

  // Mettre à jour le bloc
  const { data: block, error } = await supabase
    .from('template_blocks')
    .update({ content, updated_at: new Date().toISOString() })
    .eq('template_id', template.id)
    .eq('block_type', blockType)
    .select()
    .single();

  if (error || !block) {
    return { success: false, message: `Bloc "${blockType}" non trouvé dans ce template.` };
  }

  return {
    success: true,
    data: block,
    message: `Bloc "${blockType}" mis à jour.`,
  };
}

async function removeTemplateBlock(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  if (!userId) {
    return { success: false, message: 'Vous devez être connecté.' };
  }

  const documentType = args.document_type as 'quote' | 'invoice';
  const blockType = args.block_type as string;

  if (!documentType || !blockType) {
    return { success: false, message: 'Paramètres manquants.' };
  }

  // Trouver le template par défaut
  const { data: template } = await supabase
    .from('templates')
    .select('id')
    .eq('user_id', userId)
    .eq('document_type', documentType)
    .eq('is_default', true)
    .single();

  if (!template) {
    return { success: false, message: `Aucun template pour les ${documentType === 'quote' ? 'devis' : 'factures'}.` };
  }

  const { error } = await supabase
    .from('template_blocks')
    .delete()
    .eq('template_id', template.id)
    .eq('block_type', blockType);

  if (error) {
    return { success: false, message: `Erreur: ${error.message}` };
  }

  return {
    success: true,
    data: { deleted: blockType },
    message: `Bloc "${blockType}" supprimé du template.`,
  };
}

// ============================================================================
// CONTACT HANDLERS
// ============================================================================

async function findContactByName(
  supabase: Supabase,
  userId: string | null,
  name: string
): Promise<{ id: string; nom: string; email: string | null } | null> {
  let query = supabase
    .from('contacts')
    .select('id, nom, email')
    .ilike('nom', `%${name}%`)
    .limit(1);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data } = await query.single();
  return data;
}

async function createContact(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const { nom, email, telephone, notes } = args;

  if (!nom) {
    return { success: false, message: 'Le nom du contact est requis.' };
  }

  const { data, error } = await supabase
    .from('contacts')
    .insert({
      user_id: userId || null,
      nom: nom as string,
      email: (email as string) || null,
      telephone: (telephone as string) || null,
      notes: (notes as string) || null,
    })
    .select()
    .single();

  if (error) {
    return { success: false, message: `Erreur: ${error.message}` };
  }

  const contactInfo = [
    data.nom,
    data.email ? `(${data.email})` : null,
    data.telephone ? `Tel: ${data.telephone}` : null,
  ].filter(Boolean).join(' ');

  return {
    success: true,
    data,
    message: `Contact "${contactInfo}" créé avec succès.\n(ID: ${data.id})`,
  };
}

async function listContacts(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  let clientId = args.client_id as string | undefined;
  const clientName = args.client_name as string | undefined;

  // Find client by name if needed
  if (!clientId && clientName) {
    const client = await findClientByName(supabase, userId, clientName);
    if (client) {
      clientId = client.id;
    } else {
      return { success: false, message: `Client "${clientName}" non trouvé.` };
    }
  }

  if (clientId) {
    // List contacts for a specific client
    const { data, error } = await supabase
      .from('client_contacts')
      .select(`
        *,
        contact:contacts(id, nom, email, telephone)
      `)
      .eq('client_id', clientId);

    if (error) {
      return { success: false, message: `Erreur: ${error.message}` };
    }

    if (!data || data.length === 0) {
      return { success: true, data: [], message: 'Aucun contact lié à ce client.' };
    }

    const contactList = data.map(cc => {
      const c = cc.contact as { nom: string; email: string | null; telephone: string | null };
      const flags = [
        cc.is_primary ? 'Principal' : null,
        cc.handles_billing ? 'Facturation' : null,
        cc.handles_ops ? 'Opérations' : null,
        cc.handles_management ? 'Direction' : null,
      ].filter(Boolean);
      const roleInfo = cc.role ? ` - ${cc.role}` : '';
      const flagsInfo = flags.length > 0 ? ` [${flags.join(', ')}]` : '';
      return `- ${c.nom}${roleInfo}${flagsInfo}${c.email ? ` (${c.email})` : ''}`;
    }).join('\n');

    return {
      success: true,
      data,
      message: `${data.length} contact(s) lié(s) au client:\n${contactList}`,
    };
  } else {
    // List all contacts
    let query = supabase.from('contacts').select('*').order('nom');
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, message: `Erreur: ${error.message}` };
    }

    if (!data || data.length === 0) {
      return { success: true, data: [], message: 'Aucun contact trouvé.' };
    }

    const contactList = data.map(c =>
      `- ${c.nom}${c.email ? ` (${c.email})` : ''}${c.telephone ? ` - ${c.telephone}` : ''}`
    ).join('\n');

    return {
      success: true,
      data,
      message: `${data.length} contact(s) trouvé(s):\n${contactList}`,
    };
  }
}

async function linkContactToClient(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  let contactId = args.contact_id as string | undefined;
  let clientId = args.client_id as string | undefined;
  const contactName = args.contact_name as string | undefined;
  const clientName = args.client_name as string | undefined;

  // Resolve contact
  if (!contactId && contactName) {
    const contact = await findContactByName(supabase, userId, contactName);
    if (contact) {
      contactId = contact.id;
    } else {
      return { success: false, message: `Contact "${contactName}" non trouvé.` };
    }
  }

  // Resolve client
  if (!clientId && clientName) {
    const client = await findClientByName(supabase, userId, clientName);
    if (client) {
      clientId = client.id;
    } else {
      return { success: false, message: `Client "${clientName}" non trouvé.` };
    }
  }

  if (!contactId || !clientId) {
    return { success: false, message: 'Contact et client requis.' };
  }

  const linkData: Record<string, unknown> = {
    client_id: clientId,
    contact_id: contactId,
    role: (args.role as string) || null,
    handles_billing: (args.handles_billing as boolean) || false,
    handles_ops: (args.handles_ops as boolean) || false,
    handles_management: (args.handles_management as boolean) || false,
    is_primary: (args.is_primary as boolean) || false,
    preferred_channel: (args.preferred_channel as string) || null,
  };

  const { data, error } = await supabase
    .from('client_contacts')
    .insert(linkData)
    .select(`
      *,
      contact:contacts(nom),
      client:clients(nom)
    `)
    .single();

  if (error) {
    if (error.code === '23505') {
      return { success: false, message: 'Ce contact est déjà lié à ce client.' };
    }
    return { success: false, message: `Erreur: ${error.message}` };
  }

  const contactNom = (data.contact as { nom: string })?.nom;
  const clientNom = (data.client as { nom: string })?.nom;
  const roleInfo = data.role ? ` en tant que ${data.role}` : '';

  return {
    success: true,
    data,
    message: `Contact "${contactNom}" lié au client "${clientNom}"${roleInfo}.`,
  };
}

async function unlinkContactFromClient(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  let contactId = args.contact_id as string | undefined;
  let clientId = args.client_id as string | undefined;
  const contactName = args.contact_name as string | undefined;
  const clientName = args.client_name as string | undefined;

  // Resolve contact and client
  if (!contactId && contactName) {
    const contact = await findContactByName(supabase, userId, contactName);
    if (contact) contactId = contact.id;
  }
  if (!clientId && clientName) {
    const client = await findClientByName(supabase, userId, clientName);
    if (client) clientId = client.id;
  }

  if (!contactId || !clientId) {
    return { success: false, message: 'Contact et client requis.' };
  }

  const { error } = await supabase
    .from('client_contacts')
    .delete()
    .eq('contact_id', contactId)
    .eq('client_id', clientId);

  if (error) {
    return { success: false, message: `Erreur: ${error.message}` };
  }

  return {
    success: true,
    data: { contact_id: contactId, client_id: clientId },
    message: 'Lien contact-client supprimé.',
  };
}

async function updateContact(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  let contactId = args.contact_id as string | undefined;
  const contactName = args.contact_name as string | undefined;

  if (!contactId && contactName) {
    const contact = await findContactByName(supabase, userId, contactName);
    if (contact) {
      contactId = contact.id;
    } else {
      return { success: false, message: `Contact "${contactName}" non trouvé.` };
    }
  }

  if (!contactId) {
    return { success: false, message: 'Contact non spécifié.' };
  }

  const updates: Record<string, unknown> = {};
  if (args.nom !== undefined) updates.nom = args.nom;
  if (args.email !== undefined) updates.email = args.email || null;
  if (args.telephone !== undefined) updates.telephone = args.telephone || null;
  if (args.notes !== undefined) updates.notes = args.notes || null;

  if (Object.keys(updates).length === 0) {
    return { success: false, message: 'Aucune modification spécifiée.' };
  }

  let query = supabase
    .from('contacts')
    .update(updates)
    .eq('id', contactId);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query.select().single();

  if (error) {
    return { success: false, message: `Erreur: ${error.message}` };
  }

  return {
    success: true,
    data,
    message: `Contact "${data.nom}" mis à jour.`,
  };
}

async function updateClientContact(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  let contactId = args.contact_id as string | undefined;
  let clientId = args.client_id as string | undefined;
  const contactName = args.contact_name as string | undefined;
  const clientName = args.client_name as string | undefined;

  // Resolve IDs
  if (!contactId && contactName) {
    const contact = await findContactByName(supabase, userId, contactName);
    if (contact) contactId = contact.id;
  }
  if (!clientId && clientName) {
    const client = await findClientByName(supabase, userId, clientName);
    if (client) clientId = client.id;
  }

  if (!contactId || !clientId) {
    return { success: false, message: 'Contact et client requis.' };
  }

  const updates: Record<string, unknown> = {};
  if (args.role !== undefined) updates.role = args.role || null;
  if (args.handles_billing !== undefined) updates.handles_billing = args.handles_billing;
  if (args.handles_ops !== undefined) updates.handles_ops = args.handles_ops;
  if (args.handles_management !== undefined) updates.handles_management = args.handles_management;
  if (args.is_primary !== undefined) updates.is_primary = args.is_primary;
  if (args.preferred_channel !== undefined) updates.preferred_channel = args.preferred_channel || null;

  if (Object.keys(updates).length === 0) {
    return { success: false, message: 'Aucune modification spécifiée.' };
  }

  const { data, error } = await supabase
    .from('client_contacts')
    .update(updates)
    .eq('contact_id', contactId)
    .eq('client_id', clientId)
    .select(`
      *,
      contact:contacts(nom),
      client:clients(nom)
    `)
    .single();

  if (error) {
    return { success: false, message: `Erreur: ${error.message}` };
  }

  const contactNom = (data.contact as { nom: string })?.nom;
  return {
    success: true,
    data,
    message: `Lien mis à jour pour "${contactNom}".`,
  };
}

async function getContactForContext(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  let clientId = args.client_id as string | undefined;
  const clientName = args.client_name as string | undefined;
  const context = args.context as 'FACTURATION' | 'OPERATIONNEL' | 'DIRECTION';

  if (!context) {
    return { success: false, message: 'Le contexte est requis (FACTURATION, OPERATIONNEL, DIRECTION).' };
  }

  // Resolve client
  if (!clientId && clientName) {
    const client = await findClientByName(supabase, userId, clientName);
    if (client) {
      clientId = client.id;
    } else {
      return { success: false, message: `Client "${clientName}" non trouvé.` };
    }
  }

  if (!clientId) {
    return { success: false, message: 'Client requis.' };
  }

  // Map context to flag
  const flagColumn = {
    FACTURATION: 'handles_billing',
    OPERATIONNEL: 'handles_ops',
    DIRECTION: 'handles_management',
  }[context];

  const contextLabels = {
    FACTURATION: 'la facturation',
    OPERATIONNEL: 'les opérations',
    DIRECTION: 'la direction',
  };

  // Step 1: Find contacts with matching flag for this client
  const { data: matchingContacts } = await supabase
    .from('client_contacts')
    .select(`
      *,
      contact:contacts(id, nom, email, telephone)
    `)
    .eq('client_id', clientId)
    .eq(flagColumn, true);

  if (matchingContacts && matchingContacts.length > 0) {
    // Prefer is_primary if multiple
    const primary = matchingContacts.find(cc => cc.is_primary);
    const chosen = primary || matchingContacts[0];
    const contact = chosen.contact as { id: string; nom: string; email: string | null; telephone: string | null };

    return {
      success: true,
      data: {
        found: true,
        contact,
        client_contact: chosen,
        match_type: 'exact',
      },
      message: `Contact pour ${contextLabels[context]}: ${contact.nom}${contact.email ? ` (${contact.email})` : ''}${chosen.role ? ` - ${chosen.role}` : ''}`,
    };
  }

  // Step 2: Fallback to general primary contact
  const { data: primaryContact } = await supabase
    .from('client_contacts')
    .select(`
      *,
      contact:contacts(id, nom, email, telephone)
    `)
    .eq('client_id', clientId)
    .eq('is_primary', true)
    .limit(1)
    .single();

  if (primaryContact) {
    const contact = primaryContact.contact as { id: string; nom: string; email: string | null; telephone: string | null };
    return {
      success: true,
      data: {
        found: true,
        contact,
        client_contact: primaryContact,
        match_type: 'primary_fallback',
      },
      message: `Pas de contact spécifique pour ${contextLabels[context]}. Contact principal: ${contact.nom}${contact.email ? ` (${contact.email})` : ''}`,
    };
  }

  // Step 3: No contact found
  return {
    success: true,
    data: {
      found: false,
      contact: null,
      client_contact: null,
      match_type: null,
      suggestion: `Créez un contact pour ce client et activez le flag "${flagColumn}" ou marquez-le comme contact principal.`,
    },
    message: `Aucun contact trouvé pour ${contextLabels[context]}. Vous pouvez créer un contact et le lier à ce client.`,
  };
}

// ============================================================================
// PROPOSAL HANDLERS
// ============================================================================

async function findProposalTemplateByName(
  supabase: Supabase,
  userId: string | null,
  name: string
): Promise<{ id: string; name: string } | null> {
  let query = supabase
    .from('proposal_templates')
    .select('id, name')
    .ilike('name', `%${name}%`)
    .limit(1);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data } = await query.single();
  return data;
}

async function listProposalTemplates(
  supabase: Supabase,
  userId: string | null
): Promise<ToolResult> {
  if (!userId) {
    return { success: false, message: 'Vous devez être connecté.' };
  }

  const { data: templates, error } = await supabase
    .from('proposal_templates')
    .select('id, name, style_key, accent_color')
    .eq('user_id', userId)
    .order('name');

  if (error) {
    return { success: false, message: `Erreur: ${error.message}` };
  }

  if (!templates || templates.length === 0) {
    return {
      success: true,
      data: [],
      message: 'Aucun template de proposition.\n\nCréez-en un avec create_proposal_template.',
    };
  }

  const styleLabels: Record<string, string> = {
    classic: 'Classique',
    modern: 'Moderne',
    elegant: 'Élégant',
  };

  const templateList = templates.map(t => {
    const styleLabel = styleLabels[t.style_key] || t.style_key;
    return `• ${t.name} (${styleLabel})`;
  }).join('\n');

  return {
    success: true,
    data: templates,
    message: `${templates.length} template(s) de proposition:\n${templateList}`,
  };
}

async function createProposalTemplate(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  if (!userId) {
    return { success: false, message: 'Vous devez être connecté.' };
  }

  const name = args.name as string;
  const styleKey = (args.style_key as string) || 'classic';
  const accentColor = (args.accent_color as string) || '#111111';

  if (!name?.trim()) {
    return { success: false, message: 'Le nom du template est requis.' };
  }

  const { data, error } = await supabase
    .from('proposal_templates')
    .insert({
      user_id: userId,
      name: name.trim(),
      style_key: styleKey,
      accent_color: accentColor,
    })
    .select()
    .single();

  if (error) {
    return { success: false, message: `Erreur: ${error.message}` };
  }

  return {
    success: true,
    data,
    message: `Template "${data.name}" créé avec style ${styleKey}.`,
  };
}

async function addProposalTemplateSection(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  if (!userId) {
    return { success: false, message: 'Vous devez être connecté.' };
  }

  let templateId = args.template_id as string | undefined;
  const templateName = args.template_name as string | undefined;
  const title = args.title as string;
  const body = args.body as string;
  const mediaType = (args.media_type as string) || 'none';
  const mediaUrl = args.media_url as string | undefined;

  // Resolve template
  if (!templateId && templateName) {
    const template = await findProposalTemplateByName(supabase, userId, templateName);
    if (template) {
      templateId = template.id;
    } else {
      return { success: false, message: `Template "${templateName}" non trouvé.` };
    }
  }

  if (!templateId) {
    return { success: false, message: 'Template requis.' };
  }

  if (!title?.trim() || !body?.trim()) {
    return { success: false, message: 'Titre et contenu requis.' };
  }

  // Verify template ownership
  const { data: template } = await supabase
    .from('proposal_templates')
    .select('id, name')
    .eq('id', templateId)
    .eq('user_id', userId)
    .single();

  if (!template) {
    return { success: false, message: 'Template non trouvé.' };
  }

  // Get max sort_order
  const { data: maxSection } = await supabase
    .from('proposal_template_sections')
    .select('sort_order')
    .eq('template_id', templateId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single();

  const sortOrder = (maxSection?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from('proposal_template_sections')
    .insert({
      template_id: templateId,
      title: title.trim(),
      body: body.trim(),
      sort_order: sortOrder,
      media_type: mediaType,
      media_url: mediaUrl || null,
    })
    .select()
    .single();

  if (error) {
    return { success: false, message: `Erreur: ${error.message}` };
  }

  return {
    success: true,
    data,
    message: `Section "${title}" ajoutée au template "${template.name}".`,
  };
}

async function listProposalsHandler(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  if (!userId) {
    return { success: false, message: 'Vous devez être connecté.' };
  }

  let clientId = args.client_id as string | undefined;
  const clientName = args.client_name as string | undefined;
  const status = args.status as string | undefined;

  // Resolve client
  if (!clientId && clientName) {
    const client = await findClientByName(supabase, userId, clientName);
    if (client) {
      clientId = client.id;
    } else {
      return { success: false, message: `Client "${clientName}" non trouvé.` };
    }
  }

  let query = supabase
    .from('proposals')
    .select(`
      *,
      client:clients(nom),
      template:proposal_templates(name)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (clientId) {
    query = query.eq('client_id', clientId);
  }

  if (status) {
    query = query.eq('status', status);
  }

  const { data: proposals, error } = await query.limit(20);

  if (error) {
    return { success: false, message: `Erreur: ${error.message}` };
  }

  if (!proposals || proposals.length === 0) {
    return { success: true, data: [], message: 'Aucune proposition trouvée.' };
  }

  const statusLabels: Record<string, string> = {
    draft: 'Brouillon',
    sent: 'Envoyée',
    commented: 'En discussion',
    accepted: 'Acceptée',
    refused: 'Refusée',
  };

  const proposalList = proposals.map(p => {
    const clientNom = (p.client as { nom: string })?.nom || 'N/A';
    const templateName = (p.template as { name: string })?.name || 'N/A';
    const statusLabel = statusLabels[p.status] || p.status;
    return `• ${clientNom} - "${templateName}" (${statusLabel})`;
  }).join('\n');

  return {
    success: true,
    data: proposals,
    message: `${proposals.length} proposition(s):\n${proposalList}`,
  };
}

async function createProposalHandler(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  if (!userId) {
    return { success: false, message: 'Vous devez être connecté.' };
  }

  const dealId = args.deal_id as string | undefined;
  let clientId = args.client_id as string | undefined;
  const clientName = args.client_name as string | undefined;
  let templateId = args.template_id as string | undefined;
  const templateName = args.template_name as string | undefined;
  const variables = (args.variables as Record<string, string>) || {};
  const linkedQuoteId = args.linked_quote_id as string | undefined;

  // Vérifier que deal_id est fourni
  if (!dealId) {
    return {
      success: false,
      message: 'deal_id obligatoire. À quel deal/opportunité veux-tu rattacher cette proposition ? Utilise list_deals pour voir les deals existants.'
    };
  }

  // Récupérer le deal et son client
  const { data: deal, error: dealError } = await supabase
    .from('deals')
    .select('id, name, client_id')
    .eq('id', dealId)
    .eq('user_id', userId)
    .single();

  if (dealError || !deal) {
    return { success: false, message: `Deal non trouvé (ID: ${dealId}).` };
  }

  // Utiliser le client_id du deal si non fourni
  if (!clientId) {
    clientId = deal.client_id;
  }

  // Resolve client by name if needed
  if (!clientId && clientName) {
    const client = await findClientByName(supabase, userId, clientName);
    if (client) {
      clientId = client.id;
    } else {
      return { success: false, message: `Client "${clientName}" non trouvé.` };
    }
  }

  if (!clientId) {
    return { success: false, message: 'Client requis.' };
  }

  // Resolve template
  if (!templateId && templateName) {
    const template = await findProposalTemplateByName(supabase, userId, templateName);
    if (template) {
      templateId = template.id;
    } else {
      return { success: false, message: `Template "${templateName}" non trouvé.` };
    }
  }

  if (!templateId) {
    // List available templates
    const { data: templates } = await supabase
      .from('proposal_templates')
      .select('name')
      .eq('user_id', userId);

    if (templates && templates.length > 0) {
      const templateList = templates.map(t => `• ${t.name}`).join('\n');
      return {
        success: false,
        message: `Template requis. Templates disponibles:\n${templateList}`,
      };
    }
    return { success: false, message: 'Aucun template disponible. Créez-en un d\'abord.' };
  }

  // Generate public token
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let publicToken = '';
  for (let i = 0; i < 32; i++) {
    publicToken += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const { data: proposal, error } = await supabase
    .from('proposals')
    .insert({
      user_id: userId,
      deal_id: dealId,
      client_id: clientId,
      template_id: templateId,
      variables,
      linked_quote_id: linkedQuoteId || null,
      public_token: publicToken,
      status: 'draft',
    })
    .select(`
      *,
      client:clients(nom),
      template:proposal_templates(name),
      deal:deals(name)
    `)
    .single();

  if (error) {
    return { success: false, message: `Erreur: ${error.message}` };
  }

  const clientData = proposal.client;
  const clientNom = ((Array.isArray(clientData) ? clientData[0] : clientData) as { nom: string } | null)?.nom;
  const templateNameResult = (proposal.template as { name: string })?.name;
  const dealName = ((Array.isArray(proposal.deal) ? proposal.deal[0] : proposal.deal) as { name: string } | null)?.name;

  return {
    success: true,
    data: proposal,
    message: `Proposition créée pour "${clientNom}" (deal: "${dealName}") avec template "${templateNameResult}".\n\nStatut: Brouillon\n(ID: ${proposal.id})\n\nUtilisez set_proposal_recipients pour ajouter des destinataires, puis set_proposal_status pour l'envoyer.`,
  };
}

async function getClientContactsForProposal(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  if (!userId) {
    return { success: false, message: 'Vous devez être connecté.' };
  }

  let clientId = args.client_id as string | undefined;
  const clientName = args.client_name as string | undefined;

  // Resolve client
  if (!clientId && clientName) {
    const client = await findClientByName(supabase, userId, clientName);
    if (client) {
      clientId = client.id;
    } else {
      return { success: false, message: `Client "${clientName}" non trouvé.` };
    }
  }

  if (!clientId) {
    return { success: false, message: 'Client requis.' };
  }

  // Verify client ownership
  const { data: client } = await supabase
    .from('clients')
    .select('id, nom')
    .eq('id', clientId)
    .eq('user_id', userId)
    .single();

  if (!client) {
    return { success: false, message: 'Client non trouvé.' };
  }

  const { data: contacts, error } = await supabase
    .from('client_contacts')
    .select(`
      role,
      is_primary,
      contact:contacts(id, nom, prenom, email, telephone)
    `)
    .eq('client_id', clientId);

  if (error) {
    return { success: false, message: `Erreur: ${error.message}` };
  }

  if (!contacts || contacts.length === 0) {
    return {
      success: true,
      data: [],
      message: `Aucun contact lié au client "${client.nom}".`,
    };
  }

  const contactList = contacts.map(cc => {
    const contactData = cc.contact;
    const c = (Array.isArray(contactData) ? contactData[0] : contactData) as { id: string; nom: string; prenom: string | null; email: string | null } | null;
    if (!c) return null;
    const fullName = c.prenom ? `${c.prenom} ${c.nom}` : c.nom;
    const roleInfo = cc.role ? ` (${cc.role})` : '';
    const primaryMark = cc.is_primary ? ' [Principal]' : '';
    return `• ${fullName}${roleInfo}${primaryMark} - ID: ${c.id}`;
  }).filter(Boolean).join('\n');

  return {
    success: true,
    data: contacts,
    message: `Contacts du client "${client.nom}":\n${contactList}\n\nUtilisez les IDs pour set_proposal_recipients.`,
  };
}

async function setProposalRecipientsHandler(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  if (!userId) {
    return { success: false, message: 'Vous devez être connecté.' };
  }

  const proposalId = args.proposal_id as string;
  const contactIds = args.contact_ids as string[];

  if (!proposalId) {
    return { success: false, message: 'ID de proposition requis.' };
  }

  if (!Array.isArray(contactIds)) {
    return { success: false, message: 'Liste de contact_ids requise.' };
  }

  // Verify proposal ownership
  const { data: proposal } = await supabase
    .from('proposals')
    .select('id')
    .eq('id', proposalId)
    .eq('user_id', userId)
    .single();

  if (!proposal) {
    return { success: false, message: 'Proposition non trouvée.' };
  }

  // Delete existing recipients
  await supabase
    .from('proposal_recipients')
    .delete()
    .eq('proposal_id', proposalId);

  // Insert new recipients
  if (contactIds.length > 0) {
    const recipients = contactIds.map(contactId => ({
      proposal_id: proposalId,
      contact_id: contactId,
    }));

    const { error } = await supabase
      .from('proposal_recipients')
      .insert(recipients);

    if (error) {
      return { success: false, message: `Erreur: ${error.message}` };
    }
  }

  return {
    success: true,
    data: { proposal_id: proposalId, recipient_count: contactIds.length },
    message: `${contactIds.length} destinataire(s) défini(s) pour la proposition.`,
  };
}

async function setProposalStatusHandler(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  if (!userId) {
    return { success: false, message: 'Vous devez être connecté.' };
  }

  const proposalId = args.proposal_id as string;
  const status = args.status as 'draft' | 'sent';

  if (!proposalId) {
    return { success: false, message: 'ID de proposition requis.' };
  }

  if (!status || !['draft', 'sent'].includes(status)) {
    return { success: false, message: 'Statut invalide. Utilisez "draft" ou "sent".' };
  }

  const now = new Date().toISOString();
  const updateData: Record<string, unknown> = { status };

  if (status === 'sent') {
    updateData.sent_at = now;
  }

  const { data: proposal, error } = await supabase
    .from('proposals')
    .update(updateData)
    .eq('id', proposalId)
    .eq('user_id', userId)
    .select(`
      *,
      client:clients(nom)
    `)
    .single();

  if (error || !proposal) {
    return { success: false, message: 'Proposition non trouvée.' };
  }

  const clientData = proposal.client;
  const clientNom = ((Array.isArray(clientData) ? clientData[0] : clientData) as { nom: string } | null)?.nom;
  const statusLabel = status === 'sent' ? 'envoyée' : 'en brouillon';

  return {
    success: true,
    data: proposal,
    message: `Proposition pour "${clientNom}" marquée comme ${statusLabel}.`,
  };
}

async function getProposalPublicLink(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  if (!userId) {
    return { success: false, message: 'Vous devez être connecté.' };
  }

  const proposalId = args.proposal_id as string;

  if (!proposalId) {
    return { success: false, message: 'ID de proposition requis.' };
  }

  const { data: proposal, error } = await supabase
    .from('proposals')
    .select(`
      public_token,
      status,
      client:clients(nom)
    `)
    .eq('id', proposalId)
    .eq('user_id', userId)
    .single();

  if (error || !proposal) {
    return { success: false, message: 'Proposition non trouvée.' };
  }

  const clientData = proposal.client;
  const clientNom = ((Array.isArray(clientData) ? clientData[0] : clientData) as { nom: string } | null)?.nom;
  const publicLink = `/p/${proposal.public_token}`;

  return {
    success: true,
    data: {
      proposal_id: proposalId,
      public_token: proposal.public_token,
      public_link: publicLink,
      status: proposal.status,
    },
    message: `Lien public pour la proposition "${clientNom}":\n${publicLink}\n\nStatut: ${proposal.status}`,
  };
}

// ============================================================================
// PROPOSAL PAGE EDITING TOOLS
// ============================================================================

async function proposalCreatePage(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  if (!userId) {
    return { success: false, message: 'Vous devez être connecté.' };
  }

  const proposalId = args.proposal_id as string;
  const title = args.title as string;
  const content = args.content as string | undefined;

  if (!proposalId || !title) {
    return { success: false, message: 'ID de proposition et titre requis.' };
  }

  // Verify proposal belongs to user
  const { data: proposal, error: propError } = await supabase
    .from('proposals')
    .select('id, owner_user_id')
    .eq('id', proposalId)
    .eq('owner_user_id', userId)
    .single();

  if (propError || !proposal) {
    return { success: false, message: 'Proposition non trouvée.' };
  }

  // Get max sort_order
  const { data: lastPage } = await supabase
    .from('proposal_pages')
    .select('sort_order')
    .eq('proposal_id', proposalId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single();

  const sortOrder = (lastPage?.sort_order ?? -1) + 1;

  // Convert text to TipTap JSON
  const tiptapContent = content
    ? {
        type: 'doc',
        content: content.split('\n\n').map(p => ({
          type: 'paragraph',
          content: p.trim() ? [{ type: 'text', text: p.trim() }] : [],
        })),
      }
    : { type: 'doc', content: [{ type: 'paragraph' }] };

  const { data: page, error } = await supabase
    .from('proposal_pages')
    .insert({
      proposal_id: proposalId,
      title,
      sort_order: sortOrder,
      content: tiptapContent,
      is_cover: false,
      is_visible: true,
    })
    .select()
    .single();

  if (error) {
    return { success: false, message: `Erreur: ${error.message}` };
  }

  return {
    success: true,
    data: { page_id: page.id, title: page.title },
    message: `Page "${title}" créée avec succès.`,
  };
}

async function proposalUpdatePage(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  if (!userId) {
    return { success: false, message: 'Vous devez être connecté.' };
  }

  const proposalId = args.proposal_id as string;
  const pageId = args.page_id as string;
  const content = args.content as string;
  const title = args.title as string | undefined;

  if (!proposalId || !pageId || !content) {
    return { success: false, message: 'ID de proposition, ID de page et contenu requis.' };
  }

  // Verify proposal belongs to user
  const { data: proposal, error: propError } = await supabase
    .from('proposals')
    .select('id')
    .eq('id', proposalId)
    .eq('owner_user_id', userId)
    .single();

  if (propError || !proposal) {
    return { success: false, message: 'Proposition non trouvée.' };
  }

  // Convert text to TipTap JSON
  const tiptapContent = {
    type: 'doc',
    content: content.split('\n\n').map(p => ({
      type: 'paragraph',
      content: p.trim() ? [{ type: 'text', text: p.trim() }] : [],
    })),
  };

  const updateData: Record<string, unknown> = { content: tiptapContent };
  if (title) {
    updateData.title = title;
  }

  const { error } = await supabase
    .from('proposal_pages')
    .update(updateData)
    .eq('id', pageId)
    .eq('proposal_id', proposalId);

  if (error) {
    return { success: false, message: `Erreur: ${error.message}` };
  }

  return {
    success: true,
    message: `Page mise à jour avec succès.`,
  };
}

async function proposalListPages(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  if (!userId) {
    return { success: false, message: 'Vous devez être connecté.' };
  }

  const proposalId = args.proposal_id as string;

  if (!proposalId) {
    return { success: false, message: 'ID de proposition requis.' };
  }

  // Verify proposal belongs to user
  const { data: proposal, error: propError } = await supabase
    .from('proposals')
    .select('id, title')
    .eq('id', proposalId)
    .eq('owner_user_id', userId)
    .single();

  if (propError || !proposal) {
    return { success: false, message: 'Proposition non trouvée.' };
  }

  // Get pages
  const { data: pages, error } = await supabase
    .from('proposal_pages')
    .select('id, title, sort_order, is_cover, is_visible, content')
    .eq('proposal_id', proposalId)
    .order('sort_order', { ascending: true });

  if (error) {
    return { success: false, message: `Erreur: ${error.message}` };
  }

  if (!pages || pages.length === 0) {
    return {
      success: true,
      data: { pages: [] },
      message: 'Aucune page dans cette proposition.',
    };
  }

  // Extract text content from TipTap for preview
  const extractText = (content: unknown): string => {
    if (!content || typeof content !== 'object') return '';
    const doc = content as { content?: Array<{ content?: Array<{ text?: string }> }> };
    return (
      doc.content
        ?.map(node => node.content?.map(c => c.text || '').join('') || '')
        .join(' ')
        .substring(0, 100) || ''
    );
  };

  const pageList = pages.map(p => {
    const preview = extractText(p.content);
    return `${p.is_cover ? '[Couverture]' : `[Page ${p.sort_order + 1}]`} ${p.title}${preview ? ` - "${preview}..."` : ''}`;
  }).join('\n');

  return {
    success: true,
    data: {
      proposal_title: proposal.title,
      pages: pages.map(p => ({
        id: p.id,
        title: p.title,
        is_cover: p.is_cover,
        is_visible: p.is_visible,
        preview: extractText(p.content),
      })),
    },
    message: `Pages de la proposition "${proposal.title}":\n${pageList}`,
  };
}

async function proposalRewriteContent(
  args: Record<string, unknown>
): Promise<ToolResult> {
  const originalText = args.original_text as string;
  const style = args.style as string;

  if (!originalText || !style) {
    return { success: false, message: 'Texte original et style requis.' };
  }

  // Pour l'instant, retourner le texte avec une indication du style
  // En production, on pourrait appeler GPT pour réécrire
  const styleDescriptions: Record<string, string> = {
    formel: 'dans un ton professionnel et formel',
    decontracte: 'dans un ton amical et décontracté',
    persuasif: 'dans un ton persuasif et engageant',
    concis: 'de manière plus concise',
  };

  return {
    success: true,
    data: {
      original: originalText,
      style,
      rewritten: originalText, // En production: résultat de GPT
    },
    message: `Pour réécrire ce texte ${styleDescriptions[style] || style}, voici une proposition:\n\n"${originalText}"\n\n(Fonctionnalité de réécriture IA à venir)`,
  };
}

// ============================================================================
// DEAL HANDLERS
// ============================================================================

async function createDeal(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const { client_id, client_name, title, description, estimated_amount } = args;

  if (!title) {
    return { success: false, message: 'Le titre du deal est requis.' };
  }

  // Trouver le client
  let clientId = client_id as string | undefined;
  if (!clientId && client_name) {
    const { data: client } = await supabase
      .from('clients')
      .select('id, nom')
      .eq('user_id', userId)
      .ilike('nom', `%${client_name}%`)
      .limit(1)
      .single();

    if (client) {
      clientId = client.id;
    } else {
      return { success: false, message: `Client "${client_name}" non trouvé. Créez d'abord le client.` };
    }
  }

  if (!clientId) {
    return { success: false, message: 'Un client est requis pour créer un deal. Précisez client_id ou client_name.' };
  }

  const { data, error } = await supabase
    .from('deals')
    .insert({
      user_id: userId,
      client_id: clientId,
      title: title as string,
      description: (description as string) || null,
      estimated_amount: (estimated_amount as number) || null,
      status: 'new',
    })
    .select(`
      *,
      client:clients(nom)
    `)
    .single();

  if (error) {
    return { success: false, message: `Erreur lors de la création du deal: ${error.message}` };
  }

  return {
    success: true,
    data,
    message: `Deal "${data.title}" créé avec succès pour le client ${data.client?.nom}. Statut: nouveau.\n(ID: ${data.id})`,
  };
}

async function listDeals(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const { client_id, client_name, status } = args;

  let query = supabase
    .from('deals')
    .select(`
      id, title, status, estimated_amount, final_amount,
      created_at, sent_at, won_at, lost_at,
      client:clients(id, nom)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  if (client_id) {
    query = query.eq('client_id', client_id);
  }

  const { data, error } = await query.limit(20);

  if (error) {
    return { success: false, message: `Erreur: ${error.message}` };
  }

  // Filtrer par nom de client si spécifié
  let deals = data || [];
  if (client_name && !client_id) {
    const searchTerm = (client_name as string).toLowerCase();
    deals = deals.filter(d => {
      const clientNom = (d.client as { nom?: string } | null)?.nom;
      return clientNom?.toLowerCase().includes(searchTerm);
    });
  }

  if (deals.length === 0) {
    return { success: true, data: [], message: 'Aucun deal trouvé.' };
  }

  const statusLabels: Record<string, string> = {
    new: '🆕 Nouveau',
    draft: '📝 Brouillon',
    sent: '📤 Envoyé',
    won: '🏆 Gagné',
    lost: '❌ Perdu',
    archived: '📦 Archivé',
  };

  const summary = deals.map(d => {
    const amount = d.final_amount || d.estimated_amount;
    const amountStr = amount ? ` - ${amount}€` : '';
    const clientNom = (d.client as { nom?: string } | null)?.nom || 'N/A';
    return `• ${d.title} (${clientNom}) ${statusLabels[d.status] || d.status}${amountStr}`;
  }).join('\n');

  return {
    success: true,
    data: deals,
    message: `${deals.length} deal(s) trouvé(s):\n${summary}`,
  };
}

async function getDeal(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const { deal_id } = args;

  if (!deal_id) {
    return { success: false, message: 'ID du deal requis.' };
  }

  const { data, error } = await supabase
    .from('deals')
    .select(`
      *,
      client:clients(id, nom, email),
      deal_contacts(contact:contacts(id, nom, email)),
      quotes(id, numero, status)
    `)
    .eq('id', deal_id)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return { success: false, message: 'Deal non trouvé.' };
  }

  const statusLabels: Record<string, string> = {
    new: 'Nouveau',
    draft: 'Brouillon',
    sent: 'Envoyé',
    won: 'Gagné',
    lost: 'Perdu',
    archived: 'Archivé',
  };

  const amount = data.final_amount || data.estimated_amount;
  const amountStr = amount ? `${amount}€` : 'Non défini';

  return {
    success: true,
    data,
    message: `Deal: ${data.title}\nClient: ${data.client?.nom}\nStatut: ${statusLabels[data.status]}\nMontant: ${amountStr}\nDescription: ${data.description || 'Aucune'}`,
  };
}

async function updateDealStatus(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const { deal_id, status } = args;

  if (!deal_id || !status) {
    return { success: false, message: 'ID du deal et nouveau statut requis.' };
  }

  const validStatuses = ['new', 'draft', 'sent', 'won', 'lost', 'archived'];
  if (!validStatuses.includes(status as string)) {
    return { success: false, message: `Statut invalide. Valeurs possibles: ${validStatuses.join(', ')}` };
  }

  // Récupérer le deal actuel
  const { data: currentDeal, error: fetchError } = await supabase
    .from('deals')
    .select('*, client:clients(id, nom)')
    .eq('id', deal_id)
    .eq('user_id', userId)
    .single();

  if (fetchError || !currentDeal) {
    return { success: false, message: 'Deal non trouvé.' };
  }

  // Mettre à jour le statut
  const { data, error } = await supabase
    .from('deals')
    .update({ status: status as string })
    .eq('id', deal_id)
    .select()
    .single();

  if (error) {
    return { success: false, message: `Erreur: ${error.message}` };
  }

  let extraMessage = '';

  // Si statut devient "won", suggérer la création d'une mission (sans l'exécuter)
  if (status === 'won' && currentDeal.status !== 'won') {
    extraMessage = ` Voulez-vous créer une mission pour ce deal ?`;
  }

  const statusLabels: Record<string, string> = {
    new: 'Nouveau',
    draft: 'Brouillon',
    sent: 'Envoyé',
    won: 'Gagné 🏆',
    lost: 'Perdu',
    archived: 'Archivé',
  };

  return {
    success: true,
    data,
    message: `Deal "${currentDeal.title}" mis à jour: ${statusLabels[currentDeal.status]} → ${statusLabels[status as string]}.${extraMessage}`,
  };
}

// ============================================================================
// MISSION HANDLERS
// ============================================================================

async function createMission(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const { deal_id, title, description, estimated_amount } = args;

  if (!deal_id || !title) {
    return { success: false, message: 'ID du deal et titre de la mission requis.' };
  }

  // Vérifier que le deal existe
  const { data: deal, error: dealError } = await supabase
    .from('deals')
    .select('id, client_id, title')
    .eq('id', deal_id)
    .eq('user_id', userId)
    .single();

  if (dealError || !deal) {
    return { success: false, message: 'Deal non trouvé.' };
  }

  // Vérifier qu'il n'y a pas déjà une mission pour ce deal
  const { data: existingMission } = await supabase
    .from('missions')
    .select('id')
    .eq('deal_id', deal_id)
    .single();

  if (existingMission) {
    return { success: false, message: 'Une mission existe déjà pour ce deal.' };
  }

  const { data, error } = await supabase
    .from('missions')
    .insert({
      user_id: userId,
      deal_id: deal_id as string,
      client_id: deal.client_id,
      title: title as string,
      description: (description as string) || null,
      estimated_amount: (estimated_amount as number) || null,
      status: 'in_progress',
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return { success: false, message: `Erreur: ${error.message}` };
  }

  // Lier la mission au deal
  await supabase
    .from('deals')
    .update({ mission_id: data.id })
    .eq('id', deal_id);

  return {
    success: true,
    data,
    message: `Mission "${data.title}" créée avec succès. Statut: En cours.\n(ID: ${data.id})`,
  };
}

async function listMissions(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  if (!userId) {
    return {
      success: false,
      message: 'Vous devez être connecté pour voir vos missions.',
    };
  }

  const { client_id, client_name, status } = args;

  let query = supabase
    .from('missions')
    .select(`
      id, title, status, estimated_amount, final_amount,
      started_at, delivered_at, invoiced_at, paid_at,
      client:clients(id, nom),
      deal:deals(id, title)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  if (client_id) {
    query = query.eq('client_id', client_id);
  }

  const { data, error } = await query.limit(20);

  if (error) {
    return { success: false, message: `Erreur: ${error.message}` };
  }

  let missions = data || [];
  if (client_name && !client_id) {
    const searchTerm = (client_name as string).toLowerCase();
    missions = missions.filter(m => {
      const clientNom = (m.client as { nom?: string } | null)?.nom;
      return clientNom?.toLowerCase().includes(searchTerm);
    });
  }

  if (missions.length === 0) {
    return { success: true, data: [], message: 'Aucune mission trouvée.' };
  }

  const statusLabels: Record<string, string> = {
    in_progress: '🔄 En cours',
    delivered: '📦 Livrée',
    to_invoice: '💰 À facturer',
    invoiced: '📄 Facturée',
    paid: '✅ Payée',
    closed: '🔒 Terminée',
    cancelled: '❌ Annulée',
  };

  const summary = missions.map(m => {
    const amount = m.final_amount || m.estimated_amount;
    const amountStr = amount ? ` - ${amount}€` : '';
    const clientNom = (m.client as { nom?: string } | null)?.nom || 'N/A';
    return `• ${m.title} (${clientNom}) ${statusLabels[m.status] || m.status}${amountStr}`;
  }).join('\n');

  return {
    success: true,
    data: missions,
    message: `${missions.length} mission(s) trouvée(s):\n${summary}`,
  };
}

async function getMission(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const { mission_id } = args;

  if (!mission_id) {
    return { success: false, message: 'ID de la mission requis.' };
  }

  const { data, error } = await supabase
    .from('missions')
    .select(`
      *,
      client:clients(id, nom, email),
      deal:deals(id, title, status),
      mission_invoices(invoice:invoices(id, numero, status, total_ttc))
    `)
    .eq('id', mission_id)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return { success: false, message: 'Mission non trouvée.' };
  }

  const statusLabels: Record<string, string> = {
    in_progress: 'En cours',
    delivered: 'Livrée',
    to_invoice: 'À facturer',
    invoiced: 'Facturée',
    paid: 'Payée',
    closed: 'Terminée',
    cancelled: 'Annulée',
  };

  const amount = data.final_amount || data.estimated_amount;
  const invoices = data.mission_invoices?.map((mi: { invoice: { numero: string; status: string } }) => mi.invoice?.numero).filter(Boolean).join(', ') || 'Aucune';

  return {
    success: true,
    data,
    message: `Mission: ${data.title}\nClient: ${data.client?.nom}\nStatut: ${statusLabels[data.status]}\nMontant: ${amount ? `${amount}€` : 'Non défini'}\nFactures: ${invoices}`,
  };
}

async function updateMissionStatus(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const { mission_id, status } = args;

  if (!mission_id || !status) {
    return { success: false, message: 'ID de la mission et nouveau statut requis.' };
  }

  const validStatuses = ['in_progress', 'delivered', 'to_invoice', 'invoiced', 'paid', 'closed', 'cancelled'];
  if (!validStatuses.includes(status as string)) {
    return { success: false, message: `Statut invalide. Valeurs possibles: ${validStatuses.join(', ')}` };
  }

  const { data: currentMission } = await supabase
    .from('missions')
    .select('*, client:clients(nom)')
    .eq('id', mission_id)
    .eq('user_id', userId)
    .single();

  if (!currentMission) {
    return { success: false, message: 'Mission non trouvée.' };
  }

  const { data, error } = await supabase
    .from('missions')
    .update({ status: status as string })
    .eq('id', mission_id)
    .select()
    .single();

  if (error) {
    return { success: false, message: `Erreur: ${error.message}` };
  }

  const statusLabels: Record<string, string> = {
    in_progress: 'En cours',
    delivered: 'Livrée',
    to_invoice: 'À facturer',
    invoiced: 'Facturée',
    paid: 'Payée',
    closed: 'Terminée',
    cancelled: 'Annulée',
  };

  let nextAction = '';
  if (status === 'delivered' || status === 'to_invoice') {
    nextAction = ' Prochaine étape: créer une facture.';
  }

  return {
    success: true,
    data,
    message: `Mission "${currentMission.title}" mise à jour: ${statusLabels[currentMission.status]} → ${statusLabels[status as string]}.${nextAction}`,
  };
}

// ============================================================================
// BRIEF HANDLERS
// ============================================================================

async function listBriefTemplates(
  supabase: Supabase,
  userId: string | null
): Promise<ToolResult> {
  const { data, error } = await supabase
    .from('brief_templates')
    .select('id, name, description, is_default')
    .eq('user_id', userId)
    .order('name');

  if (error) {
    return { success: false, message: `Erreur: ${error.message}` };
  }

  if (!data || data.length === 0) {
    return { success: true, data: [], message: 'Aucun template de brief trouvé. Créez-en un depuis les paramètres.' };
  }

  const summary = data.map(t =>
    `• ${t.name}${t.is_default ? ' (par défaut)' : ''}${t.description ? ` - ${t.description}` : ''}`
  ).join('\n');

  return {
    success: true,
    data,
    message: `${data.length} template(s) de brief:\n${summary}`,
  };
}

async function createBrief(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const { deal_id, template_id, template_name, title } = args;

  if (!deal_id || !title) {
    return { success: false, message: 'ID du deal et titre du brief requis.' };
  }

  // Vérifier le deal
  const { data: deal, error: dealError } = await supabase
    .from('deals')
    .select('id, client_id, title, client:clients(nom)')
    .eq('id', deal_id)
    .eq('user_id', userId)
    .single();

  if (dealError || !deal) {
    return { success: false, message: 'Deal non trouvé.' };
  }

  // Trouver le template si spécifié
  let templateIdToUse = template_id as string | undefined;
  if (!templateIdToUse && template_name) {
    const { data: template } = await supabase
      .from('brief_templates')
      .select('id')
      .eq('user_id', userId)
      .ilike('name', `%${template_name}%`)
      .limit(1)
      .single();

    if (template) {
      templateIdToUse = template.id;
    }
  }

  // Créer le brief
  const { data, error } = await supabase
    .from('briefs')
    .insert({
      user_id: userId,
      deal_id: deal_id as string,
      client_id: deal.client_id,
      template_id: templateIdToUse || null,
      title: title as string,
      status: 'DRAFT',
    })
    .select()
    .single();

  if (error) {
    return { success: false, message: `Erreur: ${error.message}` };
  }

  // Si template, copier les questions
  if (templateIdToUse) {
    const { data: templateQuestions } = await supabase
      .from('brief_template_questions')
      .select('*')
      .eq('template_id', templateIdToUse)
      .order('position');

    if (templateQuestions && templateQuestions.length > 0) {
      const questionsToInsert = templateQuestions.map(q => ({
        brief_id: data.id,
        type: q.type,
        label: q.label,
        position: q.position,
        is_required: q.is_required,
        config: q.config,
      }));

      await supabase.from('brief_questions').insert(questionsToInsert);
    }
  }

  return {
    success: true,
    data,
    message: `Brief "${data.title}" créé pour le deal "${deal.title}" (client: ${(deal.client as { nom?: string } | null)?.nom || 'N/A'}). Statut: Brouillon.\n(ID: ${data.id})`,
  };
}

async function listBriefs(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const { deal_id, client_id, client_name, status } = args;

  let query = supabase
    .from('briefs')
    .select(`
      id, title, status, created_at, sent_at, responded_at,
      client:clients(id, nom),
      deal:deals(id, title)
    `)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  if (deal_id) {
    query = query.eq('deal_id', deal_id);
  }

  if (client_id) {
    query = query.eq('client_id', client_id);
  }

  const { data, error } = await query.limit(20);

  if (error) {
    return { success: false, message: `Erreur: ${error.message}` };
  }

  let briefs = data || [];
  if (client_name && !client_id) {
    const searchTerm = (client_name as string).toLowerCase();
    briefs = briefs.filter(b => {
      const clientNom = (b.client as { nom?: string } | null)?.nom;
      return clientNom?.toLowerCase().includes(searchTerm);
    });
  }

  if (briefs.length === 0) {
    return { success: true, data: [], message: 'Aucun brief trouvé.' };
  }

  const statusLabels: Record<string, string> = {
    DRAFT: '📝 Brouillon',
    SENT: '📤 Envoyé',
    RESPONDED: '✅ Répondu',
  };

  const summary = briefs.map(b => {
    const clientNom = (b.client as { nom?: string } | null)?.nom || 'N/A';
    return `• ${b.title} (${clientNom}) ${statusLabels[b.status] || b.status}`;
  }).join('\n');

  return {
    success: true,
    data: briefs,
    message: `${briefs.length} brief(s) trouvé(s):\n${summary}`,
  };
}

async function sendBrief(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const { brief_id } = args;

  if (!brief_id) {
    return { success: false, message: 'ID du brief requis.' };
  }

  // Récupérer le brief
  const { data: brief, error: briefError } = await supabase
    .from('briefs')
    .select('*, client:clients(nom, email)')
    .eq('id', brief_id)
    .eq('user_id', userId)
    .single();

  if (briefError || !brief) {
    return { success: false, message: 'Brief non trouvé.' };
  }

  if (brief.status !== 'DRAFT') {
    return { success: false, message: 'Ce brief a déjà été envoyé.' };
  }

  // Générer un token public si nécessaire
  const publicToken = brief.public_token || crypto.randomUUID().replace(/-/g, '').substring(0, 32);

  // Mettre à jour le brief
  const { data, error } = await supabase
    .from('briefs')
    .update({
      status: 'SENT',
      sent_at: new Date().toISOString(),
      public_token: publicToken,
    })
    .eq('id', brief_id)
    .select()
    .single();

  if (error) {
    return { success: false, message: `Erreur: ${error.message}` };
  }

  const publicUrl = `/b/${publicToken}`;

  return {
    success: true,
    data: { ...data, public_url: publicUrl },
    message: `Brief "${brief.title}" envoyé au client ${brief.client?.nom}.\nLien public: ${publicUrl}`,
  };
}

async function updateBriefStatus(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const { brief_id, status } = args;

  if (!brief_id) {
    return { success: false, message: 'ID du brief requis.' };
  }

  if (!status) {
    return { success: false, message: 'Le nouveau statut est requis.' };
  }

  const validStatuses = ['DRAFT', 'SENT', 'RESPONDED'];
  if (!validStatuses.includes(status as string)) {
    return { success: false, message: `Statut invalide. Valeurs possibles: ${validStatuses.join(', ')}` };
  }

  // Get current brief
  const { data: currentBrief } = await supabase
    .from('briefs')
    .select('*, client:clients(nom)')
    .eq('id', brief_id)
    .eq('user_id', userId)
    .single();

  if (!currentBrief) {
    return { success: false, message: 'Brief non trouvé.' };
  }

  // Update status
  const updateData: Record<string, unknown> = { status: status as string };

  // Set sent_at if marking as sent
  if (status === 'SENT' && !currentBrief.sent_at) {
    updateData.sent_at = new Date().toISOString();
  }

  // Set responded_at if marking as responded
  if (status === 'RESPONDED') {
    updateData.responded_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('briefs')
    .update(updateData)
    .eq('id', brief_id)
    .select()
    .single();

  if (error) {
    return { success: false, message: `Erreur: ${error.message}` };
  }

  const statusLabels: Record<string, string> = {
    DRAFT: 'Brouillon',
    SENT: 'Envoyé',
    RESPONDED: 'Répondu',
  };

  const clientNom = (currentBrief.client as { nom: string })?.nom || 'N/A';
  const statusLabel = statusLabels[status as string] || status;

  return {
    success: true,
    data,
    message: `Brief "${currentBrief.title}" pour ${clientNom} marqué comme "${statusLabel}".`,
  };
}

// ============================================================================
// REVIEW HANDLERS
// ============================================================================

async function createReviewRequest(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const { mission_id, invoice_id, title, context_text } = args;

  if (!title) {
    return { success: false, message: 'Titre de la demande d\'avis requis.' };
  }

  let invoiceIdToUse = invoice_id as string | undefined;
  let clientId: string | undefined;

  // Si mission_id fourni, trouver la facture associée
  if (mission_id && !invoiceIdToUse) {
    const { data: missionInvoice } = await supabase
      .from('mission_invoices')
      .select('invoice_id, mission:missions(client_id)')
      .eq('mission_id', mission_id)
      .limit(1)
      .single();

    if (missionInvoice) {
      invoiceIdToUse = missionInvoice.invoice_id;
      clientId = (missionInvoice.mission as { client_id?: string } | null)?.client_id;
    }
  }

  // Si toujours pas de facture, prendre la dernière facture payée
  if (!invoiceIdToUse) {
    const { data: lastInvoice } = await supabase
      .from('invoices')
      .select('id, client_id')
      .eq('user_id', userId)
      .eq('status', 'paid')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (lastInvoice) {
      invoiceIdToUse = lastInvoice.id;
      clientId = lastInvoice.client_id;
    }
  }

  if (!invoiceIdToUse) {
    return { success: false, message: 'Aucune facture payée trouvée. Spécifiez mission_id ou invoice_id.' };
  }

  // Récupérer les infos de la facture si clientId pas encore défini
  if (!clientId) {
    const { data: invoice } = await supabase
      .from('invoices')
      .select('client_id')
      .eq('id', invoiceIdToUse)
      .single();

    clientId = invoice?.client_id;
  }

  if (!clientId) {
    return { success: false, message: 'Client non trouvé pour cette facture.' };
  }

  // Générer un token public
  const publicToken = crypto.randomUUID().replace(/-/g, '').substring(0, 32);

  const { data, error } = await supabase
    .from('review_requests')
    .insert({
      user_id: userId,
      invoice_id: invoiceIdToUse,
      client_id: clientId,
      title: title as string,
      context_text: (context_text as string) || null,
      status: 'sent',
      public_token: publicToken,
    })
    .select(`
      *,
      client:clients(nom)
    `)
    .single();

  if (error) {
    if (error.code === '23505') {
      return { success: false, message: 'Une demande d\'avis existe déjà pour cette facture.' };
    }
    return { success: false, message: `Erreur: ${error.message}` };
  }

  const publicUrl = `/r/${publicToken}`;

  return {
    success: true,
    data: { ...data, public_url: publicUrl },
    message: `Demande d'avis "${data.title}" créée pour ${data.client?.nom}.\nLien public: ${publicUrl}\n(ID: ${data.id})`,
  };
}

async function listReviews(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const { client_id, is_published } = args;

  let query = supabase
    .from('reviews')
    .select(`
      id, reviewer_name, reviewer_company, rating_overall, comment,
      is_published, created_at,
      client:clients(id, nom)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (client_id) {
    query = query.eq('client_id', client_id);
  }

  if (typeof is_published === 'boolean') {
    query = query.eq('is_published', is_published);
  }

  const { data, error } = await query.limit(20);

  if (error) {
    return { success: false, message: `Erreur: ${error.message}` };
  }

  if (!data || data.length === 0) {
    return { success: true, data: [], message: 'Aucun avis trouvé.' };
  }

  const summary = data.map(r => {
    const stars = r.rating_overall ? '⭐'.repeat(r.rating_overall) : '';
    const published = r.is_published ? '✅' : '📝';
    const excerpt = r.comment ? r.comment.substring(0, 50) + (r.comment.length > 50 ? '...' : '') : '';
    const clientNom = (r.client as { nom?: string } | null)?.nom || 'N/A';
    return `${published} ${r.reviewer_name || 'Anonyme'} (${clientNom}) ${stars}\n   "${excerpt}"`;
  }).join('\n');

  return {
    success: true,
    data,
    message: `${data.length} avis trouvé(s):\n${summary}`,
  };
}

async function listReviewRequests(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const { status, client_id } = args;

  let query = supabase
    .from('review_requests')
    .select(`
      id, title, status, sent_at, last_reminded_at,
      client:clients(id, nom)
    `)
    .eq('user_id', userId)
    .order('sent_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  if (client_id) {
    query = query.eq('client_id', client_id);
  }

  const { data, error } = await query.limit(20);

  if (error) {
    return { success: false, message: `Erreur: ${error.message}` };
  }

  if (!data || data.length === 0) {
    return { success: true, data: [], message: 'Aucune demande d\'avis trouvée.' };
  }

  const statusLabels: Record<string, string> = {
    sent: '📤 Envoyée',
    pending: '⏳ En attente',
    responded: '✅ Répondue',
  };

  const summary = data.map(r => {
    const clientNom = (r.client as { nom?: string } | null)?.nom || 'N/A';
    return `• ${r.title} (${clientNom}) ${statusLabels[r.status] || r.status}`;
  }).join('\n');

  return {
    success: true,
    data,
    message: `${data.length} demande(s) d'avis:\n${summary}`,
  };
}

// ============================================================================
// PAYMENT HANDLERS
// ============================================================================

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  virement: 'Virement',
  cheque: 'Chèque',
  especes: 'Espèces',
  cb: 'CB',
  prelevement: 'Prélèvement',
  autre: 'Autre',
};

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  payment: 'Paiement',
  advance: 'Avance',
  refund: 'Remboursement',
};

async function createPayment(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const {
    client_id,
    client_name,
    invoice_id,
    invoice_numero,
    mission_id,
    amount,
    payment_date,
    payment_method,
    payment_type,
    reference,
    notes,
  } = args;

  if (!amount || amount === 0) {
    return { success: false, message: 'Le montant est requis et doit être différent de 0' };
  }

  // Résoudre client_id depuis le nom si nécessaire
  let resolvedClientId = client_id as string | undefined;
  if (!resolvedClientId && client_name) {
    const { data: clients } = await supabase
      .from('clients')
      .select('id, nom')
      .eq('user_id', userId)
      .ilike('nom', `%${client_name}%`)
      .limit(1);

    if (clients && clients.length > 0) {
      resolvedClientId = clients[0].id;
    } else {
      return { success: false, message: `Client "${client_name}" non trouvé` };
    }
  }

  // Résoudre invoice_id depuis le numéro si nécessaire
  let resolvedInvoiceId = invoice_id as string | undefined;
  if (!resolvedInvoiceId && invoice_numero) {
    const { data: invoices } = await supabase
      .from('invoices')
      .select('id, numero, client_id')
      .eq('user_id', userId)
      .eq('numero', invoice_numero)
      .limit(1);

    if (invoices && invoices.length > 0) {
      resolvedInvoiceId = invoices[0].id;
      // Auto-set client_id from invoice if not provided
      if (!resolvedClientId) {
        resolvedClientId = invoices[0].client_id;
      }
    } else {
      return { success: false, message: `Facture "${invoice_numero}" non trouvée` };
    }
  }

  // Validation: au moins client_id ou invoice_id doit être fourni
  if (!resolvedClientId && !resolvedInvoiceId) {
    return { success: false, message: 'Un client ou une facture est requis' };
  }

  const { data, error } = await supabase
    .from('payments')
    .insert({
      user_id: userId,
      client_id: resolvedClientId || null,
      invoice_id: resolvedInvoiceId || null,
      mission_id: (mission_id as string) || null,
      amount: amount as number,
      payment_date: (payment_date as string) || new Date().toISOString().split('T')[0],
      payment_method: (payment_method as string) || 'virement',
      payment_type: (payment_type as string) || (resolvedInvoiceId ? 'payment' : 'advance'),
      reference: (reference as string) || null,
      notes: (notes as string) || null,
    })
    .select('*')
    .single();

  if (error) {
    return { success: false, message: `Erreur: ${error.message}` };
  }

  const typeLabel = PAYMENT_TYPE_LABELS[data.payment_type] || data.payment_type;
  const methodLabel = PAYMENT_METHOD_LABELS[data.payment_method] || data.payment_method;

  return {
    success: true,
    data,
    message: `${typeLabel} de ${Math.abs(data.amount).toFixed(2)} € enregistré (${methodLabel})`,
  };
}

async function listPaymentsHandler(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const { client_id, client_name, invoice_id, mission_id, payment_type } = args;

  let query = supabase
    .from('payments')
    .select(`
      *,
      client:clients(id, nom),
      invoice:invoices(id, numero)
    `)
    .eq('user_id', userId)
    .order('payment_date', { ascending: false })
    .limit(50);

  // Résoudre client_id depuis le nom si nécessaire
  let resolvedClientId = client_id as string | undefined;
  if (!resolvedClientId && client_name) {
    const { data: clients } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', userId)
      .ilike('nom', `%${client_name}%`)
      .limit(1);

    if (clients && clients.length > 0) {
      resolvedClientId = clients[0].id;
    }
  }

  if (resolvedClientId) {
    query = query.eq('client_id', resolvedClientId);
  }
  if (invoice_id) {
    query = query.eq('invoice_id', invoice_id);
  }
  if (mission_id) {
    query = query.eq('mission_id', mission_id);
  }
  if (payment_type) {
    query = query.eq('payment_type', payment_type);
  }

  const { data, error } = await query;

  if (error) {
    return { success: false, message: `Erreur: ${error.message}` };
  }

  if (!data || data.length === 0) {
    return { success: true, data: [], message: 'Aucun paiement trouvé' };
  }

  const summary = data.map(p => {
    const clientNom = (p.client as { nom?: string } | null)?.nom || 'N/A';
    const invoiceNum = (p.invoice as { numero?: string } | null)?.numero;
    const typeLabel = PAYMENT_TYPE_LABELS[p.payment_type] || p.payment_type;
    const methodLabel = PAYMENT_METHOD_LABELS[p.payment_method] || p.payment_method;
    const sign = p.amount >= 0 ? '+' : '';
    const invoiceInfo = invoiceNum ? ` → ${invoiceNum}` : '';
    return `• ${p.payment_date}: ${sign}${p.amount.toFixed(2)} € (${typeLabel}, ${methodLabel}) - ${clientNom}${invoiceInfo}`;
  }).join('\n');

  return {
    success: true,
    data,
    message: `${data.length} paiement(s):\n${summary}`,
  };
}

async function updatePaymentHandler(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const { payment_id, amount, payment_date, payment_method, reference, notes } = args;

  if (!payment_id) {
    return { success: false, message: 'ID du paiement requis' };
  }

  const updates: Record<string, unknown> = {};
  if (amount !== undefined) updates.amount = amount;
  if (payment_date) updates.payment_date = payment_date;
  if (payment_method) updates.payment_method = payment_method;
  if (reference !== undefined) updates.reference = reference;
  if (notes !== undefined) updates.notes = notes;

  if (Object.keys(updates).length === 0) {
    return { success: false, message: 'Aucune modification fournie' };
  }

  const { data, error } = await supabase
    .from('payments')
    .update(updates)
    .eq('id', payment_id)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) {
    return { success: false, message: `Erreur: ${error.message}` };
  }

  return {
    success: true,
    data,
    message: `Paiement modifié: ${data.amount.toFixed(2)} € le ${data.payment_date}`,
  };
}

async function deletePaymentHandler(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const { payment_id } = args;

  if (!payment_id) {
    return { success: false, message: 'ID du paiement requis' };
  }

  // Get payment details first for the message
  const { data: payment } = await supabase
    .from('payments')
    .select('amount, payment_date, payment_type')
    .eq('id', payment_id)
    .eq('user_id', userId)
    .single();

  if (!payment) {
    return { success: false, message: 'Paiement non trouvé' };
  }

  const { error } = await supabase
    .from('payments')
    .delete()
    .eq('id', payment_id)
    .eq('user_id', userId);

  if (error) {
    return { success: false, message: `Erreur: ${error.message}` };
  }

  const typeLabel = PAYMENT_TYPE_LABELS[payment.payment_type] || payment.payment_type;

  return {
    success: true,
    message: `${typeLabel} de ${Math.abs(payment.amount).toFixed(2)} € du ${payment.payment_date} supprimé`,
  };
}

async function getClientPaymentBalanceHandler(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const { client_id, client_name } = args;

  // Résoudre client_id depuis le nom si nécessaire
  let resolvedClientId = client_id as string | undefined;
  let clientNom = '';

  if (!resolvedClientId && client_name) {
    const { data: clients } = await supabase
      .from('clients')
      .select('id, nom')
      .eq('user_id', userId)
      .ilike('nom', `%${client_name}%`)
      .limit(1);

    if (clients && clients.length > 0) {
      resolvedClientId = clients[0].id;
      clientNom = clients[0].nom;
    } else {
      return { success: false, message: `Client "${client_name}" non trouvé` };
    }
  }

  if (!resolvedClientId) {
    return { success: false, message: 'Client requis (client_id ou client_name)' };
  }

  // Get balance from the view
  const { data, error } = await supabase
    .from('client_payment_balance')
    .select('*')
    .eq('client_id', resolvedClientId)
    .eq('user_id', userId)
    .single();

  if (error) {
    return { success: false, message: `Erreur: ${error.message}` };
  }

  if (!data) {
    return { success: true, data: null, message: 'Aucune donnée de solde trouvée pour ce client' };
  }

  const balanceStatus = data.balance > 0 ? '⚠️ Doit' : data.balance < 0 ? '💰 Crédit' : '✅ Soldé';

  return {
    success: true,
    data,
    message: `Solde ${clientNom || data.nom}:\n` +
      `• Facturé: ${Number(data.total_invoiced).toFixed(2)} €\n` +
      `• Payé sur factures: ${Number(data.total_paid_invoices).toFixed(2)} €\n` +
      `• Avances: ${Number(data.total_advances).toFixed(2)} €\n` +
      `• Remboursements: ${Number(data.total_refunds).toFixed(2)} €\n` +
      `• ${balanceStatus}: ${Math.abs(Number(data.balance)).toFixed(2)} €`,
  };
}

async function getMissionPaymentsHandler(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const { mission_id } = args;

  if (!mission_id) {
    return { success: false, message: 'ID de la mission requis' };
  }

  // Get mission summary from the view
  const { data, error } = await supabase
    .from('mission_payment_summary')
    .select('*')
    .eq('mission_id', mission_id)
    .eq('user_id', userId)
    .single();

  if (error) {
    return { success: false, message: `Erreur: ${error.message}` };
  }

  if (!data) {
    return { success: true, data: null, message: 'Mission non trouvée' };
  }

  const remainingStatus = Number(data.remaining) > 0 ? '⚠️ Reste' : '✅ Complet';

  return {
    success: true,
    data,
    message: `Paiements mission "${data.title}":\n` +
      `• Total facturé: ${Number(data.total_invoiced).toFixed(2)} €\n` +
      `• Total payé: ${Number(data.total_paid).toFixed(2)} €\n` +
      `• Avances: ${Number(data.total_advances).toFixed(2)} €\n` +
      `• ${remainingStatus}: ${Math.abs(Number(data.remaining)).toFixed(2)} €`,
  };
}

async function getInvoicePaymentsHandler(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const { invoice_id, invoice_numero } = args;

  // Résoudre invoice_id depuis le numéro si nécessaire
  let resolvedInvoiceId = invoice_id as string | undefined;

  if (!resolvedInvoiceId && invoice_numero) {
    const { data: invoices } = await supabase
      .from('invoices')
      .select('id')
      .eq('user_id', userId)
      .eq('numero', invoice_numero)
      .limit(1);

    if (invoices && invoices.length > 0) {
      resolvedInvoiceId = invoices[0].id;
    } else {
      return { success: false, message: `Facture "${invoice_numero}" non trouvée` };
    }
  }

  if (!resolvedInvoiceId) {
    return { success: false, message: 'Facture requise (invoice_id ou invoice_numero)' };
  }

  // Get invoice summary from the view
  const { data, error } = await supabase
    .from('invoice_payment_summary')
    .select('*')
    .eq('id', resolvedInvoiceId)
    .eq('user_id', userId)
    .single();

  if (error) {
    return { success: false, message: `Erreur: ${error.message}` };
  }

  if (!data) {
    return { success: true, data: null, message: 'Facture non trouvée' };
  }

  const statusLabels: Record<string, string> = {
    non_paye: '❌ Non payée',
    partiel: '⏳ Partiellement payée',
    paye: '✅ Payée',
  };
  const statusLabel = statusLabels[data.payment_status] || data.payment_status;

  // Get payment list
  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .eq('invoice_id', resolvedInvoiceId)
    .order('payment_date', { ascending: false });

  const paymentsList = payments && payments.length > 0
    ? '\n\nPaiements:\n' + payments.map(p => {
        const methodLabel = PAYMENT_METHOD_LABELS[p.payment_method] || p.payment_method;
        return `• ${p.payment_date}: ${p.amount.toFixed(2)} € (${methodLabel})`;
      }).join('\n')
    : '';

  return {
    success: true,
    data: { ...data, payments },
    message: `Facture ${data.numero} - ${statusLabel}\n` +
      `• Total TTC: ${Number(data.total_ttc).toFixed(2)} €\n` +
      `• Payé: ${Number(data.total_paid).toFixed(2)} €\n` +
      `• Reste: ${Number(data.remaining).toFixed(2)} €${paymentsList}`,
  };
}

// ============================================================================
// TASK TEMPLATE HANDLERS
// ============================================================================

async function findTaskTemplateByName(
  supabase: Supabase,
  userId: string,
  name: string
): Promise<TaskTemplateWithCounts | null> {
  const templates = await listTaskTemplates(supabase, userId);
  return templates.find(t => t.name.toLowerCase().includes(name.toLowerCase())) || null;
}

async function findEntityByName(
  supabase: Supabase,
  userId: string | null,
  entityType: string,
  name: string
): Promise<{ id: string; title: string } | null> {
  // Helper to search in a specific table
  async function searchInTable(
    table: string,
    titleField: string
  ): Promise<{ id: string; title: string } | null> {
    let query = supabase
      .from(table)
      .select('*')
      .ilike(titleField, `%${name}%`)
      .limit(1);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data } = await query.single();
    if (!data) return null;

    const record = data as Record<string, unknown>;
    return {
      id: record.id as string,
      title: record[titleField] as string,
    };
  }

  switch (entityType) {
    case 'deal':
      return searchInTable('deals', 'title');
    case 'mission':
      return searchInTable('missions', 'title');
    case 'client':
      return searchInTable('clients', 'nom');
    case 'contact':
      return searchInTable('contacts', 'nom');
    default:
      return null;
  }
}

async function createTaskTemplateHandler(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  if (!userId) {
    return { success: false, message: 'Vous devez être connecté.' };
  }

  const { name, description, target_entity_type, items } = args;

  if (!name) {
    return { success: false, message: 'Le nom du template est requis.' };
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return { success: false, message: 'Au moins un item est requis dans le template.' };
  }

  const result = await createTaskTemplate(supabase, userId, {
    name: name as string,
    description: description as string | undefined,
    target_entity_type: target_entity_type as TemplateTargetEntityType | undefined,
    items: items as Array<{
      title: string;
      description?: string;
      day_offset?: number;
      owner_scope?: 'me' | 'client' | 'supplier';
    }>,
  });

  if (!result.success) {
    return { success: false, message: `Erreur: ${result.error}` };
  }

  const template = result.data!;
  const entityTypeLabel = template.target_entity_type
    ? ` (pour ${template.target_entity_type}s)`
    : '';

  return {
    success: true,
    data: template,
    message: `Template "${template.name}" créé avec ${template.items.length} tâche(s)${entityTypeLabel}.\n(ID: ${template.id})`,
  };
}

async function listTaskTemplatesHandler(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  if (!userId) {
    return { success: false, message: 'Vous devez être connecté.' };
  }

  const { target_entity_type } = args;

  const templates = await listTaskTemplates(supabase, userId, {
    target_entity_type: target_entity_type as TemplateTargetEntityType | undefined,
    is_active: true,
  });

  if (templates.length === 0) {
    return {
      success: true,
      data: [],
      message: 'Aucun template de tâches trouvé.',
    };
  }

  const templateList = templates.map(t => {
    const entityLabel = t.target_entity_type ? ` [${t.target_entity_type}]` : ' [tous]';
    const daysInfo = t.max_day_offset > 0 ? ` • Délai max: ${t.max_day_offset}j` : '';
    return `- ${t.name}${entityLabel}: ${t.item_count} tâche(s)${daysInfo}`;
  }).join('\n');

  return {
    success: true,
    data: templates,
    message: `${templates.length} template(s) trouvé(s):\n${templateList}`,
  };
}

async function listTaskTemplateCategoriesHandler(
  supabase: Supabase,
  userId: string | null
): Promise<ToolResult> {
  if (!userId) {
    return { success: false, message: 'Vous devez être connecté.' };
  }

  const categories = await listTaskTemplateCategories(supabase, userId);

  if (categories.length === 0) {
    return {
      success: true,
      data: [],
      message: 'Aucune catégorie de templates trouvée. Créez des templates avec des catégories pour les organiser.',
    };
  }

  const categoryList = categories
    .map(c => `- ${c.category} (${c.item_count} tâche${c.item_count !== 1 ? 's' : ''})`)
    .join('\n');

  return {
    success: true,
    data: categories,
    message: `${categories.length} catégorie(s) de templates:\n${categoryList}`,
  };
}

async function getTaskTemplateHandler(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  if (!userId) {
    return { success: false, message: 'Vous devez être connecté.' };
  }

  let templateId = args.template_id as string | undefined;
  const templateName = args.template_name as string | undefined;

  // Find template by name if needed
  if (!templateId && templateName) {
    const found = await findTaskTemplateByName(supabase, userId, templateName);
    if (found) {
      templateId = found.id;
    } else {
      return { success: false, message: `Template "${templateName}" non trouvé.` };
    }
  }

  if (!templateId) {
    return { success: false, message: 'Template requis (template_id ou template_name).' };
  }

  const template = await getTaskTemplate(supabase, userId, templateId);

  if (!template) {
    return { success: false, message: 'Template non trouvé.' };
  }

  // Group items by category for display
  const itemsByCategory = template.items.reduce((acc, item) => {
    const cat = item.category || 'Général';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, typeof template.items>);

  const itemsList = Object.entries(itemsByCategory).map(([category, items]) => {
    const itemsStr = items.map(item => {
      const daysInfo = item.day_offset > 0 ? ` (+${item.day_offset}j)` : '';
      const ownerInfo = item.owner_scope !== 'me' ? ` [${item.owner_scope}]` : '';
      const subgroupInfo = item.subgroup ? ` (${item.subgroup})` : '';
      return `    • ${item.title}${subgroupInfo}${daysInfo}${ownerInfo}`;
    }).join('\n');
    return `  ${category}:\n${itemsStr}`;
  }).join('\n');

  return {
    success: true,
    data: template,
    message: `Template: ${template.name}\n` +
      (template.description ? `Description: ${template.description}\n` : '') +
      `Cible: ${template.target_entity_type || 'tous'}\n` +
      `Tâches:\n${itemsList}`,
  };
}

async function updateTaskTemplateHandler(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  if (!userId) {
    return { success: false, message: 'Vous devez être connecté.' };
  }

  let templateId = args.template_id as string | undefined;
  const templateName = args.template_name as string | undefined;

  // Find template by name if needed
  if (!templateId && templateName) {
    const found = await findTaskTemplateByName(supabase, userId, templateName);
    if (found) {
      templateId = found.id;
    } else {
      return { success: false, message: `Template "${templateName}" non trouvé.` };
    }
  }

  if (!templateId) {
    return { success: false, message: 'Template requis.' };
  }

  const updates: Record<string, unknown> = {};
  if (args.name !== undefined) updates.name = args.name;
  if (args.description !== undefined) updates.description = args.description;
  if (args.target_entity_type !== undefined) updates.target_entity_type = args.target_entity_type;
  if (args.is_active !== undefined) updates.is_active = args.is_active;

  if (Object.keys(updates).length === 0) {
    return { success: false, message: 'Aucune modification spécifiée.' };
  }

  const result = await updateTaskTemplate(supabase, userId, templateId, updates);

  if (!result.success) {
    return { success: false, message: `Erreur: ${result.error}` };
  }

  return {
    success: true,
    data: result.data,
    message: `Template "${result.data!.name}" mis à jour.`,
  };
}

async function deleteTaskTemplateHandler(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  if (!userId) {
    return { success: false, message: 'Vous devez être connecté.' };
  }

  let templateId = args.template_id as string | undefined;
  const templateName = args.template_name as string | undefined;

  // Find template by name if needed
  if (!templateId && templateName) {
    const found = await findTaskTemplateByName(supabase, userId, templateName);
    if (found) {
      templateId = found.id;
    } else {
      return { success: false, message: `Template "${templateName}" non trouvé.` };
    }
  }

  if (!templateId) {
    return { success: false, message: 'Template requis.' };
  }

  // Get template name before deletion
  const template = await getTaskTemplate(supabase, userId, templateId);
  const name = template?.name || 'Template';

  const result = await deleteTaskTemplate(supabase, userId, templateId);

  if (!result.success) {
    return { success: false, message: `Erreur: ${result.error}` };
  }

  return {
    success: true,
    data: { deleted: templateId },
    message: `Template "${name}" supprimé.`,
  };
}

async function applyTaskTemplateHandler(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  if (!userId) {
    return { success: false, message: 'Vous devez être connecté.' };
  }

  let templateId = args.template_id as string | undefined;
  const templateName = args.template_name as string | undefined;
  const entityType = args.entity_type as string;
  let entityId = args.entity_id as string | undefined;
  const entityName = args.entity_name as string | undefined;
  const referenceDate = args.reference_date as string | undefined;

  if (!entityType) {
    return { success: false, message: 'Type d\'entité requis (deal, mission, client, contact).' };
  }

  // Find template by name if needed
  if (!templateId && templateName) {
    const found = await findTaskTemplateByName(supabase, userId, templateName);
    if (found) {
      templateId = found.id;
    } else {
      return { success: false, message: `Template "${templateName}" non trouvé.` };
    }
  }

  if (!templateId) {
    // List available templates
    const templates = await listTaskTemplates(supabase, userId, { is_active: true });
    if (templates.length === 0) {
      return { success: false, message: 'Aucun template disponible. Créez-en un d\'abord.' };
    }
    const templateList = templates.map(t => `- ${t.name} (${t.item_count} tâches)`).join('\n');
    return {
      success: false,
      message: `Template requis. Templates disponibles:\n${templateList}`,
    };
  }

  // Find entity by name if needed
  if (!entityId && entityName) {
    const found = await findEntityByName(supabase, userId, entityType, entityName);
    if (found) {
      entityId = found.id;
    } else {
      return { success: false, message: `${entityType} "${entityName}" non trouvé(e).` };
    }
  }

  if (!entityId) {
    return { success: false, message: `ID de ${entityType} requis.` };
  }

  const result = await applyTaskTemplate(supabase, userId, {
    template_id: templateId,
    entity_type: entityType as TaskEntityType,
    entity_id: entityId,
    reference_date: referenceDate,
  });

  if (!result.success) {
    return { success: false, message: `Erreur: ${result.error}` };
  }

  const tasks = result.data || [];
  const template = await getTaskTemplate(supabase, userId, templateId);

  return {
    success: true,
    data: { tasks, template_name: template?.name },
    message: `Template "${template?.name}" appliqué: ${tasks.length} tâche(s) créée(s) pour ${entityType} ${entityId.slice(0, 8)}...`,
  };
}

async function getEntityTasksHandler(
  supabase: Supabase,
  userId: string | null,
  args: Record<string, unknown>
): Promise<ToolResult> {
  if (!userId) {
    return { success: false, message: 'Vous devez être connecté.' };
  }

  const entityType = args.entity_type as string;
  let entityId = args.entity_id as string | undefined;
  const entityName = args.entity_name as string | undefined;

  if (!entityType) {
    return { success: false, message: 'Type d\'entité requis (deal, mission, client, contact, invoice).' };
  }

  // Find entity by name if needed
  if (!entityId && entityName) {
    const found = await findEntityByName(supabase, userId, entityType, entityName);
    if (found) {
      entityId = found.id;
    } else {
      return { success: false, message: `${entityType} "${entityName}" non trouvé(e).` };
    }
  }

  if (!entityId) {
    return { success: false, message: `ID de ${entityType} requis.` };
  }

  const result = await getEntityTasks(supabase, userId, entityType as TaskEntityType, entityId);

  const { tasks, progress } = result;

  if (tasks.length === 0) {
    return {
      success: true,
      data: { tasks: [], progress: null },
      message: `Aucune tâche pour ce ${entityType}.`,
    };
  }

  const tasksList = tasks.map(t => {
    const status = t.status === 'done' ? '✓' : '○';
    const dueDate = t.due_date ? ` (échéance: ${t.due_date})` : '';
    return `  ${status} ${t.title}${dueDate}`;
  }).join('\n');

  const progressInfo = progress
    ? `Progression: ${progress.completed_tasks}/${progress.total_tasks} (${progress.progress_percent}%)\n`
    : '';

  return {
    success: true,
    data: { tasks, progress },
    message: `Tâches du ${entityType}:\n${progressInfo}${tasksList}`,
  };
}

// ============================================================================
// UI Navigation Handler
// ============================================================================

function openTabHandler(args: Record<string, unknown>): ToolResult {
  const { entity_type, entity_id, title } = args;

  if (!entity_type || !entity_id || !title) {
    return { success: false, message: 'entity_type, entity_id et title sont requis' };
  }

  const pathMap: Record<string, string> = {
    client: '/clients',
    invoice: '/invoices',
    quote: '/quotes',
    deal: '/deals',
    mission: '/missions',
    proposal: '/proposals',
    brief: '/briefs',
    contact: '/contacts',
    supplier: '/suppliers',
    expense: '/expenses',
  };

  const basePath = pathMap[entity_type as string];
  if (!basePath) {
    return { success: false, message: `Type d'entité inconnu: ${entity_type}` };
  }

  return {
    success: true,
    data: {
      action: 'open_tab',
      tab: {
        type: entity_type,
        path: `${basePath}/${entity_id}`,
        title: title,
        entityId: entity_id,
      },
    },
    message: `Ouverture de ${title}`,
  };
}
