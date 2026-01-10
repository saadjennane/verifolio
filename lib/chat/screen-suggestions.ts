import type { ContextType } from './context';

// ============================================================================
// Screen-Based Suggestions
// ============================================================================

export interface ScreenSuggestion {
  id: string;
  label: string;           // Formulation courte, orientée action
  prompt: string;          // Le message envoyé au chat si cliqué
  requiresData?: boolean;  // True si dépend de données (ex: "Facturer cette mission" nécessite une mission)
  condition?: string;      // Condition optionnelle pour afficher (évaluée côté API)
}

export interface ScreenSuggestionConfig {
  contextType: ContextType;
  contextId?: string;      // 'list', 'global', ou spécifique
  suggestions: ScreenSuggestion[];
}

// ============================================================================
// Suggestions par Écran
// ============================================================================
// Note: Les prompts utilisent un ton naturel et conversationnel
// pour matcher le style chaleureux de l'assistant

export const SCREEN_SUGGESTIONS: ScreenSuggestionConfig[] = [
  // -------------------------------------------------------------------------
  // Dashboard
  // -------------------------------------------------------------------------
  {
    contextType: 'dashboard',
    contextId: 'global',
    suggestions: [
      {
        id: 'dashboard-new-client',
        label: 'Ajouter un client',
        prompt: 'J\'ai un nouveau client à ajouter',
      },
      {
        id: 'dashboard-new-quote',
        label: 'Créer un devis',
        prompt: 'On crée un devis ?',
      },
      {
        id: 'dashboard-stats',
        label: 'Comment ça va ?',
        prompt: 'Comment ça va côté facturation ?',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Deals
  // -------------------------------------------------------------------------
  {
    contextType: 'deal',
    contextId: 'list',
    suggestions: [
      {
        id: 'deals-list-new',
        label: 'Une nouvelle opportunité',
        prompt: 'J\'ai une nouvelle opportunité',
      },
      {
        id: 'deals-list-active',
        label: 'Mes deals actifs',
        prompt: 'C\'est quoi mes deals actifs ?',
      },
      {
        id: 'deals-list-won',
        label: 'Ceux qu\'on a gagnés',
        prompt: 'Montre-moi les deals gagnés',
      },
    ],
  },
  {
    contextType: 'deal',
    // Page détail d'un deal (UUID)
    suggestions: [
      {
        id: 'deal-detail-proposal',
        label: 'Préparer une propale',
        prompt: 'On prépare une proposition ?',
        requiresData: true,
      },
      {
        id: 'deal-detail-quote',
        label: 'Préparer un devis',
        prompt: 'On prépare un devis ?',
        requiresData: true,
      },
      {
        id: 'deal-detail-win',
        label: 'C\'est gagné !',
        prompt: 'Ce deal est gagné !',
        requiresData: true,
        condition: 'status:new,status:draft,status:sent',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Missions
  // -------------------------------------------------------------------------
  {
    contextType: 'mission',
    contextId: 'list',
    suggestions: [
      {
        id: 'missions-list-active',
        label: 'Celles en cours',
        prompt: 'Quelles sont mes missions en cours ?',
      },
      {
        id: 'missions-list-to-invoice',
        label: 'À facturer ?',
        prompt: 'J\'ai des missions à facturer ?',
      },
    ],
  },
  {
    contextType: 'mission',
    // Page détail d'une mission (UUID)
    suggestions: [
      {
        id: 'mission-detail-deliver',
        label: 'C\'est livré !',
        prompt: 'Mission terminée, c\'est livré !',
        requiresData: true,
        condition: 'status:in_progress',
      },
      {
        id: 'mission-detail-invoice',
        label: 'On facture ?',
        prompt: 'On facture cette mission ?',
        requiresData: true,
        condition: 'status:to_invoice',
      },
      {
        id: 'mission-detail-review',
        label: 'Demander un avis',
        prompt: 'On demande un avis au client ?',
        requiresData: true,
        condition: 'status:paid,status:closed',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Factures (Invoices)
  // -------------------------------------------------------------------------
  {
    contextType: 'invoice',
    contextId: 'list',
    suggestions: [
      {
        id: 'invoices-list-new',
        label: 'Créer une facture',
        prompt: 'J\'ai une facture à créer',
      },
      {
        id: 'invoices-list-unpaid',
        label: 'Des impayées ?',
        prompt: 'J\'ai des factures impayées ?',
      },
    ],
  },
  {
    contextType: 'invoice',
    suggestions: [
      {
        id: 'invoice-detail-send',
        label: 'On l\'envoie ?',
        prompt: 'On envoie cette facture ?',
        requiresData: true,
        condition: 'status:draft',
      },
      {
        id: 'invoice-detail-remind',
        label: 'Relancer le client',
        prompt: 'On relance le client ?',
        requiresData: true,
        condition: 'status:sent',
      },
      {
        id: 'invoice-detail-paid',
        label: 'C\'est payé !',
        prompt: 'Cette facture a été payée !',
        requiresData: true,
        condition: 'status:sent',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Devis (Quotes)
  // -------------------------------------------------------------------------
  {
    contextType: 'quote',
    contextId: 'list',
    suggestions: [
      {
        id: 'quotes-list-new',
        label: 'Créer un devis',
        prompt: 'J\'ai un devis à faire',
      },
      {
        id: 'quotes-list-pending',
        label: 'En attente de réponse ?',
        prompt: 'J\'ai des devis en attente de réponse ?',
      },
    ],
  },
  {
    contextType: 'quote',
    suggestions: [
      {
        id: 'quote-detail-send',
        label: 'On l\'envoie ?',
        prompt: 'On envoie ce devis ?',
        requiresData: true,
        condition: 'status:draft',
      },
      {
        id: 'quote-detail-convert',
        label: 'Convertir en facture',
        prompt: 'On transforme ce devis en facture ?',
        requiresData: true,
        condition: 'status:accepted',
      },
      {
        id: 'quote-detail-remind',
        label: 'Relancer le client',
        prompt: 'On relance pour ce devis ?',
        requiresData: true,
        condition: 'status:sent',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Clients
  // -------------------------------------------------------------------------
  {
    contextType: 'client',
    contextId: 'list',
    suggestions: [
      {
        id: 'clients-list-new',
        label: 'Ajouter un client',
        prompt: 'J\'ai un client à ajouter',
      },
      {
        id: 'clients-list-search',
        label: 'Je cherche...',
        prompt: 'Je cherche un client',
      },
    ],
  },
  {
    contextType: 'client',
    suggestions: [
      {
        id: 'client-detail-deal',
        label: 'Créer un deal',
        prompt: 'On crée un deal pour ce client ?',
        requiresData: true,
      },
      {
        id: 'client-detail-invoice',
        label: 'On facture ?',
        prompt: 'On facture ce client ?',
        requiresData: true,
      },
      {
        id: 'client-detail-history',
        label: 'Son historique',
        prompt: 'C\'est quoi l\'historique avec ce client ?',
        requiresData: true,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Propositions
  // -------------------------------------------------------------------------
  {
    contextType: 'proposal',
    contextId: 'list',
    suggestions: [
      {
        id: 'proposals-list-new',
        label: 'Créer une propale',
        prompt: 'J\'ai une proposition à créer',
      },
      {
        id: 'proposals-list-pending',
        label: 'Celles en attente ?',
        prompt: 'J\'ai des propositions en attente ?',
      },
    ],
  },
  {
    contextType: 'proposal',
    suggestions: [
      {
        id: 'proposal-detail-send',
        label: 'On l\'envoie ?',
        prompt: 'On envoie cette proposition ?',
        requiresData: true,
        condition: 'status:draft',
      },
      {
        id: 'proposal-detail-quote',
        label: 'Créer un devis',
        prompt: 'On crée un devis depuis cette propale ?',
        requiresData: true,
        condition: 'status:accepted',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Briefs
  // -------------------------------------------------------------------------
  {
    contextType: 'brief',
    contextId: 'list',
    suggestions: [
      {
        id: 'briefs-list-templates',
        label: 'Voir mes templates',
        prompt: 'Montre-moi mes templates de briefs',
      },
      {
        id: 'briefs-list-pending',
        label: 'En attente de réponse ?',
        prompt: 'J\'ai des briefs en attente de réponse ?',
      },
    ],
  },
  {
    contextType: 'brief',
    // Page détail d'un brief (UUID)
    suggestions: [
      {
        id: 'brief-detail-send',
        label: 'On l\'envoie ?',
        prompt: 'On envoie ce brief ?',
        requiresData: true,
        condition: 'status:DRAFT',
      },
      {
        id: 'brief-detail-remind',
        label: 'Relancer le client',
        prompt: 'On relance le client pour ce brief ?',
        requiresData: true,
        condition: 'status:SENT',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Avis (Reviews)
  // -------------------------------------------------------------------------
  {
    contextType: 'review',
    contextId: 'list',
    suggestions: [
      {
        id: 'reviews-list-request',
        label: 'Demander un avis',
        prompt: 'Je veux demander un avis client',
      },
      {
        id: 'reviews-list-pending',
        label: 'En attente de réponse ?',
        prompt: 'J\'ai des demandes d\'avis en attente ?',
      },
      {
        id: 'reviews-list-published',
        label: 'Ceux publiés',
        prompt: 'Montre-moi mes avis publiés',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Settings
  // -------------------------------------------------------------------------
  {
    contextType: 'settings',
    contextId: 'global',
    suggestions: [
      {
        id: 'settings-company',
        label: 'Mes infos',
        prompt: 'Je veux modifier mes informations',
      },
      {
        id: 'settings-templates',
        label: 'Mes modèles',
        prompt: 'Montre-moi mes modèles de documents',
      },
    ],
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Récupère les suggestions pour un écran donné
 */
export function getSuggestionsForScreen(
  contextType: ContextType,
  contextId: string
): ScreenSuggestion[] {
  // D'abord chercher une config exacte (type + id)
  const exactMatch = SCREEN_SUGGESTIONS.find(
    config => config.contextType === contextType && config.contextId === contextId
  );

  if (exactMatch) {
    return exactMatch.suggestions;
  }

  // Sinon chercher une config générique pour le type (sans contextId spécifié)
  // Uniquement si ce n'est pas 'list' ou 'global' (qui devraient avoir leur propre config)
  if (contextId !== 'list' && contextId !== 'global') {
    const genericMatch = SCREEN_SUGGESTIONS.find(
      config => config.contextType === contextType && !config.contextId
    );

    if (genericMatch) {
      return genericMatch.suggestions;
    }
  }

  return [];
}

/**
 * Évalue une condition (format: "field:value1,field:value2" = OR sur le même champ)
 *
 * Exemples:
 * - "status:draft" → vrai si status === 'draft'
 * - "status:sent,status:paid" → vrai si status === 'sent' OU status === 'paid'
 * - "status:draft,client_id:null" → vrai si (status === 'draft') ET (client_id est null)
 */
export function evaluateCondition(
  condition: string | undefined,
  entityData: Record<string, unknown> | null
): boolean {
  if (!condition) return true;
  if (!entityData) return false;

  const parts = condition.split(',');

  // Grouper les conditions par champ pour appliquer un OR entre valeurs du même champ
  const conditionsByField = new Map<string, string[]>();

  for (const part of parts) {
    const [field, expectedValue] = part.split(':');
    if (!conditionsByField.has(field)) {
      conditionsByField.set(field, []);
    }
    conditionsByField.get(field)!.push(expectedValue);
  }

  // Pour chaque champ, vérifier si AU MOINS une valeur correspond (OR)
  // Entre les champs différents, c'est un AND
  for (const [field, expectedValues] of conditionsByField) {
    const actualValue = entityData[field];

    // Vérifier si une des valeurs attendues correspond
    const matches = expectedValues.some(expectedValue => {
      if (expectedValue === 'null') {
        return actualValue === null || actualValue === undefined;
      }
      return String(actualValue) === expectedValue;
    });

    if (!matches) {
      return false;
    }
  }

  return true;
}

/**
 * Filtre les suggestions en fonction des données de l'entité
 */
export function filterSuggestionsByConditions(
  suggestions: ScreenSuggestion[],
  entityData: Record<string, unknown> | null
): ScreenSuggestion[] {
  return suggestions.filter(suggestion => {
    // Si requiresData et pas de données, ne pas afficher
    if (suggestion.requiresData && !entityData) {
      return false;
    }

    // Évaluer la condition
    return evaluateCondition(suggestion.condition, entityData);
  });
}
