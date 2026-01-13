import type { RenderContext } from '@/lib/render/buildRenderContext';
import type { PresetColors } from './types';
import {
  getCurrency,
  escapeHtml,
  formatCurrency,
  formatNumber,
  formatDate,
  numberToWords,
  getFontStack,
  hexToRgba,
  renderDynamicFields,
  wrapDocument,
  getResetStyles,
  getZoneInteractiveStyles,
  getPrintStyles,
  type CurrencyConfig,
} from './shared';

/**
 * Modern layout - Contemporary card-based design
 * - Accent color band at top
 * - Rounded cards for info blocks
 * - Borderless table with subtle separators
 * - Card-style totals
 */
export function renderModern(context: RenderContext, colors: PresetColors): string {
  const { entityType, document } = context;
  const docTitle = entityType === 'quote' ? 'DEVIS' : 'FACTURE';
  const currency = getCurrency(context);

  const styles = getStyles(colors);
  const content = `
    <div class="document">
      <!-- Accent band at top -->
      <div class="accent-band"></div>

      <div class="document-content">
        ${renderHeader(context, colors)}

        <div class="cards-row">
          ${renderDocInfo(context, docTitle, currency, colors)}
          ${renderClient(context, colors)}
        </div>

        ${renderItems(context, currency, colors)}

        <div class="totals-section">
          ${renderTotals(context, currency, colors)}
        </div>

        ${renderPayment(context, colors)}
      </div>

      ${renderFooter(context, colors)}
    </div>
  `;

  return wrapDocument(`${docTitle} ${document?.numero || ''}`, styles, content);
}

// ============================================================================
// Header
// ============================================================================

function renderHeader(context: RenderContext, colors: PresetColors): string {
  const { company } = context;
  const hasLogo = !!company?.logo_url;

  return `
    <div class="zone zone-header" data-zone="header">
      <div class="header-left">
        ${hasLogo
          ? `<img src="${escapeHtml(company!.logo_url!)}" alt="${escapeHtml(company?.display_name || '')}" class="logo-img" />`
          : `<div class="company-name">${escapeHtml(company?.display_name || 'Mon entreprise')}</div>`
        }
      </div>
      <div class="header-right">
        ${company?.address ? `<div class="company-detail">${escapeHtml(company.address.split('\n')[0])}</div>` : ''}
        ${company?.email ? `<div class="company-detail">${escapeHtml(company.email)}</div>` : ''}
        ${company?.phone ? `<div class="company-detail">${escapeHtml(company.phone)}</div>` : ''}
      </div>
    </div>
  `;
}

// ============================================================================
// Document Info Card
// ============================================================================

function renderDocInfo(context: RenderContext, docTitle: string, currency: CurrencyConfig, colors: PresetColors): string {
  const { document, entityType } = context;
  if (!document) return '';

  return `
    <div class="zone zone-doc-info card" data-zone="doc_info">
      <div class="card-header">
        <span class="doc-type">${docTitle}</span>
        <span class="doc-number">${escapeHtml(document.numero)}</span>
      </div>
      <div class="card-body">
        <div class="info-row">
          <span class="info-label">Date</span>
          <span class="info-value">${formatDate(document.date)}</span>
        </div>
        ${entityType === 'invoice' && document.date_echeance ? `
          <div class="info-row">
            <span class="info-label">Échéance</span>
            <span class="info-value">${formatDate(document.date_echeance)}</span>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

// ============================================================================
// Client Card
// ============================================================================

function renderClient(context: RenderContext, colors: PresetColors): string {
  const { client } = context;

  if (!client) {
    return `
      <div class="zone zone-client card" data-zone="client">
        <div class="card-header">
          <span class="card-title">Client</span>
        </div>
        <div class="card-body">
          <div class="client-empty">Client non défini</div>
        </div>
      </div>
    `;
  }

  return `
    <div class="zone zone-client card" data-zone="client">
      <div class="card-header">
        <span class="card-title">Client</span>
      </div>
      <div class="card-body">
        <div class="client-name">${escapeHtml(client.nom)}</div>
        ${client.address ? `<div class="client-detail">${escapeHtml(client.address).replace(/\n/g, '<br>')}</div>` : ''}
        ${client.email ? `<div class="client-detail">${escapeHtml(client.email)}</div>` : ''}
        ${client.phone ? `<div class="client-detail">${escapeHtml(client.phone)}</div>` : ''}
      </div>
    </div>
  `;
}

// ============================================================================
// Items Table
// ============================================================================

function renderItems(context: RenderContext, currency: CurrencyConfig, colors: PresetColors): string {
  const { lineItems } = context;

  if (lineItems.length === 0) {
    return `
      <div class="zone zone-items" data-zone="items">
        <div class="items-empty">Aucune ligne</div>
      </div>
    `;
  }

  const rows = lineItems.map((item, index) => {
    const total = item.quantity * item.unit_price;
    return `
      <div class="item-row ${index % 2 === 0 ? 'even' : 'odd'}">
        <div class="item-description">${escapeHtml(item.description).replace(/\n/g, '<br>')}</div>
        <div class="item-details">
          <span class="item-qty">${formatNumber(item.quantity)} × ${formatCurrency(item.unit_price, currency)}</span>
          <span class="item-total">${formatCurrency(total, currency)}</span>
        </div>
      </div>
    `;
  }).join('\n');

  return `
    <div class="zone zone-items" data-zone="items">
      <div class="items-header">
        <span>Description</span>
        <span>Total</span>
      </div>
      <div class="items-list">
        ${rows}
      </div>
    </div>
  `;
}

// ============================================================================
// Totals
// ============================================================================

function renderTotals(context: RenderContext, currency: CurrencyConfig, colors: PresetColors): string {
  const { document, entityType } = context;
  if (!document) return '';

  const defaultLabel = entityType === 'quote' ? 'Total devis' : 'Montant à payer';

  let lettersHtml = '';
  if (currency.supportsLetters) {
    const letters = numberToWords(document.total_ttc, currency.code);
    if (letters) {
      lettersHtml = `<div class="total-letters">${escapeHtml(letters)}</div>`;
    }
  }

  return `
    <div class="zone zone-totals" data-zone="totals">
      <div class="totals-breakdown">
        <div class="totals-row">
          <span>Sous-total HT</span>
          <span>${formatCurrency(document.total_ht, currency)}</span>
        </div>
        ${document.total_tva > 0 ? `
          <div class="totals-row">
            <span>TVA</span>
            <span>${formatCurrency(document.total_tva, currency)}</span>
          </div>
        ` : ''}
      </div>
      <div class="total-main">
        <div class="total-label">${defaultLabel}</div>
        <div class="total-amount">${formatCurrency(document.total_ttc, currency)}</div>
        ${lettersHtml}
      </div>
    </div>
  `;
}

// ============================================================================
// Payment
// ============================================================================

function renderPayment(context: RenderContext, colors: PresetColors): string {
  const { fields, fieldDefinitions } = context;

  const bankFields: string[] = [];
  const bankKeywords = ['iban', 'bic', 'banque', 'bank', 'titulaire', 'rib', 'swift'];

  for (const [key, value] of Object.entries(fields.company)) {
    if (!value) continue;
    const isBank = bankKeywords.some(kw => key.toLowerCase().includes(kw));
    if (isBank) {
      const def = fieldDefinitions.company[key];
      const label = def?.label || key;
      bankFields.push(`
        <div class="bank-row">
          <span class="bank-label">${escapeHtml(label)}</span>
          <span class="bank-value">${escapeHtml(value)}</span>
        </div>
      `);
    }
  }

  if (bankFields.length === 0) return '';

  return `
    <div class="zone zone-payment" data-zone="payment">
      <div class="payment-title">Informations de paiement</div>
      <div class="payment-content">
        ${bankFields.join('\n')}
      </div>
    </div>
  `;
}

// ============================================================================
// Footer
// ============================================================================

function renderFooter(context: RenderContext, colors: PresetColors): string {
  const { company, fields, fieldDefinitions } = context;

  const parts: string[] = [];
  const legalKeywords = ['ice', 'rc', 'patente', 'if', 'tva', 'siret', 'siren', 'capital', 'registre', 'cnss'];
  const bankKeywords = ['iban', 'bic', 'banque', 'bank', 'titulaire', 'rib', 'swift'];

  for (const [key, value] of Object.entries(fields.company)) {
    if (!value) continue;
    const isBank = bankKeywords.some(kw => key.toLowerCase().includes(kw));
    if (isBank) continue;

    const isLegal = legalKeywords.some(kw => key.toLowerCase().includes(kw));
    if (isLegal) {
      const def = fieldDefinitions.company[key];
      const label = def?.label || key;
      parts.push(`${label}: ${value}`);
    }
  }

  if (parts.length === 0 && !company) return '';

  return `
    <div class="zone zone-footer" data-zone="footer">
      ${company ? `<div class="footer-company">${escapeHtml(company.display_name)}</div>` : ''}
      ${parts.length > 0 ? `<div class="footer-legal">${escapeHtml(parts.join(' • '))}</div>` : ''}
    </div>
  `;
}

// ============================================================================
// Styles
// ============================================================================

function getStyles(colors: PresetColors): string {
  const { primaryColor, accentColor, fontFamily } = colors;
  const fontStack = getFontStack(fontFamily);

  return `
    ${getResetStyles()}

    body {
      font-family: ${fontStack};
      font-size: 10pt;
      line-height: 1.6;
      color: #334155;
      background: #fff;
    }

    .document {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: #fff;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      position: relative;
    }

    .accent-band {
      height: 8px;
      background: linear-gradient(90deg, ${primaryColor}, ${accentColor});
    }

    .document-content {
      flex: 1 1 auto;
      padding: 20mm 25mm;
    }

    .zone {
      margin-bottom: 25px;
    }

    ${getZoneInteractiveStyles()}

    /* Header */
    .zone-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 30px;
    }

    .header-left {
      flex: 0 0 auto;
    }

    .header-right {
      text-align: right;
    }

    .logo-img {
      max-height: 50px;
      max-width: 160px;
    }

    .company-name {
      font-size: 22pt;
      font-weight: 700;
      color: ${primaryColor};
    }

    .company-detail {
      font-size: 9pt;
      color: #64748b;
      margin-bottom: 2px;
    }

    /* Cards */
    .cards-row {
      display: flex;
      gap: 20px;
      margin-bottom: 30px;
    }

    .card {
      flex: 1;
      background: #f8fafc;
      border-radius: 12px;
      overflow: hidden;
    }

    .card-header {
      background: ${hexToRgba(primaryColor, 0.08)};
      padding: 12px 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .card-title {
      font-size: 9pt;
      font-weight: 600;
      color: ${primaryColor};
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .doc-type {
      font-size: 11pt;
      font-weight: 700;
      color: ${primaryColor};
    }

    .doc-number {
      font-size: 11pt;
      font-weight: 600;
      color: #475569;
    }

    .card-body {
      padding: 15px 18px;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      font-size: 9pt;
    }

    .info-label {
      color: #64748b;
    }

    .info-value {
      color: #1e293b;
      font-weight: 500;
    }

    /* Client Card */
    .client-name {
      font-size: 12pt;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 8px;
    }

    .client-detail {
      font-size: 9pt;
      color: #64748b;
      margin-bottom: 3px;
    }

    .client-empty {
      font-style: italic;
      color: #94a3b8;
    }

    /* Items */
    .zone-items {
      margin-top: 10px;
    }

    .items-header {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 2px solid ${primaryColor};
      font-size: 9pt;
      font-weight: 600;
      color: ${primaryColor};
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .items-list {
      margin-top: 0;
    }

    .item-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 15px 0;
      border-bottom: 1px solid #e2e8f0;
    }

    .item-row:last-child {
      border-bottom: none;
    }

    .item-description {
      flex: 1;
      font-size: 10pt;
      color: #1e293b;
      padding-right: 20px;
    }

    .item-details {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
    }

    .item-qty {
      font-size: 9pt;
      color: #64748b;
    }

    .item-total {
      font-size: 10pt;
      font-weight: 600;
      color: #1e293b;
    }

    .items-empty {
      text-align: center;
      font-style: italic;
      color: #94a3b8;
      padding: 40px;
    }

    /* Totals */
    .totals-section {
      display: flex;
      justify-content: flex-end;
      margin-top: 20px;
    }

    .zone-totals {
      width: 320px;
      margin-bottom: 0;
    }

    .totals-breakdown {
      border-bottom: 1px solid #e2e8f0;
      margin-bottom: 15px;
      padding-bottom: 10px;
    }

    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 10pt;
      color: #64748b;
    }

    .totals-row span:last-child {
      font-weight: 500;
      color: #334155;
    }

    .total-main {
      background: ${hexToRgba(primaryColor, 0.06)};
      border-radius: 10px;
      padding: 18px 20px;
      text-align: center;
    }

    .total-label {
      font-size: 9pt;
      font-weight: 600;
      color: ${primaryColor};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }

    .total-amount {
      font-size: 22pt;
      font-weight: 700;
      color: ${primaryColor};
    }

    .total-letters {
      font-size: 8pt;
      color: #64748b;
      margin-top: 8px;
      font-style: italic;
    }

    /* Payment */
    .zone-payment {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
    }

    .payment-title {
      font-size: 9pt;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
    }

    .payment-content {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px 30px;
    }

    .bank-row {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .bank-label {
      font-size: 8pt;
      color: #94a3b8;
      text-transform: uppercase;
    }

    .bank-value {
      font-size: 9pt;
      color: #334155;
      font-family: 'Courier New', monospace;
    }

    /* Footer */
    .zone-footer {
      margin-top: auto;
      padding: 15px 25mm;
      background: #f8fafc;
      text-align: center;
      font-size: 8pt;
      color: #64748b;
    }

    .footer-company {
      font-weight: 600;
      color: #475569;
      margin-bottom: 3px;
    }

    .footer-legal {
      font-size: 7pt;
    }

    ${getPrintStyles()}
  `;
}
