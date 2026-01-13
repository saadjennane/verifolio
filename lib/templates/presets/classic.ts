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
 * Classic layout - Traditional invoice/quote design
 * - Header horizontal with logo left
 * - Client info box on left, document info on right
 * - Bordered table with alternating rows
 * - Traditional totals box
 */
export function renderClassic(context: RenderContext, colors: PresetColors): string {
  const { entityType, document } = context;
  const docTitle = entityType === 'quote' ? 'DEVIS' : 'FACTURE';
  const currency = getCurrency(context);

  const styles = getStyles(colors);
  const content = `
    <div class="document">
      <div class="document-content">
        ${renderHeader(context, colors)}
        <div class="info-client-row">
          ${renderClient(context, colors)}
          ${renderDocInfo(context, docTitle, currency, colors)}
        </div>
        ${renderItems(context, currency)}
        <div class="totals-due-row">
          ${renderTotalDue(context, currency, colors)}
          ${renderTotals(context, currency, colors)}
        </div>
        <div class="payment-signature-row">
          ${renderPayment(context)}
          ${renderSignature()}
        </div>
        <div class="document-spacer"></div>
      </div>
      ${renderFooter(context)}
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

  const headerContent = hasLogo
    ? `<div class="logo-container"><img src="${escapeHtml(company!.logo_url!)}" alt="${escapeHtml(company?.display_name || '')}" class="logo-img" /></div>`
    : `<div class="company-name company-name-large">${escapeHtml(company?.display_name || 'Mon entreprise')}</div>`;

  return `
    <div class="zone zone-header logo-position-left" data-zone="header">
      <div class="header-content">
        ${headerContent}
      </div>
    </div>
  `;
}

// ============================================================================
// Document Info
// ============================================================================

function renderDocInfo(context: RenderContext, docTitle: string, currency: CurrencyConfig, colors: PresetColors): string {
  const { document, company, entityType } = context;
  if (!document) return '';

  const infoLines: string[] = [];

  infoLines.push(`
    <div class="doc-type-number">
      <span class="doc-type">${docTitle}</span>
      <span class="doc-number">${escapeHtml(document.numero)}</span>
    </div>
  `);

  infoLines.push(`
    <div class="doc-info-row">
      <span class="doc-info-label">Date d'émission</span>
      <span class="doc-info-value">${formatDate(document.date)}</span>
    </div>
  `);

  if (entityType === 'invoice' && document.date_echeance) {
    infoLines.push(`
      <div class="doc-info-row">
        <span class="doc-info-label">Date d'échéance</span>
        <span class="doc-info-value">${formatDate(document.date_echeance)}</span>
      </div>
    `);
  }

  const companyCurrency = company?.default_currency || 'EUR';
  if (currency.code !== companyCurrency) {
    infoLines.push(`
      <div class="doc-info-row">
        <span class="doc-info-label">Devise</span>
        <span class="doc-info-value">${currency.code}</span>
      </div>
    `);
  }

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
// Client Block
// ============================================================================

function renderClient(context: RenderContext, colors: PresetColors): string {
  const { client } = context;

  if (!client) {
    return `
      <div class="zone zone-client" data-zone="client">
        <div class="client-box">
          <div class="client-label">DESTINATAIRE</div>
          <div class="client-empty">Client non défini</div>
        </div>
      </div>
    `;
  }

  const lines: string[] = [];
  lines.push(`<div class="client-name">${escapeHtml(client.nom)}</div>`);

  if (client.address) {
    lines.push(`<div class="client-address">${escapeHtml(client.address).replace(/\n/g, '<br>')}</div>`);
  }

  const contactParts: string[] = [];
  if (client.email) contactParts.push(escapeHtml(client.email));
  if (client.phone) contactParts.push(escapeHtml(client.phone));
  if (contactParts.length > 0) {
    lines.push(`<div class="client-contact">${contactParts.join(' | ')}</div>`);
  }

  const clientFields = renderDynamicFields(context, 'client');
  if (clientFields) {
    lines.push(`<div class="client-fields">${clientFields}</div>`);
  }

  return `
    <div class="zone zone-client" data-zone="client">
      <div class="client-box">
        <div class="client-label">DESTINATAIRE</div>
        ${lines.join('\n')}
      </div>
    </div>
  `;
}

// ============================================================================
// Items Table
// ============================================================================

function renderItems(context: RenderContext, currency: CurrencyConfig): string {
  const { lineItems, company } = context;

  const headerCols = [
    '<th class="col-description">Désignation</th>',
    '<th class="col-qty">Qté</th>',
    '<th class="col-price">Prix unitaire</th>',
    '<th class="col-total">Total</th>',
  ];

  if (lineItems.length === 0) {
    return `
      <div class="zone zone-items" data-zone="items">
        <table class="items-table">
          <thead>
            <tr>${headerCols.join('')}</tr>
          </thead>
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
        <td class="col-description">${escapeHtml(item.description).replace(/\n/g, '<br>')}</td>
        <td class="col-qty">${formatNumber(item.quantity)}</td>
        <td class="col-price">${formatCurrency(item.unit_price, currency)}</td>
        <td class="col-total">${formatCurrency(total, currency)}</td>
      </tr>
    `;
  }).join('\n');

  return `
    <div class="zone zone-items" data-zone="items">
      <table class="items-table">
        <thead>
          <tr>${headerCols.join('')}</tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

// ============================================================================
// Totals
// ============================================================================

function renderTotals(context: RenderContext, currency: CurrencyConfig, colors: PresetColors): string {
  const { document } = context;
  if (!document) return '';

  const rows: string[] = [];

  rows.push(`
    <div class="totals-row">
      <span class="totals-label">Total HT</span>
      <span class="totals-value">${formatCurrency(document.total_ht, currency)}</span>
    </div>
  `);

  if (document.total_tva > 0) {
    rows.push(`
      <div class="totals-row">
        <span class="totals-label">TVA</span>
        <span class="totals-value">${formatCurrency(document.total_tva, currency)}</span>
      </div>
    `);
  }

  rows.push(`
    <div class="totals-row totals-ttc">
      <span class="totals-label">Total TTC</span>
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
// Total Due
// ============================================================================

function renderTotalDue(context: RenderContext, currency: CurrencyConfig, colors: PresetColors): string {
  const { document, entityType } = context;
  if (!document) return '';

  const defaultLabel = entityType === 'quote' ? 'Total devis' : 'Montant total dû';
  const totalFormatted = formatCurrency(document.total_ttc, currency);

  let lettersHtml = '';
  if (currency.supportsLetters) {
    const letters = numberToWords(document.total_ttc, currency.code);
    if (letters) {
      lettersHtml = `<div class="total-due-letters">${escapeHtml(letters)}</div>`;
    }
  }

  return `
    <div class="zone zone-total-due" data-zone="total_due">
      <div class="total-due-box">
        <div class="total-due-label">${escapeHtml(defaultLabel)}</div>
        <div class="total-due-amount">${totalFormatted}</div>
        ${lettersHtml}
      </div>
    </div>
  `;
}

// ============================================================================
// Payment
// ============================================================================

function renderPayment(context: RenderContext): string {
  const { fields, fieldDefinitions } = context;

  const sections: string[] = [];
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
        <div class="payment-label">Coordonnées bancaires</div>
        ${bankFields.join('\n')}
      </div>
    `);
  }

  if (sections.length === 0) return '';

  return `
    <div class="zone zone-payment" data-zone="payment">
      ${sections.join('\n')}
    </div>
  `;
}

// ============================================================================
// Signature
// ============================================================================

function renderSignature(): string {
  return `
    <div class="zone zone-signature" data-zone="signature">
      <div class="signature-box">
        <div class="signature-label">Cachet et signature</div>
      </div>
    </div>
  `;
}

// ============================================================================
// Footer
// ============================================================================

function renderFooter(context: RenderContext): string {
  const { company, fields, fieldDefinitions } = context;

  const lines: string[] = [];

  if (company) {
    const shortAddress = company.address ? company.address.split('\n')[0] : '';
    const identity = [company.display_name, shortAddress].filter(Boolean).join(' — ');
    if (identity) {
      lines.push(`<div class="footer-identity">${escapeHtml(identity)}</div>`);
    }
  }

  const legalContactParts: string[] = [];
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
      legalContactParts.push(`${label}: ${value}`);
    }
  }

  if (company) {
    if (company.email) legalContactParts.push(company.email);
    if (company.phone) legalContactParts.push(company.phone);
  }

  if (legalContactParts.length > 0) {
    lines.push(`<div class="footer-legal-contact">${escapeHtml(legalContactParts.join(' | '))}</div>`);
  }

  if (lines.length === 0) return '';

  return `
    <div class="zone zone-footer" data-zone="footer">
      ${lines.join('\n')}
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

    .zone {
      margin-bottom: 20px;
    }

    ${getZoneInteractiveStyles()}

    /* Header */
    .zone-header {
      display: flex;
      padding-bottom: 20px;
      border-bottom: 2px solid #e5e7eb;
      margin-bottom: 25px;
    }

    .header-content {
      flex: 0 0 auto;
    }

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

    .zone-header.logo-position-left {
      justify-content: flex-start;
    }

    .zone-header.logo-position-center {
      justify-content: center;
    }

    .zone-header.logo-position-right {
      justify-content: flex-end;
    }

    /* Doc Info */
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
      color: ${primaryColor};
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

    /* Client */
    .zone-client {
      flex: 1;
      max-width: calc(100% - 250px);
      margin-bottom: 0;
    }

    .client-box {
      border-radius: 6px;
      padding: 15px;
      background: transparent;
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

    /* Items Table */
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
      width: 15%;
      text-align: center;
    }

    .items-table .col-price,
    .items-table .col-total {
      width: 17.5%;
      text-align: right;
    }

    .items-table th.col-qty,
    .items-table th.col-price,
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

    /* Totals */
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

    .totals-label {
      color: #6b7280;
    }

    .totals-value {
      font-weight: 600;
      color: #1f2937;
    }

    .totals-ttc {
      background: ${hexToRgba(primaryColor, 0.1)};
      border-top: 2px solid ${primaryColor} !important;
    }

    .totals-ttc .totals-label,
    .totals-ttc .totals-value {
      color: ${primaryColor};
      font-weight: 700;
      font-size: 11pt;
    }

    /* Total Due */
    .zone-total-due {
      flex: 1;
      display: flex;
      justify-content: flex-start;
      align-items: flex-start;
      margin-top: 0;
      margin-bottom: 0;
    }

    .total-due-box {
      background: ${hexToRgba(primaryColor, 0.05)};
      border: 2px solid ${primaryColor};
      border-radius: 8px;
      padding: 15px 25px;
      text-align: center;
      min-width: 280px;
      max-width: 320px;
    }

    .total-due-label {
      font-size: 9pt;
      font-weight: 600;
      color: ${primaryColor};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 5px;
    }

    .total-due-amount {
      font-size: 18pt;
      font-weight: 700;
      color: ${primaryColor};
    }

    .total-due-letters {
      font-size: 8pt;
      color: #64748b;
      margin-top: 8px;
      font-style: italic;
    }

    /* Payment */
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

    /* Signature */
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

    /* Footer */
    .zone-footer {
      flex-shrink: 0;
      margin-top: auto;
      padding-top: 15px;
      border-top: 1px solid #e5e7eb;
      font-size: 8pt;
      color: #6b7280;
      text-align: center;
    }

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

    /* Dynamic Fields */
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

    ${getPrintStyles()}
  `;
}
