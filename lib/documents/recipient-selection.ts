/**
 * Logique de pré-sélection intelligente des destinataires pour l'envoi de documents
 */

export type DocType = 'quote' | 'invoice' | 'proposal' | 'review_request';

export interface ContactWithResponsibilities {
  id: string;
  nom: string;
  prenom?: string | null;
  civilite?: string | null;
  email: string | null;
  telephone?: string | null;
  // Responsabilités (depuis client_contacts)
  handles_billing?: boolean;
  handles_ops?: boolean;
  handles_commercial?: boolean;
  handles_management?: boolean;
  is_primary?: boolean;
  role?: string | null;
  // Source du contact
  source: 'team' | 'client';
  // ID du lien (deal_contacts, mission_contacts, ou client_contacts)
  linkId?: string;
}

/**
 * Retourne les IDs des contacts à pré-cocher selon le type de document
 */
export function getDefaultSelectedRecipients(
  docType: DocType,
  contacts: ContactWithResponsibilities[]
): string[] {
  const selectedIds: string[] = [];

  // Filtrer les contacts avec email (on ne peut pas envoyer sans email)
  const contactsWithEmail = contacts.filter((c) => c.email);

  if (contactsWithEmail.length === 0) {
    return [];
  }

  switch (docType) {
    case 'invoice':
      // FACTURATION -> contacts responsables facturation
      const billingContacts = contactsWithEmail.filter((c) => c.handles_billing);
      if (billingContacts.length > 0) {
        selectedIds.push(...billingContacts.map((c) => c.id));
      }
      break;

    case 'quote':
      // DEVIS -> OPERATIONNEL (optionnel: + DIRECTION pour validation)
      const opsContacts = contactsWithEmail.filter((c) => c.handles_ops);
      const commercialContacts = contactsWithEmail.filter((c) => c.handles_commercial);

      if (opsContacts.length > 0) {
        selectedIds.push(...opsContacts.map((c) => c.id));
      }
      // Ajouter aussi les contacts commerciaux si présents
      if (commercialContacts.length > 0) {
        commercialContacts.forEach((c) => {
          if (!selectedIds.includes(c.id)) {
            selectedIds.push(c.id);
          }
        });
      }
      break;

    case 'proposal':
      // PROPOSITION -> OPERATIONNEL + DIRECTION (pour validation)
      const proposalOps = contactsWithEmail.filter((c) => c.handles_ops);
      const proposalManagement = contactsWithEmail.filter((c) => c.handles_management);

      if (proposalOps.length > 0) {
        selectedIds.push(...proposalOps.map((c) => c.id));
      }
      if (proposalManagement.length > 0) {
        proposalManagement.forEach((c) => {
          if (!selectedIds.includes(c.id)) {
            selectedIds.push(c.id);
          }
        });
      }
      break;

    case 'review_request':
      // REVIEW REQUEST -> OPERATIONNEL uniquement (jamais FACTURATION)
      const reviewOps = contactsWithEmail.filter((c) => c.handles_ops);
      if (reviewOps.length > 0) {
        selectedIds.push(...reviewOps.map((c) => c.id));
      }
      break;
  }

  // FALLBACK: Si aucun contact trouvé, sélectionner le contact principal
  if (selectedIds.length === 0) {
    const primaryContact = contactsWithEmail.find((c) => c.is_primary);
    if (primaryContact) {
      selectedIds.push(primaryContact.id);
    }
  }

  return selectedIds;
}

/**
 * Formate le nom complet d'un contact
 */
export function formatContactName(contact: ContactWithResponsibilities): string {
  const parts: string[] = [];
  if (contact.civilite) parts.push(contact.civilite);
  if (contact.prenom) parts.push(contact.prenom);
  parts.push(contact.nom);
  return parts.join(' ');
}

/**
 * Retourne les labels des responsabilités d'un contact
 */
export function getResponsibilityLabels(contact: ContactWithResponsibilities): string[] {
  const labels: string[] = [];
  if (contact.handles_billing) labels.push('Facturation');
  if (contact.handles_ops) labels.push('Opérations');
  if (contact.handles_commercial) labels.push('Commercial');
  if (contact.handles_management) labels.push('Direction');
  if (contact.is_primary) labels.push('Principal');
  return labels;
}

/**
 * Sépare les contacts en deux groupes: Team et Autres
 */
export function separateContactsBySource(
  contacts: ContactWithResponsibilities[]
): {
  teamContacts: ContactWithResponsibilities[];
  otherContacts: ContactWithResponsibilities[];
} {
  const teamContacts = contacts.filter((c) => c.source === 'team');
  const otherContacts = contacts.filter((c) => c.source === 'client');
  return { teamContacts, otherContacts };
}
