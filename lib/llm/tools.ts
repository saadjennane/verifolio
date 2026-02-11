// Définitions des tools pour le LLM (OpenAI function calling format)

export const toolDefinitions = [
  {
    type: 'function' as const,
    function: {
      name: 'create_client',
      description: 'Créer un nouveau client. Utiliser quand l\'utilisateur veut ajouter un client. Supporte les champs personnalisés comme ICE, SIRET, etc.',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['particulier', 'entreprise'],
            description: 'Type de client',
          },
          nom: {
            type: 'string',
            description: 'Nom du client ou de l\'entreprise',
          },
          email: {
            type: 'string',
            description: 'Email du client (optionnel)',
          },
          telephone: {
            type: 'string',
            description: 'Téléphone du client (optionnel)',
          },
          adresse: {
            type: 'string',
            description: 'Adresse du client (optionnel)',
          },
          custom_fields: {
            type: 'object',
            description: 'Champs personnalisés sous forme {label: valeur}. Ex: {"ICE": "000189568000063", "SIRET": "12345678901234"}',
            additionalProperties: { type: 'string' },
          },
        },
        required: ['type', 'nom'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_clients',
      description: 'Lister tous les clients. Utiliser pour voir les clients existants.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_client',
      description: 'Modifier un client existant. Utiliser pour mettre à jour email, téléphone, adresse ou champs personnalisés.',
      parameters: {
        type: 'object',
        properties: {
          client_id: {
            type: 'string',
            description: 'ID du client (optionnel si client_name fourni)',
          },
          client_name: {
            type: 'string',
            description: 'Nom du client pour recherche (optionnel si client_id fourni)',
          },
          email: {
            type: 'string',
            description: 'Nouvel email',
          },
          telephone: {
            type: 'string',
            description: 'Nouveau téléphone',
          },
          adresse: {
            type: 'string',
            description: 'Nouvelle adresse',
          },
          custom_fields: {
            type: 'object',
            description: 'Champs personnalisés à mettre à jour. Ex: {"ICE": "123456"}',
            additionalProperties: { type: 'string' },
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_quote',
      description: 'Créer un nouveau devis pour un client. Le client doit exister. IMPORTANT : Tout devis DOIT être lié à un deal (deal_id obligatoire).',
      parameters: {
        type: 'object',
        properties: {
          client_id: {
            type: 'string',
            description: 'ID du client (UUID)',
          },
          client_name: {
            type: 'string',
            description: 'Nom du client (pour recherche si client_id non fourni)',
          },
          deal_id: {
            type: 'string',
            description: 'ID du deal auquel rattacher ce devis (OBLIGATOIRE - demander à l\'utilisateur si non fourni)',
          },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                description: { type: 'string', description: 'Description de la ligne' },
                quantite: { type: 'number', description: 'Quantité' },
                prix_unitaire: { type: 'number', description: 'Prix unitaire HT' },
                tva_rate: { type: 'number', description: 'Taux de TVA en %' },
              },
              required: ['description', 'quantite', 'prix_unitaire'],
            },
            description: 'Lignes du devis',
          },
          notes: {
            type: 'string',
            description: 'Notes additionnelles (optionnel)',
          },
        },
        required: ['items'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_quotes',
      description: 'Lister les devis. Peut filtrer par statut.',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['brouillon', 'envoye'],
            description: 'Filtrer par statut (optionnel)',
          },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_quote_status',
      description: 'Changer le statut d\'un devis. Statuts: brouillon → envoye → accepted/refused. IMPORTANT: Demander confirmation avant de marquer comme accepté ou refusé.',
      parameters: {
        type: 'object',
        properties: {
          quote_id: {
            type: 'string',
            description: 'ID du devis (UUID)',
          },
          quote_numero: {
            type: 'string',
            description: 'Numéro du devis (pour recherche si quote_id non fourni)',
          },
          status: {
            type: 'string',
            enum: ['brouillon', 'envoye', 'accepted', 'refused'],
            description: 'Nouveau statut du devis',
          },
        },
        required: ['status'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_invoice',
      description: 'Créer une nouvelle facture pour un client. Le client doit exister. IMPORTANT : Toute facture DOIT être liée à une mission (mission_id obligatoire).',
      parameters: {
        type: 'object',
        properties: {
          client_id: {
            type: 'string',
            description: 'ID du client (UUID)',
          },
          client_name: {
            type: 'string',
            description: 'Nom du client (pour recherche si client_id non fourni)',
          },
          mission_id: {
            type: 'string',
            description: 'ID de la mission à laquelle rattacher cette facture (OBLIGATOIRE - demander à l\'utilisateur si non fourni)',
          },
          quote_id: {
            type: 'string',
            description: 'ID du devis source (optionnel, pour conversion)',
          },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                description: { type: 'string', description: 'Description de la ligne' },
                quantite: { type: 'number', description: 'Quantité' },
                prix_unitaire: { type: 'number', description: 'Prix unitaire HT' },
                tva_rate: { type: 'number', description: 'Taux de TVA en %' },
              },
              required: ['description', 'quantite', 'prix_unitaire'],
            },
            description: 'Lignes de la facture',
          },
          date_echeance: {
            type: 'string',
            description: 'Date d\'échéance (format YYYY-MM-DD)',
          },
          notes: {
            type: 'string',
            description: 'Notes additionnelles (optionnel)',
          },
        },
        required: ['items'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_invoices',
      description: 'Lister les factures. Peut filtrer par statut ou rechercher par numéro.',
      parameters: {
        type: 'object',
        properties: {
          numero: {
            type: 'string',
            description: 'Numéro de facture à rechercher (ex: FAC-0001, 001). Recherche partielle supportée.',
          },
          status: {
            type: 'string',
            enum: ['brouillon', 'envoyee', 'payee'],
            description: 'Filtrer par statut (optionnel)',
          },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_invoice',
      description: 'Modifier une facture existante (numéro, date, notes, etc.). La facture doit être en brouillon.',
      parameters: {
        type: 'object',
        properties: {
          invoice_id: {
            type: 'string',
            description: 'ID de la facture (UUID)',
          },
          invoice_numero: {
            type: 'string',
            description: 'Numéro actuel de la facture (pour recherche)',
          },
          new_numero: {
            type: 'string',
            description: 'Nouveau numéro de facture',
          },
          date_emission: {
            type: 'string',
            description: 'Nouvelle date d\'émission (format YYYY-MM-DD)',
          },
          date_echeance: {
            type: 'string',
            description: 'Nouvelle date d\'échéance (format YYYY-MM-DD)',
          },
          notes: {
            type: 'string',
            description: 'Nouvelles notes',
          },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_invoice_status',
      description: 'Changer le statut d\'une facture. Statuts: brouillon → envoyee → payee/annulee. IMPORTANT: Demander confirmation avant de marquer comme envoyée ou annulée.',
      parameters: {
        type: 'object',
        properties: {
          invoice_id: {
            type: 'string',
            description: 'ID de la facture (UUID)',
          },
          invoice_numero: {
            type: 'string',
            description: 'Numéro de la facture (pour recherche si invoice_id non fourni)',
          },
          status: {
            type: 'string',
            enum: ['brouillon', 'envoyee', 'payee', 'annulee'],
            description: 'Nouveau statut de la facture',
          },
        },
        required: ['status'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'convert_quote_to_invoice',
      description: 'Convertir un devis en facture. Crée une nouvelle facture basée sur le devis.',
      parameters: {
        type: 'object',
        properties: {
          quote_id: {
            type: 'string',
            description: 'ID du devis à convertir (UUID)',
          },
          quote_numero: {
            type: 'string',
            description: 'Numéro du devis (ex: DEV-0001)',
          },
          client_name: {
            type: 'string',
            description: 'Nom du client pour rechercher son devis le plus récent',
          },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'mark_invoice_paid',
      description: 'Marquer une facture comme payée.',
      parameters: {
        type: 'object',
        properties: {
          invoice_id: {
            type: 'string',
            description: 'ID de la facture (UUID)',
          },
          invoice_numero: {
            type: 'string',
            description: 'Numéro de la facture (pour recherche si invoice_id non fourni)',
          },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'send_email',
      description: 'Envoyer un devis ou une facture par email. IMPORTANT: Toujours demander confirmation à l\'utilisateur avant d\'appeler cette fonction.',
      parameters: {
        type: 'object',
        properties: {
          entity_type: {
            type: 'string',
            enum: ['quote', 'invoice'],
            description: 'Type de document à envoyer',
          },
          entity_id: {
            type: 'string',
            description: 'ID du document (UUID)',
          },
          to_email: {
            type: 'string',
            description: 'Adresse email du destinataire',
          },
        },
        required: ['entity_type', 'entity_id', 'to_email'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_financial_summary',
      description: 'Obtenir un résumé financier: factures impayées, montants dus, chiffre d\'affaires, statistiques. UTILISER pour toute question sur l\'argent, les montants, les impayés, le CA, combien doivent les clients.',
      parameters: {
        type: 'object',
        properties: {
          query_type: {
            type: 'string',
            enum: ['unpaid', 'revenue', 'by_client', 'all'],
            description: 'Type de requête: unpaid=factures impayées, revenue=CA total encaissé, by_client=stats par client, all=résumé complet',
          },
          client_name: {
            type: 'string',
            description: 'Filtrer par nom de client (optionnel)',
          },
        },
        required: ['query_type'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_company_settings',
      description: 'Obtenir les paramètres de l\'entreprise: nom, adresse, email, téléphone, devise, TVA, logo, champs personnalisés. UTILISER pour toute question sur "mon entreprise", "mes paramètres", "ma société", "mes coordonnées".',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_company_settings',
      description: 'Modifier les paramètres de l\'entreprise. UTILISER quand l\'utilisateur veut changer son nom d\'entreprise, adresse, email, téléphone, devise par défaut ou taux de TVA.',
      parameters: {
        type: 'object',
        properties: {
          display_name: {
            type: 'string',
            description: 'Nom de l\'entreprise',
          },
          address: {
            type: 'string',
            description: 'Adresse complète',
          },
          email: {
            type: 'string',
            description: 'Email de contact',
          },
          phone: {
            type: 'string',
            description: 'Téléphone',
          },
          default_currency: {
            type: 'string',
            enum: ['EUR', 'USD', 'GBP', 'CHF', 'MAD'],
            description: 'Devise par défaut',
          },
          default_tax_rate: {
            type: 'number',
            description: 'Taux de TVA par défaut en %',
          },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_custom_fields',
      description: 'Lister les champs personnalisés créés. UTILISER pour voir les champs comme ICE, SIRET, TVA Intracommunautaire, etc.',
      parameters: {
        type: 'object',
        properties: {
          scope: {
            type: 'string',
            enum: ['company', 'client', 'all'],
            description: 'Filtrer par type: company=champs entreprise, client=champs clients, all=tous (défaut)',
          },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_custom_field',
      description: 'Créer un nouveau champ personnalisé (ex: ICE, SIRET, TVA Intracommunautaire). Un champ peut s\'appliquer à l\'entreprise et/ou aux clients.',
      parameters: {
        type: 'object',
        properties: {
          label: {
            type: 'string',
            description: 'Libellé du champ (ex: ICE, SIRET, TVA Intra)',
          },
          applies_to_company: {
            type: 'boolean',
            description: 'Ce champ s\'applique à mon entreprise',
          },
          applies_to_client: {
            type: 'boolean',
            description: 'Ce champ s\'applique aux clients',
          },
          company_value: {
            type: 'string',
            description: 'Valeur du champ pour mon entreprise (si applies_to_company=true)',
          },
        },
        required: ['label'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_custom_field_value',
      description: 'Modifier la valeur d\'un champ personnalisé pour l\'entreprise ou un client.',
      parameters: {
        type: 'object',
        properties: {
          field_label: {
            type: 'string',
            description: 'Libellé du champ (ex: ICE)',
          },
          value: {
            type: 'string',
            description: 'Nouvelle valeur',
          },
          client_name: {
            type: 'string',
            description: 'Nom du client (si c\'est pour un client, sinon c\'est pour l\'entreprise)',
          },
        },
        required: ['field_label', 'value'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'delete_custom_field',
      description: 'Supprimer un champ personnalisé.',
      parameters: {
        type: 'object',
        properties: {
          field_label: {
            type: 'string',
            description: 'Libellé du champ à supprimer',
          },
        },
        required: ['field_label'],
      },
    },
  },
  // ============================================================================
  // TEMPLATE TOOLS
  // ============================================================================
  {
    type: 'function' as const,
    function: {
      name: 'list_templates',
      description: 'Lister les modèles de documents (devis, factures). Permet de voir les blocs configurés (header, footer, etc.).',
      parameters: {
        type: 'object',
        properties: {
          document_type: {
            type: 'string',
            enum: ['quote', 'invoice', 'all'],
            description: 'Type de document: quote=devis, invoice=facture, all=tous (défaut)',
          },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_template_blocks',
      description: 'Voir les blocs d\'un template spécifique (header, items, footer, etc.) avec leur contenu.',
      parameters: {
        type: 'object',
        properties: {
          document_type: {
            type: 'string',
            enum: ['quote', 'invoice'],
            description: 'Type de document',
          },
        },
        required: ['document_type'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'add_template_block',
      description: 'Ajouter un bloc à un template. DEMANDER CONFIRMATION avant d\'exécuter car modifie la structure des documents. Exemples: ajouter ICE dans le footer, ajouter mentions légales.',
      parameters: {
        type: 'object',
        properties: {
          document_type: {
            type: 'string',
            enum: ['quote', 'invoice'],
            description: 'Type de document cible',
          },
          block_type: {
            type: 'string',
            enum: ['header', 'company_info', 'client_info', 'items', 'totals', 'footer', 'custom'],
            description: 'Type de bloc',
          },
          content: {
            type: 'string',
            description: 'Contenu du bloc (peut inclure des variables comme {{company.ice}}, {{company.name}}, {{client.name}})',
          },
          position: {
            type: 'string',
            enum: ['start', 'end'],
            description: 'Position: start=début, end=fin (défaut)',
          },
        },
        required: ['document_type', 'block_type', 'content'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_template_block',
      description: 'Modifier le contenu d\'un bloc existant. DEMANDER CONFIRMATION avant d\'exécuter.',
      parameters: {
        type: 'object',
        properties: {
          document_type: {
            type: 'string',
            enum: ['quote', 'invoice'],
            description: 'Type de document',
          },
          block_type: {
            type: 'string',
            enum: ['header', 'company_info', 'client_info', 'items', 'totals', 'footer', 'custom'],
            description: 'Type de bloc à modifier',
          },
          content: {
            type: 'string',
            description: 'Nouveau contenu du bloc',
          },
        },
        required: ['document_type', 'block_type', 'content'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'remove_template_block',
      description: 'Supprimer un bloc d\'un template. DEMANDER CONFIRMATION avant d\'exécuter.',
      parameters: {
        type: 'object',
        properties: {
          document_type: {
            type: 'string',
            enum: ['quote', 'invoice'],
            description: 'Type de document',
          },
          block_type: {
            type: 'string',
            enum: ['header', 'company_info', 'client_info', 'items', 'totals', 'footer', 'custom'],
            description: 'Type de bloc à supprimer',
          },
        },
        required: ['document_type', 'block_type'],
      },
    },
  },
  // ============================================================================
  // CONTACT TOOLS
  // ============================================================================
  {
    type: 'function' as const,
    function: {
      name: 'create_contact',
      description: 'Créer un nouveau contact indépendant. Un contact peut ensuite être lié à un ou plusieurs clients.',
      parameters: {
        type: 'object',
        properties: {
          nom: {
            type: 'string',
            description: 'Nom complet du contact',
          },
          email: {
            type: 'string',
            description: 'Email du contact (optionnel)',
          },
          telephone: {
            type: 'string',
            description: 'Téléphone du contact (optionnel)',
          },
          notes: {
            type: 'string',
            description: 'Notes sur le contact (optionnel)',
          },
        },
        required: ['nom'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_contacts',
      description: 'Lister les contacts. Peut filtrer par client pour voir les contacts liés à un client spécifique.',
      parameters: {
        type: 'object',
        properties: {
          client_id: {
            type: 'string',
            description: 'ID du client pour filtrer (optionnel)',
          },
          client_name: {
            type: 'string',
            description: 'Nom du client pour filtrer (optionnel)',
          },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'link_contact_to_client',
      description: 'Lier un contact existant à un client avec des métadonnées de rôle.',
      parameters: {
        type: 'object',
        properties: {
          contact_id: {
            type: 'string',
            description: 'ID du contact',
          },
          contact_name: {
            type: 'string',
            description: 'Nom du contact (pour recherche si contact_id non fourni)',
          },
          client_id: {
            type: 'string',
            description: 'ID du client',
          },
          client_name: {
            type: 'string',
            description: 'Nom du client (pour recherche si client_id non fourni)',
          },
          role: {
            type: 'string',
            description: 'Rôle/fonction du contact (ex: Directeur Commercial, Comptable)',
          },
          handles_billing: {
            type: 'boolean',
            description: 'Ce contact gère les questions de facturation/paiement',
          },
          handles_ops: {
            type: 'boolean',
            description: 'Ce contact gère les questions opérationnelles',
          },
          handles_management: {
            type: 'boolean',
            description: 'Ce contact gère les validations/décisions',
          },
          is_primary: {
            type: 'boolean',
            description: 'Ce contact est le contact principal pour ce client',
          },
          preferred_channel: {
            type: 'string',
            enum: ['email', 'phone'],
            description: 'Canal de communication préféré',
          },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'unlink_contact_from_client',
      description: 'Supprimer le lien entre un contact et un client (le contact reste dans le système).',
      parameters: {
        type: 'object',
        properties: {
          contact_id: {
            type: 'string',
            description: 'ID du contact',
          },
          contact_name: {
            type: 'string',
            description: 'Nom du contact (pour recherche)',
          },
          client_id: {
            type: 'string',
            description: 'ID du client',
          },
          client_name: {
            type: 'string',
            description: 'Nom du client (pour recherche)',
          },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_contact',
      description: 'Modifier les informations d\'un contact (nom, email, téléphone).',
      parameters: {
        type: 'object',
        properties: {
          contact_id: {
            type: 'string',
            description: 'ID du contact',
          },
          contact_name: {
            type: 'string',
            description: 'Nom du contact (pour recherche si contact_id non fourni)',
          },
          nom: {
            type: 'string',
            description: 'Nouveau nom',
          },
          email: {
            type: 'string',
            description: 'Nouvel email',
          },
          telephone: {
            type: 'string',
            description: 'Nouveau téléphone',
          },
          notes: {
            type: 'string',
            description: 'Nouvelles notes',
          },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_client_contact',
      description: 'Modifier les métadonnées du lien entre un contact et un client (rôle, flags billing/ops/management).',
      parameters: {
        type: 'object',
        properties: {
          contact_id: {
            type: 'string',
            description: 'ID du contact',
          },
          contact_name: {
            type: 'string',
            description: 'Nom du contact (pour recherche)',
          },
          client_id: {
            type: 'string',
            description: 'ID du client',
          },
          client_name: {
            type: 'string',
            description: 'Nom du client (pour recherche)',
          },
          role: {
            type: 'string',
            description: 'Nouveau rôle/fonction',
          },
          handles_billing: {
            type: 'boolean',
            description: 'Gère la facturation',
          },
          handles_ops: {
            type: 'boolean',
            description: 'Gère les opérations',
          },
          handles_management: {
            type: 'boolean',
            description: 'Gère les validations',
          },
          is_primary: {
            type: 'boolean',
            description: 'Contact principal',
          },
          preferred_channel: {
            type: 'string',
            enum: ['email', 'phone'],
            description: 'Canal préféré',
          },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_contact_for_context',
      description: 'Obtenir le meilleur contact pour un contexte donné (FACTURATION, OPERATIONNEL, DIRECTION). Utilise la logique de priorité pour sélectionner le bon contact.',
      parameters: {
        type: 'object',
        properties: {
          client_id: {
            type: 'string',
            description: 'ID du client',
          },
          client_name: {
            type: 'string',
            description: 'Nom du client (pour recherche)',
          },
          context: {
            type: 'string',
            enum: ['FACTURATION', 'OPERATIONNEL', 'DIRECTION'],
            description: 'Contexte pour la sélection du contact',
          },
        },
        required: ['context'],
      },
    },
  },
  // ============================================================================
  // PROPOSAL TOOLS
  // ============================================================================
  {
    type: 'function' as const,
    function: {
      name: 'list_proposal_templates',
      description: 'Lister les templates de propositions commerciales disponibles.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_proposal_template',
      description: 'Créer un nouveau template de proposition commerciale.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Nom du template (ex: Proposition vidéo corporate, Proposition shooting photo)',
          },
          style_key: {
            type: 'string',
            enum: ['classic', 'modern', 'elegant'],
            description: 'Style visuel: classic (sobre), modern (moderne), elegant (raffiné)',
          },
          accent_color: {
            type: 'string',
            description: 'Couleur d\'accent en hex (ex: #1e40af). Défaut: #111111',
          },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'add_template_section',
      description: 'Ajouter une section à un template de proposition. Les sections peuvent contenir des variables {{variable}} qui seront remplacées lors de la création de la proposition.',
      parameters: {
        type: 'object',
        properties: {
          template_id: {
            type: 'string',
            description: 'ID du template',
          },
          template_name: {
            type: 'string',
            description: 'Nom du template (pour recherche si template_id non fourni)',
          },
          title: {
            type: 'string',
            description: 'Titre de la section (ex: Introduction, Notre approche, Tarification)',
          },
          body: {
            type: 'string',
            description: 'Contenu de la section. Peut inclure **gras** et des variables {{variable}}',
          },
          media_type: {
            type: 'string',
            enum: ['none', 'image', 'video'],
            description: 'Type de média à inclure',
          },
          media_url: {
            type: 'string',
            description: 'URL du média (image ou vidéo YouTube/Vimeo)',
          },
        },
        required: ['title', 'body'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_proposals',
      description: 'Lister les propositions commerciales. Peut filtrer par client ou statut.',
      parameters: {
        type: 'object',
        properties: {
          client_id: {
            type: 'string',
            description: 'Filtrer par ID client',
          },
          client_name: {
            type: 'string',
            description: 'Filtrer par nom de client',
          },
          status: {
            type: 'string',
            enum: ['draft', 'sent', 'commented', 'accepted', 'refused'],
            description: 'Filtrer par statut',
          },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_proposal',
      description: 'Créer une proposition commerciale pour un deal. IMPORTANT: Toute proposition DOIT être liée à un deal (deal_id obligatoire). Avant de créer, demander quel template utiliser.',
      parameters: {
        type: 'object',
        properties: {
          deal_id: {
            type: 'string',
            description: 'ID du deal auquel rattacher cette proposition (OBLIGATOIRE - demander à l\'utilisateur si non fourni)',
          },
          client_id: {
            type: 'string',
            description: 'ID du client',
          },
          client_name: {
            type: 'string',
            description: 'Nom du client (pour recherche si client_id non fourni)',
          },
          template_id: {
            type: 'string',
            description: 'ID du template à utiliser',
          },
          template_name: {
            type: 'string',
            description: 'Nom du template (pour recherche si template_id non fourni)',
          },
          variables: {
            type: 'object',
            description: 'Valeurs des variables à remplacer dans le template (ex: { "contexte": "scène de vie", "duree": "30 secondes" })',
            additionalProperties: { type: 'string' },
          },
          linked_quote_id: {
            type: 'string',
            description: 'ID d\'un devis à lier (optionnel)',
          },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_client_contacts_for_proposal',
      description: 'Obtenir la liste des contacts d\'un client pour sélectionner les destinataires d\'une proposition.',
      parameters: {
        type: 'object',
        properties: {
          client_id: {
            type: 'string',
            description: 'ID du client',
          },
          client_name: {
            type: 'string',
            description: 'Nom du client (pour recherche)',
          },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'set_proposal_recipients',
      description: 'Définir les destinataires d\'une proposition. Remplace la liste existante.',
      parameters: {
        type: 'object',
        properties: {
          proposal_id: {
            type: 'string',
            description: 'ID de la proposition',
          },
          contact_ids: {
            type: 'array',
            items: { type: 'string' },
            description: 'Liste des IDs de contacts à définir comme destinataires',
          },
        },
        required: ['proposal_id', 'contact_ids'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'set_proposal_status',
      description: 'Changer le statut d\'une proposition. IMPORTANT: Ne pas passer à "sent" sans confirmation explicite de l\'utilisateur.',
      parameters: {
        type: 'object',
        properties: {
          proposal_id: {
            type: 'string',
            description: 'ID de la proposition',
          },
          status: {
            type: 'string',
            enum: ['draft', 'sent'],
            description: 'Nouveau statut. Note: accepted/refused sont définis par le client via le lien public.',
          },
        },
        required: ['proposal_id', 'status'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_proposal_public_link',
      description: 'Obtenir le lien public d\'une proposition pour le partager avec le client.',
      parameters: {
        type: 'object',
        properties: {
          proposal_id: {
            type: 'string',
            description: 'ID de la proposition',
          },
        },
        required: ['proposal_id'],
      },
    },
  },
  // ============================================================================
  // PROPOSAL PAGE EDITING TOOLS
  // ============================================================================
  {
    type: 'function' as const,
    function: {
      name: 'proposal_create_page',
      description: 'Créer une nouvelle page dans une proposition. IMPORTANT: Toujours demander confirmation du titre et du contenu avant de créer.',
      parameters: {
        type: 'object',
        properties: {
          proposal_id: {
            type: 'string',
            description: 'ID de la proposition',
          },
          title: {
            type: 'string',
            description: 'Titre de la page',
          },
          content: {
            type: 'string',
            description: 'Contenu texte de la page (sera converti en format TipTap). Utiliser des paragraphes séparés par des lignes vides.',
          },
        },
        required: ['proposal_id', 'title'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'proposal_update_page',
      description: 'Mettre à jour le contenu d\'une page existante. IMPORTANT: Montrer un aperçu du contenu proposé avant d\'appliquer.',
      parameters: {
        type: 'object',
        properties: {
          proposal_id: {
            type: 'string',
            description: 'ID de la proposition',
          },
          page_id: {
            type: 'string',
            description: 'ID de la page à modifier',
          },
          content: {
            type: 'string',
            description: 'Nouveau contenu texte de la page',
          },
          title: {
            type: 'string',
            description: 'Nouveau titre de la page (optionnel)',
          },
        },
        required: ['proposal_id', 'page_id', 'content'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'proposal_list_pages',
      description: 'Lister les pages d\'une proposition avec leur contenu.',
      parameters: {
        type: 'object',
        properties: {
          proposal_id: {
            type: 'string',
            description: 'ID de la proposition',
          },
        },
        required: ['proposal_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'proposal_rewrite_content',
      description: 'Réécrire du contenu dans un style différent (formel, décontracté, persuasif). Retourne le texte réécrit sans l\'appliquer.',
      parameters: {
        type: 'object',
        properties: {
          original_text: {
            type: 'string',
            description: 'Texte original à réécrire',
          },
          style: {
            type: 'string',
            enum: ['formel', 'decontracte', 'persuasif', 'concis'],
            description: 'Style de réécriture souhaité',
          },
        },
        required: ['original_text', 'style'],
      },
    },
  },
  // ============================================================================
  // DEAL TOOLS
  // ============================================================================
  {
    type: 'function' as const,
    function: {
      name: 'create_deal',
      description: 'Créer un nouveau deal (opportunité commerciale) pour un client. Un deal représente une opportunité de vente qui peut aboutir à une mission.',
      parameters: {
        type: 'object',
        properties: {
          client_id: {
            type: 'string',
            description: 'ID du client (UUID)',
          },
          client_name: {
            type: 'string',
            description: 'Nom du client (pour recherche si client_id non fourni)',
          },
          title: {
            type: 'string',
            description: 'Titre du deal (ex: "Vidéo corporate 2024")',
          },
          description: {
            type: 'string',
            description: 'Description détaillée du projet/besoin',
          },
          estimated_amount: {
            type: 'number',
            description: 'Montant estimé du deal en euros',
          },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_deals',
      description: 'Lister les deals. Peut filtrer par client ou statut.',
      parameters: {
        type: 'object',
        properties: {
          client_id: {
            type: 'string',
            description: 'Filtrer par ID client',
          },
          client_name: {
            type: 'string',
            description: 'Filtrer par nom de client',
          },
          status: {
            type: 'string',
            enum: ['new', 'draft', 'sent', 'won', 'lost', 'archived'],
            description: 'Filtrer par statut',
          },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_deal',
      description: 'Obtenir les détails d\'un deal spécifique avec ses documents et contacts associés.',
      parameters: {
        type: 'object',
        properties: {
          deal_id: {
            type: 'string',
            description: 'ID du deal (UUID)',
          },
        },
        required: ['deal_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_deal_status',
      description: 'Changer le statut d\'un deal. Si le statut passe à "won", proposer ensuite de créer une mission.',
      parameters: {
        type: 'object',
        properties: {
          deal_id: {
            type: 'string',
            description: 'ID du deal (UUID)',
          },
          status: {
            type: 'string',
            enum: ['new', 'draft', 'sent', 'won', 'lost', 'archived'],
            description: 'Nouveau statut du deal',
          },
        },
        required: ['deal_id', 'status'],
      },
    },
  },
  // ============================================================================
  // MISSION TOOLS
  // ============================================================================
  {
    type: 'function' as const,
    function: {
      name: 'create_mission',
      description: 'Créer une mission pour un deal. Une mission représente un projet en cours lié à un deal gagné.',
      parameters: {
        type: 'object',
        properties: {
          deal_id: {
            type: 'string',
            description: 'ID du deal parent (UUID)',
          },
          title: {
            type: 'string',
            description: 'Titre de la mission',
          },
          description: {
            type: 'string',
            description: 'Description de la mission',
          },
          estimated_amount: {
            type: 'number',
            description: 'Montant estimé',
          },
        },
        required: ['deal_id', 'title'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_missions',
      description: 'Lister les missions. Peut filtrer par client ou statut.',
      parameters: {
        type: 'object',
        properties: {
          client_id: {
            type: 'string',
            description: 'Filtrer par ID client',
          },
          client_name: {
            type: 'string',
            description: 'Filtrer par nom de client',
          },
          status: {
            type: 'string',
            enum: ['in_progress', 'delivered', 'to_invoice', 'invoiced', 'paid', 'closed', 'cancelled'],
            description: 'Filtrer par statut',
          },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_mission',
      description: 'Obtenir les détails d\'une mission spécifique avec ses factures associées.',
      parameters: {
        type: 'object',
        properties: {
          mission_id: {
            type: 'string',
            description: 'ID de la mission (UUID)',
          },
        },
        required: ['mission_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_mission_status',
      description: 'Changer le statut d\'une mission. Statuts: in_progress → delivered → to_invoice → invoiced → paid → closed.',
      parameters: {
        type: 'object',
        properties: {
          mission_id: {
            type: 'string',
            description: 'ID de la mission (UUID)',
          },
          status: {
            type: 'string',
            enum: ['in_progress', 'delivered', 'to_invoice', 'invoiced', 'paid', 'closed', 'cancelled'],
            description: 'Nouveau statut de la mission',
          },
        },
        required: ['mission_id', 'status'],
      },
    },
  },
  // ============================================================================
  // BRIEF TOOLS
  // ============================================================================
  {
    type: 'function' as const,
    function: {
      name: 'list_brief_templates',
      description: 'Lister les templates de briefs disponibles.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_brief',
      description: 'Créer un brief pour un deal. Un brief permet de collecter des informations détaillées auprès du client.',
      parameters: {
        type: 'object',
        properties: {
          deal_id: {
            type: 'string',
            description: 'ID du deal (UUID)',
          },
          template_id: {
            type: 'string',
            description: 'ID du template de brief à utiliser',
          },
          template_name: {
            type: 'string',
            description: 'Nom du template (pour recherche si template_id non fourni)',
          },
          title: {
            type: 'string',
            description: 'Titre du brief (ex: "Brief projet vidéo")',
          },
        },
        required: ['deal_id', 'title'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_briefs',
      description: 'Lister les briefs. Peut filtrer par deal, client ou statut.',
      parameters: {
        type: 'object',
        properties: {
          deal_id: {
            type: 'string',
            description: 'Filtrer par ID du deal',
          },
          client_id: {
            type: 'string',
            description: 'Filtrer par ID client',
          },
          client_name: {
            type: 'string',
            description: 'Filtrer par nom de client',
          },
          status: {
            type: 'string',
            enum: ['DRAFT', 'SENT', 'RESPONDED'],
            description: 'Filtrer par statut',
          },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'send_brief',
      description: 'Envoyer un brief au client. Génère un lien public et peut envoyer un email.',
      parameters: {
        type: 'object',
        properties: {
          brief_id: {
            type: 'string',
            description: 'ID du brief (UUID)',
          },
          send_email: {
            type: 'boolean',
            description: 'Envoyer un email au client (défaut: true)',
          },
        },
        required: ['brief_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_brief_status',
      description: 'Changer le statut d\'un brief. Statuts: DRAFT → SENT → RESPONDED.',
      parameters: {
        type: 'object',
        properties: {
          brief_id: {
            type: 'string',
            description: 'ID du brief (UUID)',
          },
          status: {
            type: 'string',
            enum: ['DRAFT', 'SENT', 'RESPONDED'],
            description: 'Nouveau statut du brief',
          },
        },
        required: ['brief_id', 'status'],
      },
    },
  },
  // ============================================================================
  // REVIEW TOOLS
  // ============================================================================
  {
    type: 'function' as const,
    function: {
      name: 'create_review_request',
      description: 'Créer une demande d\'avis client. IMPORTANT: Toute demande d\'avis DOIT être liée à une mission (mission_id obligatoire). Envoie un formulaire au client pour collecter son témoignage.',
      parameters: {
        type: 'object',
        properties: {
          mission_id: {
            type: 'string',
            description: 'ID de la mission (OBLIGATOIRE - demander à l\'utilisateur si non fourni)',
          },
          invoice_id: {
            type: 'string',
            description: 'ID de la facture (alternative si mission_id non disponible)',
          },
          title: {
            type: 'string',
            description: 'Titre de la demande (ex: "Votre avis sur notre collaboration")',
          },
          context_text: {
            type: 'string',
            description: 'Texte de contexte pour le client',
          },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_reviews',
      description: 'Lister les avis clients reçus. Peut filtrer par statut de publication.',
      parameters: {
        type: 'object',
        properties: {
          client_id: {
            type: 'string',
            description: 'Filtrer par client',
          },
          is_published: {
            type: 'boolean',
            description: 'Filtrer par statut de publication',
          },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_review_requests',
      description: 'Lister les demandes d\'avis envoyées. Peut filtrer par statut.',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['sent', 'pending', 'responded'],
            description: 'Filtrer par statut',
          },
          client_id: {
            type: 'string',
            description: 'Filtrer par client',
          },
        },
      },
    },
  },
  // ============================================================================
  // PAYMENT TOOLS
  // ============================================================================
  {
    type: 'function' as const,
    function: {
      name: 'create_payment',
      description: 'Enregistrer un paiement. Peut être: un paiement sur facture, une avance client (sans facture), ou un remboursement. IMPORTANT: Un paiement doit être lié à un client OU à une facture.',
      parameters: {
        type: 'object',
        properties: {
          client_id: {
            type: 'string',
            description: 'ID du client (requis si pas de facture)',
          },
          client_name: {
            type: 'string',
            description: 'Nom du client (pour recherche si client_id non fourni)',
          },
          invoice_id: {
            type: 'string',
            description: 'ID de la facture (pour un paiement sur facture)',
          },
          invoice_numero: {
            type: 'string',
            description: 'Numéro de la facture (pour recherche)',
          },
          mission_id: {
            type: 'string',
            description: 'ID de la mission (optionnel, pour rattacher une avance à une mission)',
          },
          amount: {
            type: 'number',
            description: 'Montant du paiement (positif pour paiement/avance, négatif pour remboursement)',
          },
          payment_date: {
            type: 'string',
            description: 'Date du paiement (format YYYY-MM-DD, défaut: aujourd\'hui)',
          },
          payment_method: {
            type: 'string',
            enum: ['virement', 'cheque', 'especes', 'cb', 'prelevement', 'autre'],
            description: 'Mode de paiement (défaut: virement)',
          },
          payment_type: {
            type: 'string',
            enum: ['payment', 'advance', 'refund'],
            description: 'Type: payment=sur facture, advance=avance client, refund=remboursement',
          },
          reference: {
            type: 'string',
            description: 'Référence (n° chèque, ref virement, etc.)',
          },
          notes: {
            type: 'string',
            description: 'Notes additionnelles',
          },
        },
        required: ['amount'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_payments',
      description: 'Lister les paiements. Peut filtrer par client, facture ou mission.',
      parameters: {
        type: 'object',
        properties: {
          client_id: {
            type: 'string',
            description: 'Filtrer par ID client',
          },
          client_name: {
            type: 'string',
            description: 'Filtrer par nom de client',
          },
          invoice_id: {
            type: 'string',
            description: 'Filtrer par ID facture',
          },
          mission_id: {
            type: 'string',
            description: 'Filtrer par ID mission',
          },
          payment_type: {
            type: 'string',
            enum: ['payment', 'advance', 'refund'],
            description: 'Filtrer par type de paiement',
          },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_payment',
      description: 'Modifier un paiement existant.',
      parameters: {
        type: 'object',
        properties: {
          payment_id: {
            type: 'string',
            description: 'ID du paiement',
          },
          amount: {
            type: 'number',
            description: 'Nouveau montant',
          },
          payment_date: {
            type: 'string',
            description: 'Nouvelle date (format YYYY-MM-DD)',
          },
          payment_method: {
            type: 'string',
            enum: ['virement', 'cheque', 'especes', 'cb', 'prelevement', 'autre'],
            description: 'Nouveau mode de paiement',
          },
          reference: {
            type: 'string',
            description: 'Nouvelle référence',
          },
          notes: {
            type: 'string',
            description: 'Nouvelles notes',
          },
        },
        required: ['payment_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'delete_payment',
      description: 'Supprimer un paiement. IMPORTANT: Demander confirmation avant de supprimer.',
      parameters: {
        type: 'object',
        properties: {
          payment_id: {
            type: 'string',
            description: 'ID du paiement à supprimer',
          },
        },
        required: ['payment_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_client_payment_balance',
      description: 'Obtenir le solde paiements d\'un client: total facturé, total payé, avances, remboursements et solde restant.',
      parameters: {
        type: 'object',
        properties: {
          client_id: {
            type: 'string',
            description: 'ID du client',
          },
          client_name: {
            type: 'string',
            description: 'Nom du client (pour recherche)',
          },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_mission_payments',
      description: 'Obtenir le résumé des paiements d\'une mission: total facturé, total payé, avances et reste à percevoir.',
      parameters: {
        type: 'object',
        properties: {
          mission_id: {
            type: 'string',
            description: 'ID de la mission',
          },
        },
        required: ['mission_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_invoice_payments',
      description: 'Obtenir le résumé des paiements d\'une facture: total payé, reste à payer et liste des paiements.',
      parameters: {
        type: 'object',
        properties: {
          invoice_id: {
            type: 'string',
            description: 'ID de la facture',
          },
          invoice_numero: {
            type: 'string',
            description: 'Numéro de la facture (pour recherche)',
          },
        },
      },
    },
  },
  // ============================================================================
  // TASK TEMPLATE TOOLS
  // ============================================================================
  {
    type: 'function' as const,
    function: {
      name: 'create_task_template',
      description: 'Créer un template de tâches. Un template contient un ensemble de tâches prédéfinies qui peuvent être appliquées d\'un coup à une mission, un deal ou un client.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Nom du template (ex: "Workflow mission photo", "Onboarding client")',
          },
          description: {
            type: 'string',
            description: 'Description du template (optionnel)',
          },
          target_entity_type: {
            type: 'string',
            enum: ['deal', 'mission', 'client'],
            description: 'Type d\'entité cible (optionnel - si non spécifié, peut être utilisé pour tous types)',
          },
          items: {
            type: 'array',
            description: 'Liste des tâches du template',
            items: {
              type: 'object',
              properties: {
                title: {
                  type: 'string',
                  description: 'Titre de la tâche',
                },
                description: {
                  type: 'string',
                  description: 'Description de la tâche (optionnel)',
                },
                day_offset: {
                  type: 'number',
                  description: 'Délai en jours après application (0 = aujourd\'hui, 7 = dans 7 jours)',
                },
                owner_scope: {
                  type: 'string',
                  enum: ['me', 'client', 'supplier'],
                  description: 'Qui doit faire cette tâche: me (moi), client, supplier (fournisseur)',
                },
                category: {
                  type: 'string',
                  description: 'Catégorie pour regroupement visuel (ex: Administratif, Logistique, Numéros). Défaut: Général',
                },
                subgroup: {
                  type: 'string',
                  description: 'Sous-groupe optionnel au sein de la catégorie (ex: Book Test, Prédiction)',
                },
              },
              required: ['title'],
            },
          },
        },
        required: ['name', 'items'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_task_templates',
      description: 'Lister les templates de tâches disponibles.',
      parameters: {
        type: 'object',
        properties: {
          target_entity_type: {
            type: 'string',
            enum: ['deal', 'mission', 'client'],
            description: 'Filtrer par type d\'entité cible',
          },
          category: {
            type: 'string',
            description: 'Filtrer par catégorie de tâches',
          },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_task_template_categories',
      description: 'Lister les catégories distinctes de templates de tâches. Utile pour voir les groupes disponibles avant d\'ajouter des tâches.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_task_template',
      description: 'Obtenir les détails d\'un template de tâches avec ses items.',
      parameters: {
        type: 'object',
        properties: {
          template_id: {
            type: 'string',
            description: 'ID du template',
          },
          template_name: {
            type: 'string',
            description: 'Nom du template (pour recherche si template_id non fourni)',
          },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_task_template',
      description: 'Modifier un template de tâches existant.',
      parameters: {
        type: 'object',
        properties: {
          template_id: {
            type: 'string',
            description: 'ID du template',
          },
          template_name: {
            type: 'string',
            description: 'Nom du template (pour recherche)',
          },
          name: {
            type: 'string',
            description: 'Nouveau nom',
          },
          description: {
            type: 'string',
            description: 'Nouvelle description',
          },
          target_entity_type: {
            type: 'string',
            enum: ['deal', 'mission', 'client'],
            description: 'Nouveau type d\'entité cible',
          },
          is_active: {
            type: 'boolean',
            description: 'Actif ou non',
          },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'delete_task_template',
      description: 'Supprimer un template de tâches. IMPORTANT: Demander confirmation avant de supprimer.',
      parameters: {
        type: 'object',
        properties: {
          template_id: {
            type: 'string',
            description: 'ID du template',
          },
          template_name: {
            type: 'string',
            description: 'Nom du template (pour recherche)',
          },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'apply_task_template',
      description: 'Appliquer un template de tâches à une entité (mission, deal ou client). Crée toutes les tâches du template d\'un coup.',
      parameters: {
        type: 'object',
        properties: {
          template_id: {
            type: 'string',
            description: 'ID du template',
          },
          template_name: {
            type: 'string',
            description: 'Nom du template (pour recherche si template_id non fourni)',
          },
          entity_type: {
            type: 'string',
            enum: ['deal', 'mission', 'client', 'contact'],
            description: 'Type d\'entité cible',
          },
          entity_id: {
            type: 'string',
            description: 'ID de l\'entité (mission, deal ou client)',
          },
          entity_name: {
            type: 'string',
            description: 'Nom de l\'entité (pour recherche si entity_id non fourni)',
          },
          reference_date: {
            type: 'string',
            description: 'Date de référence pour calculer les échéances (format YYYY-MM-DD, défaut: aujourd\'hui)',
          },
        },
        required: ['entity_type'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_entity_tasks',
      description: 'Obtenir les tâches liées à une entité avec progression (total, terminées, en cours, pourcentage).',
      parameters: {
        type: 'object',
        properties: {
          entity_type: {
            type: 'string',
            enum: ['deal', 'mission', 'client', 'contact', 'invoice'],
            description: 'Type d\'entité',
          },
          entity_id: {
            type: 'string',
            description: 'ID de l\'entité',
          },
          entity_name: {
            type: 'string',
            description: 'Nom de l\'entité (pour recherche si entity_id non fourni)',
          },
        },
        required: ['entity_type'],
      },
    },
  },
  // UI Navigation tool
  {
    type: 'function' as const,
    function: {
      name: 'open_tab',
      description: 'Ouvre une entité dans un nouvel onglet de l\'interface. Utilise ce tool quand l\'utilisateur demande d\'ouvrir, afficher, consulter ou voir une entité spécifique.',
      parameters: {
        type: 'object',
        properties: {
          entity_type: {
            type: 'string',
            enum: ['client', 'invoice', 'quote', 'deal', 'mission', 'proposal', 'brief', 'contact', 'supplier', 'expense'],
            description: 'Type d\'entité à ouvrir',
          },
          entity_id: {
            type: 'string',
            description: 'ID de l\'entité à ouvrir',
          },
          title: {
            type: 'string',
            description: 'Titre à afficher dans l\'onglet (ex: nom du client, numéro de facture)',
          },
        },
        required: ['entity_type', 'entity_id', 'title'],
      },
    },
  },
];

export type ToolName =
  | 'create_client'
  | 'list_clients'
  | 'update_client'
  | 'create_quote'
  | 'list_quotes'
  | 'update_quote_status'
  | 'create_invoice'
  | 'list_invoices'
  | 'update_invoice'
  | 'update_invoice_status'
  | 'convert_quote_to_invoice'
  | 'mark_invoice_paid'
  | 'send_email'
  | 'get_financial_summary'
  | 'get_company_settings'
  | 'update_company_settings'
  | 'list_custom_fields'
  | 'create_custom_field'
  | 'update_custom_field_value'
  | 'delete_custom_field'
  | 'list_templates'
  | 'get_template_blocks'
  | 'add_template_block'
  | 'update_template_block'
  | 'remove_template_block'
  | 'create_contact'
  | 'list_contacts'
  | 'link_contact_to_client'
  | 'unlink_contact_from_client'
  | 'update_contact'
  | 'update_client_contact'
  | 'get_contact_for_context'
  | 'list_proposal_templates'
  | 'create_proposal_template'
  | 'add_template_section'
  | 'list_proposals'
  | 'create_proposal'
  | 'get_client_contacts_for_proposal'
  | 'set_proposal_recipients'
  | 'set_proposal_status'
  | 'get_proposal_public_link'
  | 'proposal_create_page'
  | 'proposal_update_page'
  | 'proposal_list_pages'
  | 'proposal_rewrite_content'
  // Deal tools
  | 'create_deal'
  | 'list_deals'
  | 'get_deal'
  | 'update_deal_status'
  // Mission tools
  | 'create_mission'
  | 'list_missions'
  | 'get_mission'
  | 'update_mission_status'
  // Brief tools
  | 'list_brief_templates'
  | 'create_brief'
  | 'list_briefs'
  | 'send_brief'
  | 'update_brief_status'
  // Review tools
  | 'create_review_request'
  | 'list_reviews'
  | 'list_review_requests'
  // Payment tools
  | 'create_payment'
  | 'list_payments'
  | 'update_payment'
  | 'delete_payment'
  | 'get_client_payment_balance'
  | 'get_mission_payments'
  | 'get_invoice_payments'
  // Task template tools
  | 'create_task_template'
  | 'list_task_templates'
  | 'list_task_template_categories'
  | 'get_task_template'
  | 'update_task_template'
  | 'delete_task_template'
  | 'apply_task_template'
  | 'get_entity_tasks'
  // UI Navigation
  | 'open_tab';
