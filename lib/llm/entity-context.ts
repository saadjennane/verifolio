import { createClient } from '@/lib/supabase/server';
import { type ContextType } from '@/lib/chat/context';

// ============================================================================
// Types
// ============================================================================

interface ParsedContext {
  type: ContextType;
  id: string;
}

interface EntityData {
  [key: string]: unknown;
  client?: { name?: string } | null;
}

// ============================================================================
// Context Parsing
// ============================================================================

/**
 * Parse le contextId format "type:id" (ex: "invoice:abc-123")
 */
export function parseContextId(contextId: string | null): ParsedContext | null {
  if (!contextId || contextId === 'global' || contextId === 'dashboard:global') {
    return null;
  }

  const [type, ...idParts] = contextId.split(':');
  const id = idParts.join(':');

  if (!type || !id || id === 'global' || id === 'list') {
    return null;
  }

  const validTypes: ContextType[] = [
    'deal', 'mission', 'invoice', 'quote',
    'client', 'contact', 'proposal', 'brief', 'review'
  ];

  if (!validTypes.includes(type as ContextType)) {
    return null;
  }

  return { type: type as ContextType, id };
}

// ============================================================================
// Entity Data Fetching
// ============================================================================

const TABLE_MAP: Partial<Record<ContextType, string>> = {
  deal: 'deals',
  mission: 'missions',
  invoice: 'invoices',
  quote: 'quotes',
  client: 'clients',
  contact: 'contacts',
  proposal: 'proposals',
  brief: 'briefs',
  review: 'reviews',
};

/**
 * Récupère les données d'une entité depuis Supabase
 */
export async function fetchEntityData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  type: ContextType,
  id: string
): Promise<EntityData | null> {
  const tableName = TABLE_MAP[type];
  if (!tableName) return null;

  try {
    // Première requête pour l'entité
    const { data: entityData, error: entityError } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (entityError || !entityData) {
      console.log('[EntityContext] Error fetching entity:', entityError?.message);
      return null;
    }

    // Si l'entité a un client_id, récupérer le client séparément
    const hasClient = ['deal', 'mission', 'invoice', 'quote', 'proposal', 'brief', 'review'].includes(type);
    const clientId = (entityData as Record<string, unknown>).client_id;

    if (hasClient && clientId && typeof clientId === 'string') {
      const { data: clientData } = await supabase
        .from('clients')
        .select('id, name, email, type')
        .eq('id', clientId)
        .single();

      return {
        ...entityData,
        client: clientData || null,
      } as EntityData;
    }

    return entityData as EntityData;
  } catch (err) {
    console.error('[EntityContext] Fetch error:', err);
    return null;
  }
}

// ============================================================================
// Entity Summary Formatting
// ============================================================================

/**
 * Formate le statut en français
 */
function formatStatus(status: string | undefined | null, type: ContextType): string {
  if (!status) return 'Inconnu';

  const statusMaps: Record<string, Record<string, string>> = {
    invoice: {
      draft: 'Brouillon',
      sent: 'Envoyée (en attente de paiement)',
      paid: 'Payée',
      cancelled: 'Annulée',
    },
    quote: {
      draft: 'Brouillon',
      sent: 'Envoyé',
      accepted: 'Accepté',
      rejected: 'Refusé',
      expired: 'Expiré',
    },
    deal: {
      neo: 'Nouveau',
      draft: 'Brouillon',
      qualified: 'Qualifié',
      proposal: 'Proposition envoyée',
      negotiation: 'Négociation',
      won: 'Gagné',
      lost: 'Perdu',
    },
    mission: {
      draft: 'Brouillon',
      in_progress: 'En cours',
      delivered: 'Livrée',
      ready_to_invoice: 'Prête à facturer',
      completed: 'Terminée',
      cancelled: 'Annulée',
    },
    proposal: {
      draft: 'Brouillon',
      sent: 'Envoyée',
      viewed: 'Vue',
      accepted: 'Acceptée',
      rejected: 'Refusée',
    },
    brief: {
      draft: 'Brouillon',
      sent: 'Envoyé',
      completed: 'Complété',
    },
    review: {
      pending: 'En attente',
      received: 'Reçue',
      published: 'Publiée',
    },
  };

  const map = statusMaps[type];
  if (map && map[status]) {
    return map[status];
  }

  return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
}

/**
 * Formate une date en français
 */
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Non définie';

  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Formate un montant en euros
 */
function formatAmount(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return 'Non défini';

  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

/**
 * Formate les données d'une entité en résumé lisible pour le LLM
 */
export function formatEntitySummary(type: ContextType, data: EntityData): string {
  const clientName = data.client?.name || (data as { name?: string }).name || 'Client inconnu';

  switch (type) {
    case 'invoice': {
      const invoice = data as {
        numero?: string;
        total_ttc?: number;
        status?: string;
        sent_at?: string;
        due_date?: string;
        paid_at?: string;
        client?: { name?: string };
      };
      return `CONTEXTE ACTUEL :
Tu es sur la page de la facture ${invoice.numero || 'N/A'}.
- Client : ${invoice.client?.name || clientName}
- Montant : ${formatAmount(invoice.total_ttc)}
- Statut : ${formatStatus(invoice.status, 'invoice')}
${invoice.sent_at ? `- Date d'envoi : ${formatDate(invoice.sent_at)}` : ''}
${invoice.due_date ? `- Échéance : ${formatDate(invoice.due_date)}` : ''}
${invoice.paid_at ? `- Payée le : ${formatDate(invoice.paid_at)}` : ''}`;
    }

    case 'quote': {
      const quote = data as {
        numero?: string;
        total_ttc?: number;
        status?: string;
        sent_at?: string;
        valid_until?: string;
        client?: { name?: string };
      };
      return `CONTEXTE ACTUEL :
Tu es sur la page du devis ${quote.numero || 'N/A'}.
- Client : ${quote.client?.name || clientName}
- Montant : ${formatAmount(quote.total_ttc)}
- Statut : ${formatStatus(quote.status, 'quote')}
${quote.sent_at ? `- Envoyé le : ${formatDate(quote.sent_at)}` : ''}
${quote.valid_until ? `- Valide jusqu'au : ${formatDate(quote.valid_until)}` : ''}`;
    }

    case 'deal': {
      const deal = data as {
        name?: string;
        amount?: number;
        status?: string;
        created_at?: string;
        client?: { name?: string };
      };
      return `CONTEXTE ACTUEL :
Tu es sur la page du deal "${deal.name || 'Sans nom'}".
- Client : ${deal.client?.name || clientName}
- Montant estimé : ${formatAmount(deal.amount)}
- Statut : ${formatStatus(deal.status, 'deal')}
- Créé le : ${formatDate(deal.created_at)}`;
    }

    case 'mission': {
      const mission = data as {
        name?: string;
        total?: number;
        total_invoiced?: number;
        status?: string;
        delivered_at?: string;
        client?: { name?: string };
      };
      const remaining = (mission.total || 0) - (mission.total_invoiced || 0);
      return `CONTEXTE ACTUEL :
Tu es sur la page de la mission "${mission.name || 'Sans nom'}".
- Client : ${mission.client?.name || clientName}
- Montant total : ${formatAmount(mission.total)}
- Déjà facturé : ${formatAmount(mission.total_invoiced)}
- Reste à facturer : ${formatAmount(remaining)}
- Statut : ${formatStatus(mission.status, 'mission')}
${mission.delivered_at ? `- Livrée le : ${formatDate(mission.delivered_at)}` : ''}`;
    }

    case 'client': {
      const client = data as {
        name?: string;
        type?: string;
        email?: string;
        phone?: string;
        address?: string;
      };
      return `CONTEXTE ACTUEL :
Tu es sur la fiche du client "${client.name || 'Sans nom'}".
- Type : ${client.type === 'entreprise' ? 'Entreprise' : 'Particulier'}
${client.email ? `- Email : ${client.email}` : ''}
${client.phone ? `- Téléphone : ${client.phone}` : ''}
${client.address ? `- Adresse : ${client.address}` : ''}`;
    }

    case 'contact': {
      const contact = data as {
        first_name?: string;
        last_name?: string;
        email?: string;
        phone?: string;
        role?: string;
      };
      const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || 'Sans nom';
      return `CONTEXTE ACTUEL :
Tu es sur la fiche du contact "${fullName}".
${contact.role ? `- Fonction : ${contact.role}` : ''}
${contact.email ? `- Email : ${contact.email}` : ''}
${contact.phone ? `- Téléphone : ${contact.phone}` : ''}`;
    }

    case 'proposal': {
      const proposal = data as {
        title?: string;
        status?: string;
        sent_at?: string;
        viewed_at?: string;
        client?: { name?: string };
      };
      return `CONTEXTE ACTUEL :
Tu es sur la page de la proposition "${proposal.title || 'Sans titre'}".
- Client : ${proposal.client?.name || clientName}
- Statut : ${formatStatus(proposal.status, 'proposal')}
${proposal.sent_at ? `- Envoyée le : ${formatDate(proposal.sent_at)}` : ''}
${proposal.viewed_at ? `- Vue le : ${formatDate(proposal.viewed_at)}` : ''}`;
    }

    case 'brief': {
      const brief = data as {
        title?: string;
        status?: string;
        sent_at?: string;
        completed_at?: string;
        client?: { name?: string };
      };
      return `CONTEXTE ACTUEL :
Tu es sur la page du brief "${brief.title || 'Sans titre'}".
- Client : ${brief.client?.name || clientName}
- Statut : ${formatStatus(brief.status, 'brief')}
${brief.sent_at ? `- Envoyé le : ${formatDate(brief.sent_at)}` : ''}
${brief.completed_at ? `- Complété le : ${formatDate(brief.completed_at)}` : ''}`;
    }

    case 'review': {
      const review = data as {
        rating?: number;
        status?: string;
        created_at?: string;
        is_published?: boolean;
        client?: { name?: string };
      };
      return `CONTEXTE ACTUEL :
Tu es sur la page de l'avis client.
- Client : ${review.client?.name || clientName}
${review.rating ? `- Note : ${review.rating}/5` : ''}
- Statut : ${formatStatus(review.status, 'review')}
- Publié : ${review.is_published ? 'Oui' : 'Non'}
- Reçu le : ${formatDate(review.created_at)}`;
    }

    default:
      return `CONTEXTE ACTUEL :
Tu es sur une page de type "${type}".`;
  }
}

// ============================================================================
// Main Export
// ============================================================================

/**
 * Récupère et formate le contexte complet d'une entité
 */
export async function getEntityContextSummary(
  supabase: Awaited<ReturnType<typeof createClient>>,
  contextId: string | null
): Promise<string | null> {
  const parsed = parseContextId(contextId);
  if (!parsed) return null;

  const data = await fetchEntityData(supabase, parsed.type, parsed.id);
  if (!data) return null;

  return formatEntitySummary(parsed.type, data);
}
