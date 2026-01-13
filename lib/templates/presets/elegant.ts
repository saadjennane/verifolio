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
 * Elegant layout - Sophisticated design
 * - Logo on the right
 * - Decorative separators
 * - Client block with colored background
 * - Styled table headers
 */
export function renderElegant(context: RenderContext, colors: PresetColors): string {
  const { entityType, document } = context;
  const docTitle = entityType === 'quote' ? 'DEVIS' : 'FACTURE';
  const currency = getCurrency(context);

  const styles = getStyles(colors);
  const content = `
    <div class="document">
      <div class="document-content">
        ${renderHeader(context, colors)}

        <div class="decorative-line"></div>

        <div class="info-section">
          ${renderDocInfo(context, docTitle, currency, colors)}
          ${renderClient(context, colors)}
        </div>

        ${renderItems(context, currency, colors)}

        <div class="totals-section">
          ${renderTotals(context, currency, colors)}
        </div>

        ${renderPaymentSignature(context, colors)}
      </div>

      ${renderFooter(context, colors)}
    </div>
  `;

  return wrapDocument(`${docTitle} ${document?.numero || ''}`, styles, content);
}

// ============================================================================
// Header (Logo Right)
// ============================================================================

function renderHeader(context: RenderContext, colors: PresetColors): string {
  const { company } = context;
  const hasLogo = !!company?.logo_url;

  return `
    <div class="zone zone-header" data-zone="header">
      <div class="header-left">
        <div class="company-name">${escapeHtml(company?.display_name || 'Mon entreprise')}</div>
        ${company?.address ? `<div class="company-address">${escapeHtml(company.address).replace(/\n/g, '<br>')}</div>` : ''}
        <div class="company-contact">
          ${company?.email ? `<span>${escapeHtml(company.email)}</span>` : ''}
          ${company?.phone ? `<span>${escapeHtml(company.phone)}</span>` : ''}
        </div>
      </div>
      <div class="header-right">
        ${hasLogo
          ? `<img src="${escapeHtml(company!.logo_url!)}" alt="${escapeHtml(company?.display_name || '')}" class="logo-img" />`
          : ''
        }
      </div>
    </div>
  `;
}

// ============================================================================
// Document Info
// ============================================================================

function renderDocInfo(context: RenderContext, docTitle: string, currency: CurrencyConfig, colors: PresetColors): string {
  const { document, entityType } = context;
  if (!document) return '';

  return `
    <div class="zone zone-doc-info" data-zone="doc_info">
      <div class="doc-badge">
        <div class="doc-type">${docTitle}</div>
        <div class="doc-number">N° ${escapeHtml(document.numero)}</div>
      </div>
      <div class="doc-dates">
        <div class="date-row">
          <span class="date-label">Date d'émission</span>
          <span class="date-value">${formatDate(document.date)}</span>
        </div>
        ${entityType === 'invoice' && document.date_echeance ? `
          <div class="date-row">
            <span class="date-label">Échéance</span>
            <span class="date-value">${formatDate(document.date_echeance)}</span>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

// ============================================================================
// Client Block (Colored Background)
// ============================================================================

function renderClient(context: RenderContext, colors: PresetColors): string {
  const { client } = context;

  if (!client) {
    return `
      <div class="zone zone-client" data-zone="client">
        <div class="client-box">
          <div class="client-title">Facturé à</div>
          <div class="client-empty">Client non défini</div>
        </div>
      </div>
    `;
  }

  return `
    <div class="zone zone-client" data-zone="client">
      <div class="client-box">
        <div class="client-title">Facturé à</div>
        <div class="client-name">${escapeHtml(client.nom)}</div>
        ${client.address ? `<div class="client-address">${escapeHtml(client.address).replace(/\n/g, '<br>')}</div>` : ''}
        ${client.email ? `<div class="client-contact">${escapeHtml(client.email)}</div>` : ''}
        ${client.phone ? `<div class="client-contact">${escapeHtml(client.phone)}</div>` : ''}
      </div>
    </div>
  `;
}

// ============================================================================
// Items Table (Styled Headers)
// ============================================================================

function renderItems(context: RenderContext, currency: CurrencyConfig, colors: PresetColors): string {
  const { lineItems } = context;

  const headerCols = `
    <th class="col-desc">Désignation</th>
    <th class="col-qty">Quantité</th>
    <th class="col-price">Prix unitaire</th>
    <th class="col-total">Montant</th>
  `;

  if (lineItems.length === 0) {
    return `
      <div class="zone zone-items" data-zone="items">
        <table class="items-table">
          <thead><tr>${headerCols}</tr></thead>
          <tbody>
            <tr><td colspan="4" class="items-empty">Aucune ligne</td></tr>
          </tbody>
        </table>
      </div>
    `;
  }

  const rows = lineItems.map(item => {
    const total = item.quantity * item.unit_price;
    return `
      <tr>
        <td class="col-desc">${escapeHtml(item.description).replace(/\n/g, '<br>')}</td>
        <td class="col-qty">${formatNumber(item.quantity)}</td>
        <td class="col-price">${formatCurrency(item.unit_price, currency)}</td>
        <td class="col-total">${formatCurrency(total, currency)}</td>
      </tr>
    `;
  }).join('\n');

  return `
    <div class="zone zone-items" data-zone="items">
      <table class="items-table">
        <thead><tr>${headerCols}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

// ============================================================================
// Totals
// ============================================================================

function renderTotals(context: RenderContext, currency: CurrencyConfig, colors: PresetColors): string {
  const { document, entityType } = context;
  if (!document) return '';

  const label = entityType === 'quote' ? 'Total du devis' : 'Total à régler';

  let lettersHtml = '';
  if (currency.supportsLetters) {
    const letters = numberToWords(document.total_ttc, currency.code);
    if (letters) {
      lettersHtml = `<div class="total-letters">Arrêté à la somme de : ${escapeHtml(letters)}</div>`;
    }
  }

  return `
    <div class="zone zone-totals" data-zone="totals">
      <div class="totals-box">
        <div class="totals-row">
          <span>Total HT</span>
          <span>${formatCurrency(document.total_ht, currency)}</span>
        </div>
        ${document.total_tva > 0 ? `
          <div class="totals-row">
            <span>TVA</span>
            <span>${formatCurrency(document.total_tva, currency)}</span>
          </div>
        ` : ''}
        <div class="totals-row total-main">
          <span>${label}</span>
          <span>${formatCurrency(document.total_ttc, currency)}</span>
        </div>
      </div>
      ${lettersHtml}
    </div>
  `;
}

// ============================================================================
// Payment & Signature
// ============================================================================

function renderPaymentSignature(context: RenderContext, colors: PresetColors): string {
  const { fields, fieldDefinitions } = context;

  const bankFields: string[] = [];
  const bankKeywords = ['iban', 'bic', 'banque', 'bank', 'titulaire', 'rib', 'swift'];

  for (const [key, value] of Object.entries(fields.company)) {
    if (!value) continue;
    const isBank = bankKeywords.some(kw => key.toLowerCase().includes(kw));
    if (isBank) {
      const def = fieldDefinitions.company[key];
      const label = def?.label || key;
      bankFields.push(`<div class="bank-field"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</div>`);
    }
  }

  return `
    <div class="payment-signature-section">
      ${bankFields.length > 0 ? `
        <div class="zone zone-payment" data-zone="payment">
          <div class="section-title">Coordonnées bancaires</div>
          ${bankFields.join('\n')}
        </div>
      ` : ''}
      <div class="zone zone-signature" data-zone="signature">
        <div class="section-title">Signature</div>
        <div class="signature-box">
          <div class="signature-line"></div>
          <div class="signature-hint">Bon pour accord</div>
        </div>
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

  return `
    <div class="zone zone-footer" data-zone="footer">
      <div class="decorative-line footer-line"></div>
      ${company ? `<div class="footer-company">${escapeHtml(company.display_name)}</div>` : ''}
      ${parts.length > 0 ? `<div class="footer-legal">${escapeHtml(parts.join(' — '))}</div>` : ''}
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
      color: #1f2937;
      background: #fff;
    }

    .document {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 20mm 25mm;
      background: #fff;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
    }

    .document-content {
      flex: 1 1 auto;
    }

    .zone {
      margin-bottom: 20px;
    }

    ${getZoneInteractiveStyles()}

    /* Decorative Elements */
    .decorative-line {
      height: 3px;
      background: linear-gradient(90deg, ${primaryColor} 0%, ${accentColor} 50%, transparent 100%);
      margin: 25px 0;
    }

    .footer-line {
      background: linear-gradient(90deg, transparent 0%, ${primaryColor} 50%, transparent 100%);
      height: 1px;
      margin-bottom: 15px;
    }

    /* Header */
    .zone-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0;
    }

    .header-left {
      flex: 1;
    }

    .header-right {
      flex: 0 0 auto;
    }

    .company-name {
      font-size: 16pt;
      font-weight: 600;
      color: ${primaryColor};
      margin-bottom: 8px;
    }

    .company-address {
      font-size: 9pt;
      color: #6b7280;
      margin-bottom: 5px;
    }

    .company-contact {
      display: flex;
      gap: 15px;
      font-size: 9pt;
      color: #6b7280;
    }

    .logo-img {
      max-height: 70px;
      max-width: 180px;
    }

    /* Info Section */
    .info-section {
      display: flex;
      justify-content: space-between;
      gap: 40px;
      margin-bottom: 30px;
    }

    /* Document Info */
    .zone-doc-info {
      flex: 0 0 auto;
    }

    .doc-badge {
      display: inline-block;
      background: ${hexToRgba(primaryColor, 0.08)};
      border-left: 4px solid ${primaryColor};
      padding: 12px 20px;
      margin-bottom: 15px;
    }

    .doc-type {
      font-size: 14pt;
      font-weight: 700;
      color: ${primaryColor};
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .doc-number {
      font-size: 10pt;
      color: #6b7280;
      margin-top: 3px;
    }

    .doc-dates {
      padding-left: 4px;
    }

    .date-row {
      display: flex;
      gap: 15px;
      padding: 4px 0;
      font-size: 9pt;
    }

    .date-label {
      color: #9ca3af;
      min-width: 100px;
    }

    .date-value {
      color: #374151;
      font-weight: 500;
    }

    /* Client Block */
    .zone-client {
      flex: 1;
      max-width: 300px;
    }

    .client-box {
      background: ${hexToRgba(primaryColor, 0.04)};
      border-radius: 8px;
      padding: 18px 20px;
      border: 1px solid ${hexToRgba(primaryColor, 0.15)};
    }

    .client-title {
      font-size: 8pt;
      font-weight: 600;
      color: ${primaryColor};
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 12px;
    }

    .client-name {
      font-size: 12pt;
      font-weight: 600;
      color: #111827;
      margin-bottom: 8px;
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

    .client-empty {
      font-style: italic;
      color: #9ca3af;
    }

    /* Items Table */
    .zone-items {
      margin-bottom: 25px;
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
    }

    .items-table th {
      background: ${primaryColor};
      color: #fff;
      padding: 12px 15px;
      text-align: left;
      font-weight: 500;
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .items-table th:first-child {
      border-radius: 6px 0 0 0;
    }

    .items-table th:last-child {
      border-radius: 0 6px 0 0;
    }

    .items-table td {
      padding: 14px 15px;
      vertical-align: top;
      font-size: 10pt;
      border-bottom: 1px solid #e5e7eb;
    }

    .items-table .col-desc {
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

    .items-table th.col-qty,
    .items-table th.col-price,
    .items-table th.col-total {
      text-align: center;
    }

    .items-empty {
      text-align: center;
      font-style: italic;
      color: #9ca3af;
      padding: 30px;
    }

    /* Totals */
    .totals-section {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      margin-bottom: 30px;
    }

    .zone-totals {
      width: 280px;
    }

    .totals-box {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      overflow: hidden;
    }

    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 18px;
      font-size: 10pt;
      border-bottom: 1px solid #e5e7eb;
    }

    .totals-row:last-child {
      border-bottom: none;
    }

    .totals-row span:first-child {
      color: #6b7280;
    }

    .totals-row span:last-child {
      font-weight: 600;
      color: #1f2937;
    }

    .total-main {
      background: ${hexToRgba(primaryColor, 0.08)};
      border-top: 2px solid ${primaryColor} !important;
    }

    .total-main span:first-child {
      color: ${primaryColor};
      font-weight: 600;
    }

    .total-main span:last-child {
      font-size: 12pt;
      color: ${primaryColor};
    }

    .total-letters {
      font-size: 8pt;
      color: #6b7280;
      font-style: italic;
      margin-top: 12px;
      text-align: right;
    }

    /* Payment & Signature */
    .payment-signature-section {
      display: flex;
      justify-content: space-between;
      gap: 40px;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }

    .section-title {
      font-size: 9pt;
      font-weight: 600;
      color: ${primaryColor};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
    }

    .zone-payment {
      flex: 1;
    }

    .bank-field {
      font-size: 9pt;
      color: #4b5563;
      margin-bottom: 5px;
    }

    .bank-field strong {
      color: #6b7280;
      font-weight: 500;
    }

    .zone-signature {
      flex: 0 0 200px;
    }

    .signature-box {
      text-align: center;
      padding-top: 50px;
    }

    .signature-line {
      border-bottom: 1px solid #d1d5db;
      margin-bottom: 8px;
    }

    .signature-hint {
      font-size: 8pt;
      color: #9ca3af;
      font-style: italic;
    }

    /* Footer */
    .zone-footer {
      margin-top: auto;
      text-align: center;
      font-size: 8pt;
      color: #6b7280;
    }

    .footer-company {
      font-weight: 600;
      color: ${primaryColor};
      margin-bottom: 5px;
    }

    .footer-legal {
      color: #9ca3af;
    }

    ${getPrintStyles()}
  `;
}
