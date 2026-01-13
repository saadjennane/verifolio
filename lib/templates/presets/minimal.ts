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
  renderDynamicFields,
  wrapDocument,
  getResetStyles,
  getZoneInteractiveStyles,
  getPrintStyles,
  type CurrencyConfig,
} from './shared';

/**
 * Minimal layout - Clean and spacious design
 * - Centered logo
 * - Minimal text and whitespace
 * - Ultra-clean table with thin lines
 * - Discreet footer
 */
export function renderMinimal(context: RenderContext, colors: PresetColors): string {
  const { entityType, document } = context;
  const docTitle = entityType === 'quote' ? 'DEVIS' : 'FACTURE';
  const currency = getCurrency(context);

  const styles = getStyles(colors);
  const content = `
    <div class="document">
      <div class="document-content">
        ${renderHeader(context, colors)}
        ${renderDocTitle(context, docTitle, colors)}

        <div class="main-info">
          ${renderClient(context)}
          ${renderDocInfo(context, currency)}
        </div>

        ${renderItems(context, currency)}

        ${renderTotals(context, currency, colors)}
      </div>

      ${renderFooter(context)}
    </div>
  `;

  return wrapDocument(`${docTitle} ${document?.numero || ''}`, styles, content);
}

// ============================================================================
// Header (Centered Logo)
// ============================================================================

function renderHeader(context: RenderContext, colors: PresetColors): string {
  const { company } = context;
  const hasLogo = !!company?.logo_url;

  return `
    <div class="zone zone-header" data-zone="header">
      ${hasLogo
        ? `<img src="${escapeHtml(company!.logo_url!)}" alt="${escapeHtml(company?.display_name || '')}" class="logo-img" />`
        : `<div class="company-name">${escapeHtml(company?.display_name || 'Mon entreprise')}</div>`
      }
    </div>
  `;
}

// ============================================================================
// Document Title
// ============================================================================

function renderDocTitle(context: RenderContext, docTitle: string, colors: PresetColors): string {
  const { document } = context;
  if (!document) return '';

  return `
    <div class="doc-title-section">
      <span class="doc-type">${docTitle}</span>
      <span class="doc-divider">—</span>
      <span class="doc-number">${escapeHtml(document.numero)}</span>
    </div>
  `;
}

// ============================================================================
// Client Info
// ============================================================================

function renderClient(context: RenderContext): string {
  const { client } = context;

  if (!client) {
    return `
      <div class="zone zone-client" data-zone="client">
        <div class="info-block">
          <div class="info-label">Client</div>
          <div class="info-empty">—</div>
        </div>
      </div>
    `;
  }

  const lines: string[] = [client.nom];
  if (client.address) lines.push(client.address.split('\n')[0]);
  if (client.email) lines.push(client.email);

  return `
    <div class="zone zone-client" data-zone="client">
      <div class="info-block">
        <div class="info-label">Client</div>
        <div class="info-content">${lines.map(l => escapeHtml(l)).join('<br>')}</div>
      </div>
    </div>
  `;
}

// ============================================================================
// Document Info
// ============================================================================

function renderDocInfo(context: RenderContext, currency: CurrencyConfig): string {
  const { document, entityType } = context;
  if (!document) return '';

  const lines: string[] = [];
  lines.push(`Émis le ${formatDate(document.date)}`);

  if (entityType === 'invoice' && document.date_echeance) {
    lines.push(`Échéance le ${formatDate(document.date_echeance)}`);
  }

  return `
    <div class="zone zone-doc-info" data-zone="doc_info">
      <div class="info-block">
        <div class="info-label">Document</div>
        <div class="info-content">${lines.join('<br>')}</div>
      </div>
    </div>
  `;
}

// ============================================================================
// Items Table
// ============================================================================

function renderItems(context: RenderContext, currency: CurrencyConfig): string {
  const { lineItems } = context;

  if (lineItems.length === 0) {
    return `
      <div class="zone zone-items" data-zone="items">
        <div class="items-empty">Aucune prestation</div>
      </div>
    `;
  }

  const rows = lineItems.map(item => {
    const total = item.quantity * item.unit_price;
    return `
      <tr>
        <td class="col-desc">${escapeHtml(item.description)}</td>
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
          <tr>
            <th class="col-desc">Description</th>
            <th class="col-qty">Qté</th>
            <th class="col-price">P.U.</th>
            <th class="col-total">Total</th>
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
// Totals
// ============================================================================

function renderTotals(context: RenderContext, currency: CurrencyConfig, colors: PresetColors): string {
  const { document, entityType } = context;
  if (!document) return '';

  const label = entityType === 'quote' ? 'Total' : 'À payer';

  let lettersHtml = '';
  if (currency.supportsLetters) {
    const letters = numberToWords(document.total_ttc, currency.code);
    if (letters) {
      lettersHtml = `<div class="total-letters">${escapeHtml(letters)}</div>`;
    }
  }

  return `
    <div class="zone zone-totals" data-zone="totals">
      <div class="totals-container">
        <div class="totals-breakdown">
          <div class="totals-line">
            <span>HT</span>
            <span>${formatCurrency(document.total_ht, currency)}</span>
          </div>
          ${document.total_tva > 0 ? `
            <div class="totals-line">
              <span>TVA</span>
              <span>${formatCurrency(document.total_tva, currency)}</span>
            </div>
          ` : ''}
        </div>
        <div class="totals-main">
          <div class="totals-line total-ttc">
            <span>${label}</span>
            <span>${formatCurrency(document.total_ttc, currency)}</span>
          </div>
          ${lettersHtml}
        </div>
      </div>
    </div>
  `;
}

// ============================================================================
// Footer
// ============================================================================

function renderFooter(context: RenderContext): string {
  const { company, fields, fieldDefinitions } = context;

  const parts: string[] = [];

  if (company) {
    parts.push(company.display_name);
  }

  const legalKeywords = ['siret', 'siren', 'tva', 'ice', 'rc'];
  const bankKeywords = ['iban', 'bic', 'banque', 'bank', 'titulaire', 'rib', 'swift'];

  for (const [key, value] of Object.entries(fields.company)) {
    if (!value) continue;
    const isBank = bankKeywords.some(kw => key.toLowerCase().includes(kw));
    if (isBank) continue;

    const isLegal = legalKeywords.some(kw => key.toLowerCase().includes(kw));
    if (isLegal) {
      const def = fieldDefinitions.company[key];
      const label = def?.label || key;
      parts.push(`${label} ${value}`);
    }
  }

  if (company?.email) parts.push(company.email);

  if (parts.length === 0) return '';

  return `
    <div class="zone zone-footer" data-zone="footer">
      ${escapeHtml(parts.join(' · '))}
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
      line-height: 1.7;
      color: #374151;
      background: #fff;
    }

    .document {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 25mm 30mm;
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

    /* Header - Centered */
    .zone-header {
      text-align: center;
      margin-bottom: 30px;
    }

    .logo-img {
      max-height: 45px;
      max-width: 150px;
    }

    .company-name {
      font-size: 18pt;
      font-weight: 300;
      letter-spacing: 2px;
      color: ${primaryColor};
      text-transform: uppercase;
    }

    /* Document Title */
    .doc-title-section {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 1px solid #e5e7eb;
    }

    .doc-type {
      font-size: 12pt;
      font-weight: 300;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: ${primaryColor};
    }

    .doc-divider {
      margin: 0 15px;
      color: #d1d5db;
    }

    .doc-number {
      font-size: 12pt;
      font-weight: 500;
      color: #6b7280;
    }

    /* Main Info Row */
    .main-info {
      display: flex;
      justify-content: space-between;
      gap: 60px;
      margin-bottom: 40px;
    }

    .info-block {
      flex: 1;
    }

    .info-label {
      font-size: 8pt;
      font-weight: 500;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #9ca3af;
      margin-bottom: 8px;
    }

    .info-content {
      font-size: 10pt;
      color: #374151;
      line-height: 1.8;
    }

    .info-empty {
      color: #d1d5db;
    }

    .zone-doc-info {
      text-align: right;
    }

    .zone-doc-info .info-block {
      text-align: right;
    }

    /* Items Table */
    .zone-items {
      margin-bottom: 30px;
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
    }

    .items-table th {
      padding: 12px 0;
      text-align: left;
      font-size: 8pt;
      font-weight: 500;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #9ca3af;
      border-bottom: 1px solid #e5e7eb;
    }

    .items-table td {
      padding: 15px 0;
      font-size: 10pt;
      border-bottom: 1px solid #f3f4f6;
    }

    .items-table .col-desc {
      width: 55%;
    }

    .items-table .col-qty {
      width: 10%;
      text-align: center;
    }

    .items-table .col-price {
      width: 17.5%;
      text-align: right;
    }

    .items-table .col-total {
      width: 17.5%;
      text-align: right;
      font-weight: 500;
    }

    .items-table th.col-qty,
    .items-table th.col-price,
    .items-table th.col-total {
      text-align: right;
    }

    .items-table th.col-qty {
      text-align: center;
    }

    .items-empty {
      text-align: center;
      font-style: italic;
      color: #d1d5db;
      padding: 40px;
    }

    /* Totals */
    .zone-totals {
      display: flex;
      justify-content: flex-end;
    }

    .totals-container {
      width: 280px;
    }

    .totals-breakdown {
      margin-bottom: 15px;
    }

    .totals-line {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 10pt;
      color: #6b7280;
    }

    .totals-line span:last-child {
      font-weight: 500;
    }

    .totals-main {
      border-top: 1px solid #e5e7eb;
      padding-top: 15px;
    }

    .total-ttc {
      font-size: 14pt;
      color: ${primaryColor};
    }

    .total-ttc span:first-child {
      font-weight: 300;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .total-ttc span:last-child {
      font-weight: 600;
    }

    .total-letters {
      font-size: 8pt;
      color: #9ca3af;
      margin-top: 10px;
      text-align: right;
      font-style: italic;
    }

    /* Footer */
    .zone-footer {
      margin-top: auto;
      padding-top: 20px;
      text-align: center;
      font-size: 8pt;
      color: #9ca3af;
      letter-spacing: 0.5px;
    }

    ${getPrintStyles()}
  `;
}
