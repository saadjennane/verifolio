import type { RenderContext, RenderBlock } from '@/lib/render/buildRenderContext';
import type { TemplateConfig } from '@/lib/types/settings';
import { DEFAULT_TEMPLATE_CONFIG } from '@/lib/types/settings';
import { hexToRgba } from '@/lib/utils/color';

// ============================================================================
// Types
// ============================================================================

interface CurrencyConfig {
  code: string;
  symbol: string;
  locale: string;
  supportsLetters: boolean;
}

const CURRENCIES: Record<string, CurrencyConfig> = {
  MAD: { code: 'MAD', symbol: 'DH', locale: 'fr-MA', supportsLetters: true },
  EUR: { code: 'EUR', symbol: '€', locale: 'fr-FR', supportsLetters: true },
  USD: { code: 'USD', symbol: '$', locale: 'en-US', supportsLetters: false },
  GBP: { code: 'GBP', symbol: '£', locale: 'en-GB', supportsLetters: false },
  CHF: { code: 'CHF', symbol: 'CHF', locale: 'fr-CH', supportsLetters: false },
};

// ============================================================================
// Main Renderer
// ============================================================================

/**
 * Render a document (quote/invoice) to HTML following the canonical Verifolio template
 *
 * Structure:
 * - ZONE 1: En-tête (Logo + Nom entreprise + Coordonnées)
 * - ZONE 2: Infos document (Type + Numéro + Dates) - Bloc à droite
 * - ZONE 3: Bloc client
 * - ZONE 4: Tableau des lignes
 * - ZONE 5: Totaux
 * - ZONE 6: Montant total dû (mise en valeur)
 * - ZONE 7: Paiement / Banque
 * - ZONE 8: Cachet et signature
 * - ZONE 9: Footer (fixé en bas)
 */
export function renderDocumentHtml(
  context: RenderContext,
  config: TemplateConfig = DEFAULT_TEMPLATE_CONFIG
): string {
  const { entityType, document } = context;
  const docTitle = entityType === 'quote' ? 'DEVIS' : 'FACTURE';
  const currency = getCurrency(context);

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${docTitle} ${document?.numero || ''}</title>
  <style>
${getStyles(config)}
  </style>
</head>
<body>
  <div class="document">
    <div class="document-content">
      <!-- ZONE 1: En-tête -->
      ${renderZone1Header(context, config)}

      <!-- ZONES 2+3: Infos document + Bloc client (côte à côte) -->
      <div class="info-client-row">
        ${renderZone3Client(context, config)}
        ${renderZone2DocInfo(context, docTitle, currency, config)}
      </div>

      <!-- ZONE 4: Tableau des lignes -->
      ${renderZone4Items(context, currency, config)}

      <!-- ZONES 5+6: Totaux + Montant total dû (côte à côte) -->
      <div class="totals-due-row">
        ${renderZone6TotalDue(context, currency, config)}
        ${renderZone5Totals(context, currency, config)}
      </div>

      <!-- ZONES 7+8: Paiement + Signature (côte à côte) -->
      <div class="payment-signature-row">
        ${renderZone7Payment(context, config)}
        ${renderZone8Signature(context, config)}
      </div>

      <!-- Spacer to push footer to bottom -->
      <div class="document-spacer"></div>
    </div>

    <!-- ZONE 9: Footer (fixé en bas, hors du content) -->
    ${renderZone9Footer(context, config)}
  </div>

  <!-- Interactive zone selection script -->
  <script>
    (function() {
      const zones = document.querySelectorAll('.zone[data-zone]');
      zones.forEach(function(zone) {
        zone.addEventListener('click', function(e) {
          e.stopPropagation();
          zones.forEach(function(z) { z.classList.remove('selected'); });
          zone.classList.add('selected');
          window.parent.postMessage({
            type: 'zone-click',
            zone: zone.dataset.zone,
            x: e.clientX,
            y: e.clientY
          }, '*');
        });
      });
      document.body.addEventListener('click', function(e) {
        if (!e.target.closest('.zone[data-zone]')) {
          zones.forEach(function(z) { z.classList.remove('selected'); });
          window.parent.postMessage({ type: 'zone-deselect' }, '*');
        }
      });
    })();
  </script>
</body>
</html>
  `.trim();
}

// ============================================================================
// ZONE 1: En-tête
// ============================================================================

function renderZone1Header(context: RenderContext, config: TemplateConfig): string {
  const { company } = context;

  const hasLogo = !!company?.logo_url;

  // Header only shows: logo OR company name (as fallback)
  const headerContent = hasLogo
    ? `<div class="logo-container"><img src="${escapeHtml(company!.logo_url!)}" alt="${escapeHtml(company?.display_name || '')}" class="logo-img" /></div>`
    : `<div class="company-name company-name-large">${escapeHtml(company?.display_name || 'Mon entreprise')}</div>`;

  const logoPositionClass = `logo-position-${config.logoPosition}`;

  return `
    <div class="zone zone-header ${logoPositionClass}" data-zone="header">
      <div class="header-content">
        ${headerContent}
      </div>
    </div>
  `;
}

// ============================================================================
// ZONE 2: Infos document (Bloc à droite)
// ============================================================================

function renderZone2DocInfo(context: RenderContext, docTitle: string, currency: CurrencyConfig, config: TemplateConfig): string {
  const { document, company, entityType } = context;
  if (!document) return '';

  const infoLines: string[] = [];

  // 1. Type + Numéro (obligatoire)
  infoLines.push(`
    <div class="doc-type-number">
      <span class="doc-type">${docTitle}</span>
      <span class="doc-number">${escapeHtml(document.numero)}</span>
    </div>
  `);

  // 2. Date d'émission (conditionnel)
  if (config.showDocInfoDate ?? true) {
    const dateLabel = config.docInfoDateLabel || "Date d'émission";
    infoLines.push(`
      <div class="doc-info-row">
        <span class="doc-info-label">${escapeHtml(dateLabel)}</span>
        <span class="doc-info-value">${formatDate(document.date)}</span>
      </div>
    `);
  }

  // 3. Date d'échéance (conditionnel, facture seulement)
  if ((config.showDocInfoDueDate ?? true) && entityType === 'invoice' && document.date_echeance) {
    const dueDateLabel = config.docInfoDueDateLabel || "Date d'échéance";
    infoLines.push(`
      <div class="doc-info-row">
        <span class="doc-info-label">${escapeHtml(dueDateLabel)}</span>
        <span class="doc-info-value">${formatDate(document.date_echeance)}</span>
      </div>
    `);
  }

  // 4. Devise (optionnel, si différente de devise entreprise)
  const companyCurrency = company?.default_currency || 'EUR';
  if (currency.code !== companyCurrency) {
    infoLines.push(`
      <div class="doc-info-row">
        <span class="doc-info-label">Devise</span>
        <span class="doc-info-value">${currency.code}</span>
      </div>
    `);
  }

  // 5. Champs dynamiques scope=document (optionnel)
  const documentFields = renderDynamicFields(context, 'document');
  if (documentFields) {
    infoLines.push(documentFields);
  }

  return `
    <div class="zone zone-doc-info" data-zone="doc_info">
      ${infoLines.join('\n')}
    </div>
  `;
}

// ============================================================================
// ZONE 3: Bloc client
// ============================================================================

function renderZone3Client(context: RenderContext, config: TemplateConfig): string {
  const { client } = context;

  const styleClass = `client-style-${config.clientBlockStyle}`;
  const clientLabel = config.clientBlockLabel || 'DESTINATAIRE';

  if (!client) {
    return `
      <div class="zone zone-client" data-zone="client">
        <div class="client-box ${styleClass}">
          <div class="client-label">${escapeHtml(clientLabel)}</div>
          <div class="client-empty">Client non défini</div>
        </div>
      </div>
    `;
  }

  const lines: string[] = [];

  // 1. Nom client (toujours affiché)
  lines.push(`<div class="client-name">${escapeHtml(client.nom)}</div>`);

  // 2. Adresse (conditionnel)
  if (config.showClientAddress && client.address) {
    lines.push(`<div class="client-address">${escapeHtml(client.address).replace(/\n/g, '<br>')}</div>`);
  }

  // 3. Contact (conditionnel)
  const contactParts: string[] = [];
  if (config.showClientEmail && client.email) contactParts.push(escapeHtml(client.email));
  if (config.showClientPhone && client.phone) contactParts.push(escapeHtml(client.phone));
  if (contactParts.length > 0) {
    lines.push(`<div class="client-contact">${contactParts.join(' | ')}</div>`);
  }

  // 4. Champs dynamiques client (avec filtrage des champs masqués)
  const hiddenFields = config.hiddenClientFields ?? [];
  const clientFields = renderDynamicFields(context, 'client', hiddenFields);
  if (clientFields) {
    lines.push(`<div class="client-fields">${clientFields}</div>`);
  }

  return `
    <div class="zone zone-client" data-zone="client">
      <div class="client-box ${styleClass}">
        <div class="client-label">${escapeHtml(clientLabel)}</div>
        ${lines.join('\n')}
      </div>
    </div>
  `;
}

// ============================================================================
// ZONE 4: Tableau des lignes
// ============================================================================

function renderZone4Items(context: RenderContext, currency: CurrencyConfig, config: TemplateConfig): string {
  const { lineItems } = context;

  // Get labels from config
  const descLabel = config.itemsColDescriptionLabel || 'Désignation';
  const qtyLabel = config.itemsColQtyLabel || 'Qté';
  const priceLabel = config.itemsColPriceLabel || 'Prix unitaire';
  const tvaLabel = config.itemsColTvaLabel || 'TVA';
  const totalLabel = config.itemsColTotalLabel || 'Total';

  // Get visibility from config
  const showQty = config.showItemsColQty ?? true;
  const showPrice = config.showItemsColPrice ?? true;
  const showTva = config.showItemsColTva ?? false;
  const showTotal = config.showItemsColTotal ?? true;

  // Build header columns
  const headerCols: string[] = [];
  headerCols.push(`<th class="col-description">${escapeHtml(descLabel)}</th>`);
  if (showQty) headerCols.push(`<th class="col-qty">${escapeHtml(qtyLabel)}</th>`);
  if (showPrice) headerCols.push(`<th class="col-price">${escapeHtml(priceLabel)}</th>`);
  if (showTva) headerCols.push(`<th class="col-tva">${escapeHtml(tvaLabel)}</th>`);
  if (showTotal) headerCols.push(`<th class="col-total">${escapeHtml(totalLabel)}</th>`);

  const colCount = headerCols.length;

  if (lineItems.length === 0) {
    return `
      <div class="zone zone-items" data-zone="items">
        <table class="items-table">
          <thead>
            <tr>
              ${headerCols.join('\n              ')}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colspan="${colCount}" class="items-empty">Aucune ligne</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }

  const rows = lineItems.map(item => {
    const total = item.quantity * item.unit_price;
    const tvaRate = item.tva_rate ?? context.company?.default_tax_rate ?? 20;

    const cols: string[] = [];
    cols.push(`<td class="col-description">${escapeHtml(item.description).replace(/\n/g, '<br>')}</td>`);
    if (showQty) cols.push(`<td class="col-qty">${formatNumber(item.quantity)}</td>`);
    if (showPrice) cols.push(`<td class="col-price">${formatCurrency(item.unit_price, currency)}</td>`);
    if (showTva) cols.push(`<td class="col-tva">${tvaRate}%</td>`);
    if (showTotal) cols.push(`<td class="col-total">${formatCurrency(total, currency)}</td>`);

    return `
      <tr>
        ${cols.join('\n        ')}
      </tr>
    `;
  }).join('\n');

  return `
    <div class="zone zone-items" data-zone="items">
      <table class="items-table">
        <thead>
          <tr>
            ${headerCols.join('\n            ')}
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

// ============================================================================
// ZONE 5: Totaux
// ============================================================================

function renderZone5Totals(context: RenderContext, currency: CurrencyConfig, config: TemplateConfig): string {
  const { document } = context;
  if (!document) return '';

  // Get labels from config
  const htLabel = config.totalsHtLabel || 'Total HT';
  const discountLabel = config.totalsDiscountLabel || 'Remise';
  const tvaLabel = config.totalsTvaLabel || 'TVA';
  const ttcLabel = config.totalsTtcLabel || 'Total TTC';

  // Get visibility from config
  const showDiscount = config.showTotalsDiscount ?? true;
  const showTva = config.showTotalsTva ?? true;

  const rows: string[] = [];

  // 1. Total HT (obligatoire)
  rows.push(`
    <div class="totals-row">
      <span class="totals-label">${escapeHtml(htLabel)}</span>
      <span class="totals-value">${formatCurrency(document.total_ht, currency)}</span>
    </div>
  `);

  // 2. Remise (optionnel, si showDiscount et montant > 0)
  const discountAmount = (document as { discount?: number }).discount ?? 0;
  if (showDiscount && discountAmount > 0) {
    rows.push(`
      <div class="totals-row totals-discount">
        <span class="totals-label">${escapeHtml(discountLabel)}</span>
        <span class="totals-value">-${formatCurrency(discountAmount, currency)}</span>
      </div>
    `);
  }

  // 3. TVA (optionnel, si showTva et > 0)
  if (showTva && document.total_tva > 0) {
    rows.push(`
      <div class="totals-row">
        <span class="totals-label">${escapeHtml(tvaLabel)}</span>
        <span class="totals-value">${formatCurrency(document.total_tva, currency)}</span>
      </div>
    `);
  }

  // 4. Total TTC (obligatoire)
  rows.push(`
    <div class="totals-row totals-ttc">
      <span class="totals-label">${escapeHtml(ttcLabel)}</span>
      <span class="totals-value">${formatCurrency(document.total_ttc, currency)}</span>
    </div>
  `);

  return `
    <div class="zone zone-totals" data-zone="totals">
      <div class="totals-box">
        ${rows.join('\n')}
      </div>
    </div>
  `;
}

// ============================================================================
// ZONE 6: Montant total dû (mise en valeur)
// ============================================================================

function renderZone6TotalDue(context: RenderContext, currency: CurrencyConfig, config: TemplateConfig): string {
  const { document, entityType } = context;
  if (!document) return '';

  // Get label from config, with default adapted to document type
  const defaultLabel = entityType === 'quote' ? 'Total devis' : 'Montant total dû';
  const dueLabel = config.totalsDueLabel || defaultLabel;
  const showInWords = config.showTotalsInWords ?? true;

  const totalFormatted = formatCurrency(document.total_ttc, currency);

  // Montant en lettres (optionnel, si activé et devise supportée)
  let lettersHtml = '';
  if (showInWords && currency.supportsLetters) {
    const letters = numberToWords(document.total_ttc, currency.code);
    if (letters) {
      lettersHtml = `<div class="total-due-letters">${escapeHtml(letters)}</div>`;
    }
  }

  return `
    <div class="zone zone-total-due" data-zone="total_due">
      <div class="total-due-box">
        <div class="total-due-label">${escapeHtml(dueLabel)}</div>
        <div class="total-due-amount">${totalFormatted}</div>
        ${lettersHtml}
      </div>
    </div>
  `;
}

// ============================================================================
// ZONE 7: Paiement / Banque
// ============================================================================

function renderZone7Payment(context: RenderContext, config: TemplateConfig): string {
  const { document, fields, fieldDefinitions } = context;

  // Get labels from config
  const bankLabel = config.paymentBankLabel || 'Coordonnées bancaires';
  const conditionsLabel = config.paymentConditionsLabel || 'Conditions de paiement';
  const notesLabel = config.paymentNotesLabel || 'Notes';

  const sections: string[] = [];

  // 1. Coordonnées bancaires (si activé)
  if (config.showBankDetails) {
    // Priority: config text > dynamic fields from company
    const bankText = config.paymentBankText || '';

    if (bankText) {
      // Use manual text from config
      sections.push(`
        <div class="payment-bank">
          <div class="payment-label">${escapeHtml(bankLabel)}</div>
          <div class="payment-value">${escapeHtml(bankText).replace(/\n/g, '<br>')}</div>
        </div>
      `);
    } else {
      // Fall back to dynamic fields
      const bankFields: string[] = [];
      const bankKeywords = ['iban', 'bic', 'banque', 'bank', 'titulaire', 'rib', 'swift'];

      for (const [key, value] of Object.entries(fields.company)) {
        if (!value) continue;
        const isBank = bankKeywords.some(kw => key.toLowerCase().includes(kw));
        if (isBank) {
          const def = fieldDefinitions.company[key];
          const label = def?.label || key;
          bankFields.push(`
            <div class="bank-field">
              <span class="bank-label">${escapeHtml(label)} :</span>
              <span class="bank-value">${escapeHtml(value)}</span>
            </div>
          `);
        }
      }

      if (bankFields.length > 0) {
        sections.push(`
          <div class="payment-bank">
            <div class="payment-label">${escapeHtml(bankLabel)}</div>
            ${bankFields.join('\n')}
          </div>
        `);
      }
    }
  }

  // 2. Conditions de paiement (optionnel, si activé)
  if (config.showPaymentConditions) {
    // Use config text first, then fall back to document conditions
    const conditionsText = config.paymentConditionsText || document?.conditions || '';
    if (conditionsText) {
      sections.push(`
        <div class="payment-conditions">
          <div class="payment-label">${escapeHtml(conditionsLabel)}</div>
          <div class="payment-value">${escapeHtml(conditionsText).replace(/\n/g, '<br>')}</div>
        </div>
      `);
    }
  }

  // 3. Notes (optionnel, si activé)
  if (config.showNotes) {
    // Use config text first, then fall back to document notes
    const notesText = config.paymentNotesText || (document as { notes?: string })?.notes || '';
    if (notesText) {
      sections.push(`
        <div class="payment-notes">
          <div class="payment-label">${escapeHtml(notesLabel)}</div>
          <div class="payment-value">${escapeHtml(notesText).replace(/\n/g, '<br>')}</div>
        </div>
      `);
    }
  }

  if (sections.length === 0) return '';

  return `
    <div class="zone zone-payment" data-zone="payment">
      ${sections.join('\n')}
    </div>
  `;
}

// ============================================================================
// ZONE 8: Cachet et signature
// ============================================================================

function renderZone8Signature(context: RenderContext, config: TemplateConfig): string {
  const signatureLabel = config.signatureLabel || 'Cachet et signature';

  // If signature block is hidden, show a ghost placeholder for re-enabling
  if (!(config.showSignatureBlock ?? true)) {
    return `
      <div class="zone zone-signature zone-hidden" data-zone="signature">
        <div class="zone-hidden-placeholder">
          <span class="zone-hidden-icon">+</span>
          <span class="zone-hidden-label">Cachet et signature (masqué)</span>
        </div>
      </div>
    `;
  }

  return `
    <div class="zone zone-signature" data-zone="signature">
      <div class="signature-box">
        <div class="signature-label">${escapeHtml(signatureLabel)}</div>
      </div>
    </div>
  `;
}

// ============================================================================
// ZONE 9: Footer
// ============================================================================

function renderZone9Footer(context: RenderContext, config: TemplateConfig): string {
  const { company, fields, fieldDefinitions } = context;

  const lines: string[] = [];

  // 1. Identité entreprise (conditionnel)
  if ((config.showFooterIdentity ?? true) && company) {
    const shortAddress = company.address ? company.address.split('\n')[0] : '';
    const identity = [company.display_name, shortAddress].filter(Boolean).join(' — ');
    if (identity) {
      lines.push(`<div class="footer-identity">${escapeHtml(identity)}</div>`);
    }
  }

  // 2. Mentions légales + Contact sur la même ligne (conditionnel)
  const legalContactParts: string[] = [];

  if (config.showFooterLegal ?? true) {
    const legalKeywords = ['ice', 'rc', 'patente', 'if', 'tva', 'siret', 'siren', 'capital', 'registre', 'cnss'];
    const bankKeywords = ['iban', 'bic', 'banque', 'bank', 'titulaire', 'rib', 'swift'];

    for (const [key, value] of Object.entries(fields.company)) {
      if (!value) continue;
      const isBank = bankKeywords.some(kw => key.toLowerCase().includes(kw));
      if (isBank) continue; // Skip bank fields, they're in Zone 7

      const isLegal = legalKeywords.some(kw => key.toLowerCase().includes(kw));
      if (isLegal) {
        const def = fieldDefinitions.company[key];
        const label = def?.label || key;
        legalContactParts.push(`${label}: ${value}`);
      }
    }
  }

  // Add contact to same line
  if ((config.showFooterContact ?? true) && company) {
    if (company.email) legalContactParts.push(company.email);
    if (company.phone) legalContactParts.push(company.phone);
  }

  if (legalContactParts.length > 0) {
    lines.push(`<div class="footer-legal-contact">${escapeHtml(legalContactParts.join(' | '))}</div>`);
  }

  // 3. Texte personnalisé (optionnel)
  const customText = config.footerCustomText || '';
  if (customText) {
    lines.push(`<div class="footer-custom">${escapeHtml(customText).replace(/\n/g, '<br>')}</div>`);
  }

  if (lines.length === 0) return '';

  return `
    <div class="zone zone-footer" data-zone="footer">
      ${lines.join('\n')}
    </div>
  `;
}

// ============================================================================
// Dynamic Fields Renderer
// ============================================================================

function renderDynamicFields(
  context: RenderContext,
  scope: 'company' | 'client' | 'document',
  hiddenKeys: string[] = []
): string {
  const values = context.fields[scope];
  const definitions = context.fieldDefinitions[scope];

  const fields: string[] = [];

  for (const [key, value] of Object.entries(values)) {
    if (!value) continue;
    // Skip hidden fields
    if (hiddenKeys.includes(key)) continue;

    const def = definitions[key];
    const label = def?.label || key;

    fields.push(`
      <div class="dynamic-field">
        <span class="dynamic-field-label">${escapeHtml(label)} :</span>
        <span class="dynamic-field-value">${escapeHtml(value)}</span>
      </div>
    `);
  }

  return fields.join('\n');
}

// ============================================================================
// Utilities
// ============================================================================

function getCurrency(context: RenderContext): CurrencyConfig {
  const code = context.company?.default_currency || 'EUR';
  return CURRENCIES[code] || CURRENCIES.EUR;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, char => map[char] || char);
}

function formatCurrency(amount: number, currency: CurrencyConfig): string {
  return new Intl.NumberFormat(currency.locale, {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + ' ' + currency.symbol;
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('fr-FR').format(num);
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateStr;
  }
}

// ============================================================================
// Number to Words (French)
// ============================================================================

function numberToWords(amount: number, currencyCode: string): string {
  if (amount < 0 || amount >= 1000000000) return '';

  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const tens = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

  const currencyNames: Record<string, { singular: string; plural: string; cents: string }> = {
    MAD: { singular: 'dirham', plural: 'dirhams', cents: 'centimes' },
    EUR: { singular: 'euro', plural: 'euros', cents: 'centimes' },
  };

  const curr = currencyNames[currencyCode];
  if (!curr) return '';

  const intPart = Math.floor(amount);
  const decPart = Math.round((amount - intPart) * 100);

  function convertHundreds(n: number): string {
    if (n === 0) return '';
    if (n < 10) return units[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) {
      const t = Math.floor(n / 10);
      const u = n % 10;
      if (t === 7 || t === 9) {
        // 70s and 90s use special forms
        if (u < 10) {
          return tens[t] + (u === 1 && t === 7 ? '-et-' : '-') + teens[u];
        }
      }
      if (t === 8 && u === 0) return 'quatre-vingts';
      if (u === 1 && t < 8) return tens[t] + '-et-un';
      if (u === 0) return tens[t];
      return tens[t] + '-' + units[u];
    }
    const h = Math.floor(n / 100);
    const rest = n % 100;
    let result = h === 1 ? 'cent' : units[h] + ' cent';
    if (rest === 0 && h > 1) result += 's';
    if (rest > 0) result += ' ' + convertHundreds(rest);
    return result;
  }

  function convertThousands(n: number): string {
    if (n === 0) return 'zéro';
    if (n < 1000) return convertHundreds(n);

    const thousands = Math.floor(n / 1000);
    const rest = n % 1000;

    let result = '';
    if (thousands === 1) {
      result = 'mille';
    } else if (thousands > 1) {
      result = convertHundreds(thousands) + ' mille';
    }

    if (rest > 0) {
      result += ' ' + convertHundreds(rest);
    }

    return result.trim();
  }

  function convertMillions(n: number): string {
    if (n < 1000000) return convertThousands(n);

    const millions = Math.floor(n / 1000000);
    const rest = n % 1000000;

    let result = '';
    if (millions === 1) {
      result = 'un million';
    } else {
      result = convertThousands(millions) + ' millions';
    }

    if (rest > 0) {
      result += ' ' + convertThousands(rest);
    }

    return result.trim();
  }

  let result = convertMillions(intPart);
  result += ' ' + (intPart === 1 ? curr.singular : curr.plural);

  if (decPart > 0) {
    result += ' et ' + convertHundreds(decPart) + ' ' + curr.cents;
  }

  // Capitalize first letter
  return result.charAt(0).toUpperCase() + result.slice(1);
}

// ============================================================================
// Styles
// ============================================================================

function getFontStack(fontFamily: TemplateConfig['fontFamily']): string {
  switch (fontFamily) {
    case 'serif':
      return "'Georgia', 'Times New Roman', serif";
    case 'mono':
      return "'Courier New', 'Monaco', monospace";
    default:
      return "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
  }
}

function getStyles(config: TemplateConfig): string {
  const primary = config.primaryColor;
  const accent = config.accentColor;
  const fontStack = getFontStack(config.fontFamily);

  return `
    /* Reset */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    /* Document */
    body {
      font-family: ${fontStack};
      font-size: 10pt;
      line-height: 1.5;
      color: #1f2937;
      background: #fff;
    }

    .document {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 15mm 20mm;
      background: #fff;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
    }

    .document-content {
      flex: 1 1 auto;
    }

    /* Zones */
    .zone {
      margin-bottom: 20px;
    }

    /* Interactive zones (for template editor) */
    .zone[data-zone] {
      position: relative;
      cursor: pointer;
      transition: outline 0.15s ease;
      border-radius: 4px;
    }

    .zone[data-zone]:hover {
      outline: 1px dashed #94a3b8;
      outline-offset: 4px;
    }

    .zone[data-zone].selected {
      outline: 2px solid #3b82f6;
      outline-offset: 4px;
    }

    /* ========================================
       ZONE 1: En-tête
       ======================================== */
    .zone-header {
      display: flex;
      padding-bottom: 20px;
      border-bottom: 2px solid #e5e7eb;
      margin-bottom: 25px;
    }

    .header-content {
      flex: 0 0 auto;
    }

    /* Row containing client + doc info side by side */
    .info-client-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 30px;
      margin-bottom: 25px;
    }

    .logo-container {
      display: inline-block;
    }

    .logo-img {
      max-height: 60px;
      max-width: 180px;
    }

    .company-name {
      font-size: 14pt;
      font-weight: 700;
      color: #111827;
    }

    .company-name-large {
      font-size: 20pt;
    }

    /* Logo/Name position: LEFT */
    .zone-header.logo-position-left {
      justify-content: flex-start;
    }

    /* Logo/Name position: CENTER */
    .zone-header.logo-position-center {
      justify-content: center;
    }

    /* Logo/Name position: RIGHT */
    .zone-header.logo-position-right {
      justify-content: flex-end;
    }

    /* ========================================
       ZONE 2: Infos document (bloc à droite)
       ======================================== */
    .zone-doc-info {
      flex: 0 0 220px;
      width: 220px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 15px;
      margin-bottom: 0;
    }

    .doc-type-number {
      text-align: center;
      margin-bottom: 15px;
      padding-bottom: 12px;
      border-bottom: 1px solid #e2e8f0;
    }

    .doc-type {
      display: block;
      font-size: 18pt;
      font-weight: 700;
      color: ${primary};
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .doc-number {
      display: block;
      font-size: 12pt;
      font-weight: 600;
      color: #374151;
      margin-top: 5px;
    }

    .doc-info-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      font-size: 9pt;
    }

    .doc-info-label {
      color: #6b7280;
    }

    .doc-info-value {
      color: #1f2937;
      font-weight: 500;
    }

    /* ========================================
       ZONE 3: Bloc client
       ======================================== */
    .zone-client {
      flex: 1;
      max-width: calc(100% - 250px);
      margin-bottom: 0;
    }

    .client-box {
      border-radius: 6px;
      padding: 15px;
    }

    /* Client block style variants */
    .client-box.client-style-minimal {
      background: transparent;
      border: none;
      padding: 0;
    }

    .client-box.client-style-bordered {
      background: transparent;
      border: 1px solid #e5e7eb;
    }

    .client-box.client-style-filled {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
    }

    .client-label {
      font-size: 8pt;
      font-weight: 600;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 10px;
    }

    .client-name {
      font-size: 12pt;
      font-weight: 600;
      color: #111827;
      margin-bottom: 5px;
    }

    .client-address {
      font-size: 9pt;
      color: #4b5563;
      margin-bottom: 5px;
    }

    .client-contact {
      font-size: 9pt;
      color: #6b7280;
    }

    .client-fields {
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid #e5e7eb;
    }

    .client-empty {
      font-style: italic;
      color: #9ca3af;
    }

    /* ========================================
       ZONE 4: Tableau des lignes
       ======================================== */
    .zone-items {
      clear: both;
      margin-top: 25px;
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
    }

    .items-table th {
      background: #f3f4f6;
      border: 1px solid #d1d5db;
      padding: 10px 12px;
      text-align: left;
      font-weight: 600;
      font-size: 9pt;
      color: #374151;
      text-transform: uppercase;
    }

    .items-table td {
      border: 1px solid #e5e7eb;
      padding: 10px 12px;
      vertical-align: top;
      font-size: 10pt;
    }

    .items-table .col-description {
      width: 50%;
    }

    .items-table .col-qty {
      width: 12%;
      text-align: center;
    }

    .items-table .col-price,
    .items-table .col-total {
      width: 19%;
      text-align: right;
    }

    .items-table .col-tva {
      width: 10%;
      text-align: center;
    }

    .items-table th.col-qty,
    .items-table th.col-price,
    .items-table th.col-tva,
    .items-table th.col-total {
      text-align: center;
    }

    .items-table tbody tr:nth-child(even) {
      background: #fafafa;
    }

    .items-empty {
      text-align: center;
      font-style: italic;
      color: #9ca3af;
      padding: 30px;
    }

    /* ========================================
       ZONES 5+6: Totaux + Montant total dû (côte à côte)
       ======================================== */
    .totals-due-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 30px;
      margin-top: 20px;
      margin-bottom: 20px;
    }

    .zone-totals {
      flex: 0 0 auto;
      margin-top: 0;
      margin-bottom: 0;
    }

    .totals-box {
      width: 250px;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      overflow: hidden;
    }

    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 15px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 10pt;
    }

    .totals-row:last-child {
      border-bottom: none;
    }

    .totals-discount .totals-value {
      color: #dc2626;
    }

    .totals-label {
      color: #6b7280;
    }

    .totals-value {
      font-weight: 600;
      color: #1f2937;
    }

    .totals-ttc {
      background: ${hexToRgba(primary, 0.1)};
      border-top: 2px solid ${primary} !important;
    }

    .totals-ttc .totals-label,
    .totals-ttc .totals-value {
      color: ${primary};
      font-weight: 700;
      font-size: 11pt;
    }

    /* ========================================
       ZONE 6: Montant total dû
       ======================================== */
    .zone-total-due {
      flex: 1;
      display: flex;
      justify-content: flex-start;
      align-items: flex-start;
      margin-top: 0;
      margin-bottom: 0;
    }

    .total-due-box {
      background: ${hexToRgba(primary, 0.05)};
      border: 2px solid ${primary};
      border-radius: 8px;
      padding: 15px 25px;
      text-align: center;
      min-width: 280px;
      max-width: 320px;
    }

    .total-due-label {
      font-size: 9pt;
      font-weight: 600;
      color: ${primary};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 5px;
    }

    .total-due-amount {
      font-size: 18pt;
      font-weight: 700;
      color: ${primary};
    }

    .total-due-letters {
      font-size: 8pt;
      color: #64748b;
      margin-top: 8px;
      font-style: italic;
    }

    /* ========================================
       ZONE 7: Paiement / Banque
       ======================================== */
    /* Row containing payment + signature side by side */
    .payment-signature-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 30px;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }

    .zone-payment {
      flex: 1;
      margin-top: 0;
      padding-top: 0;
      border-top: none;
    }

    .payment-label {
      font-size: 9pt;
      font-weight: 600;
      color: #374151;
      margin-bottom: 8px;
      text-transform: uppercase;
    }

    .payment-value {
      font-size: 9pt;
      color: #4b5563;
    }

    .payment-conditions {
      margin-bottom: 15px;
    }

    .payment-bank {
      background: #f8fafc;
      border-radius: 4px;
      padding: 12px 15px;
    }

    .bank-field {
      font-size: 9pt;
      margin-bottom: 5px;
    }

    .bank-field:last-child {
      margin-bottom: 0;
    }

    .bank-label {
      color: #6b7280;
    }

    .bank-value {
      color: #1f2937;
      font-weight: 500;
      font-family: 'Courier New', monospace;
    }

    /* ========================================
       Hidden zone placeholder (for re-enabling)
       ======================================== */
    .zone-hidden {
      opacity: 0.5;
    }

    .zone-hidden-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px 16px;
      border: 1px dashed #d1d5db;
      border-radius: 4px;
      background: #f9fafb;
      cursor: pointer;
    }

    .zone-hidden-placeholder:hover {
      background: #f3f4f6;
      border-color: #9ca3af;
    }

    .zone-hidden-icon {
      font-size: 14pt;
      font-weight: 300;
      color: #9ca3af;
    }

    .zone-hidden-label {
      font-size: 9pt;
      color: #9ca3af;
      font-style: italic;
    }

    /* ========================================
       ZONE 8: Cachet et signature
       ======================================== */
    .zone-signature {
      flex: 0 0 auto;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      justify-content: flex-end;
      margin-top: 0;
      min-width: 180px;
    }

    .signature-box {
      text-align: right;
    }

    .signature-label {
      font-size: 9pt;
      font-weight: 500;
      color: #374151;
    }

    /* ========================================
       ZONE 9: Footer
       ======================================== */
    .zone-footer {
      flex-shrink: 0;
      margin-top: auto;
      padding-top: 15px;
      border-top: 1px solid #e5e7eb;
      font-size: 8pt;
      color: #6b7280;
      text-align: center;
    }

    /* Spacer not needed - using margin-top: auto on footer */
    .document-spacer {
      display: none;
    }

    .footer-identity {
      font-weight: 600;
      color: #374151;
      margin-bottom: 5px;
    }

    .footer-legal-contact {
      margin-bottom: 5px;
    }

    .footer-custom {
      margin-top: 10px;
      font-size: 8pt;
      color: #6b7280;
    }

    /* ========================================
       Dynamic Fields
       ======================================== */
    .dynamic-field {
      font-size: 9pt;
      margin-bottom: 5px;
    }

    .dynamic-field-label {
      color: #6b7280;
    }

    .dynamic-field-value {
      color: #1f2937;
      font-weight: 500;
    }

    /* ========================================
       Print styles
       ======================================== */
    @media print {
      body {
        background: none;
      }
      .document {
        padding: 10mm 15mm;
        max-width: none;
        width: 100%;
      }
    }

    @page {
      size: A4;
      margin: 0;
    }
  `;
}
