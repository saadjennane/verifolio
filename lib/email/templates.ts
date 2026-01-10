/**
 * Templates email pour le module Send
 * 5 templates pour: Brief, Proposal, Quote, Invoice, Review Request
 */

import type { ResourceType, EmailTemplateVariables } from '@/lib/send/types';

// ============================================================================
// SUJETS PAR DEFAUT
// ============================================================================

export function getDefaultSubject(
  type: ResourceType,
  vars: EmailTemplateVariables
): string {
  switch (type) {
    case 'brief':
      return `Brief a remplir — ${vars.client_name || 'Votre projet'}`;
    case 'proposal':
      return `Proposition — ${vars.deal_title || 'Votre projet'}`;
    case 'quote':
      return `Devis — ${vars.quote_number || 'Nouveau devis'}`;
    case 'invoice':
      return `Facture — ${vars.invoice_number || 'Nouvelle facture'}`;
    case 'review_request':
      return `Votre avis — ${vars.mission_title || 'Notre collaboration'}`;
    default:
      return 'Document de ' + vars.company_name;
  }
}

// ============================================================================
// LABELS CTA PAR TYPE
// ============================================================================

function getCTALabel(type: ResourceType): string {
  switch (type) {
    case 'brief':
      return 'Remplir le brief';
    case 'proposal':
      return 'Voir la proposition';
    case 'quote':
      return 'Voir le devis';
    case 'invoice':
      return 'Voir la facture';
    case 'review_request':
      return 'Donner mon avis';
    default:
      return 'Voir le document';
  }
}

// ============================================================================
// MESSAGES CONTEXTUELS PAR TYPE
// ============================================================================

function getContextMessage(type: ResourceType, vars: EmailTemplateVariables): string {
  switch (type) {
    case 'brief':
      return `Nous avons besoin de quelques informations pour avancer sur votre projet. Merci de prendre quelques minutes pour remplir ce brief.`;

    case 'proposal':
      return `Vous trouverez ci-dessous notre proposition pour ${vars.deal_title || 'votre projet'}. N'hesitez pas a nous contacter pour toute question.`;

    case 'quote':
      return `Veuillez trouver notre devis <strong>${vars.quote_number}</strong>. Ce devis reste valable pendant 30 jours.`;

    case 'invoice':
      return `Veuillez trouver votre facture <strong>${vars.invoice_number}</strong>. Merci de proceder au reglement dans les delais indiques.`;

    case 'review_request':
      return `Nous esperons que notre collaboration sur ${vars.mission_title || 'votre projet'} vous a satisfait. Votre avis nous est precieux et nous aide a nous ameliorer.`;

    default:
      return `Veuillez trouver ci-dessous votre document.`;
  }
}

// ============================================================================
// GENERATION HTML COMPLETE
// ============================================================================

export function generateSendEmailHTML(
  type: ResourceType,
  vars: EmailTemplateVariables
): string {
  const ctaLabel = getCTALabel(type);
  const contextMessage = getContextMessage(type, vars);

  // Couleur du bouton CTA
  const ctaColor = '#2563eb'; // blue-600

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${getDefaultSubject(type, vars)}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1f2937; background-color: #f3f4f6; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

      <!-- Greeting -->
      <p style="margin: 0 0 20px 0; font-size: 16px;">
        Bonjour,
      </p>

      <!-- Custom message if provided -->
      ${vars.custom_message ? `
      <div style="background: #f9fafb; border-left: 4px solid ${ctaColor}; padding: 16px; margin: 0 0 24px 0; border-radius: 0 8px 8px 0;">
        <p style="margin: 0; font-size: 15px; color: #374151;">
          ${escapeHtml(vars.custom_message)}
        </p>
      </div>
      ` : ''}

      <!-- Context message -->
      <p style="margin: 0 0 28px 0; font-size: 15px; color: #4b5563;">
        ${contextMessage}
      </p>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${vars.public_link_url}"
           style="display: inline-block; background: ${ctaColor}; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">
          ${ctaLabel}
        </a>
      </div>

      <!-- Link fallback -->
      <p style="margin: 24px 0 0 0; font-size: 12px; color: #9ca3af; text-align: center;">
        Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
        <a href="${vars.public_link_url}" style="color: ${ctaColor}; word-break: break-all;">
          ${vars.public_link_url}
        </a>
      </p>

      <!-- Signature -->
      <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0; font-size: 15px; color: #374151;">
          Cordialement,<br>
          <strong>${escapeHtml(vars.user_display_name)}</strong>
        </p>
        ${vars.company_name && vars.company_name !== vars.user_display_name ? `
        <p style="margin: 4px 0 0 0; font-size: 14px; color: #6b7280;">
          ${escapeHtml(vars.company_name)}
        </p>
        ` : ''}
      </div>
    </div>

    <!-- Footer -->
    <p style="margin: 24px 0 0 0; text-align: center; font-size: 12px; color: #9ca3af;">
      Envoye via <a href="https://verifolio.app" style="color: #6b7280; text-decoration: none;">Verifolio</a>
    </p>
  </div>
</body>
</html>
  `.trim();
}

// ============================================================================
// TEMPLATES SPECIFIQUES (pour usage direct si besoin)
// ============================================================================

export function generateBriefEmail(vars: EmailTemplateVariables): string {
  return generateSendEmailHTML('brief', vars);
}

export function generateProposalEmail(vars: EmailTemplateVariables): string {
  return generateSendEmailHTML('proposal', vars);
}

export function generateQuoteEmail(vars: EmailTemplateVariables): string {
  return generateSendEmailHTML('quote', vars);
}

export function generateInvoiceEmail(vars: EmailTemplateVariables): string {
  return generateSendEmailHTML('invoice', vars);
}

export function generateReviewRequestEmail(vars: EmailTemplateVariables): string {
  return generateSendEmailHTML('review_request', vars);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br>');
}
