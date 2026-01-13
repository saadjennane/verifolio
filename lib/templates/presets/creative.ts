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
 * Creative layout - Bold and distinctive design
 * - Left accent sidebar with color
 * - Asymmetric layout
 * - Bold typography
 * - Modern visual hierarchy
 */
export function renderCreative(context: RenderContext, colors: PresetColors): string {
  const { entityType, document } = context;
  const docTitle = entityType === 'quote' ? 'DEVIS' : 'FACTURE';
  const currency = getCurrency(context);

  const styles = getStyles(colors);
  const content = `
    <div class="document">
      <!-- Left accent sidebar -->
      <div class="accent-sidebar">
        <div class="sidebar-content">
          <div class="sidebar-label">${docTitle}</div>
          <div class="sidebar-number">${escapeHtml(document?.numero || '')}</div>
        </div>
      </div>

      <!-- Main content area -->
      <div class="main-area">
        <div class="document-content">
          ${renderHeader(context, colors)}

          <div class="info-grid">
            ${renderClient(context, colors)}
            ${renderDocInfo(context, currency, colors)}
          </div>

          ${renderItems(context, currency, colors)}

          ${renderTotals(context, currency, colors)}

          ${renderFooterInfo(context, colors)}
        </div>
      </div>
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
      <div class="header-brand">
        ${hasLogo
          ? `<img src="${escapeHtml(company!.logo_url!)}" alt="${escapeHtml(company?.display_name || '')}" class="logo-img" />`
          : `<div class="brand-text">${escapeHtml(company?.display_name || 'Mon entreprise')}</div>`
        }
      </div>
      <div class="header-contact">
        ${company?.email ? `<div>${escapeHtml(company.email)}</div>` : ''}
        ${company?.phone ? `<div>${escapeHtml(company.phone)}</div>` : ''}
        ${company?.address ? `<div>${escapeHtml(company.address.split('\n')[0])}</div>` : ''}
      </div>
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
        <div class="block-label">Pour</div>
        <div class="client-empty">Client non renseigné</div>
      </div>
    `;
  }

  return `
    <div class="zone zone-client" data-zone="client">
      <div class="block-label">Pour</div>
      <div class="client-name">${escapeHtml(client.nom)}</div>
      ${client.address ? `<div class="client-detail">${escapeHtml(client.address).replace(/\n/g, '<br>')}</div>` : ''}
      ${client.email ? `<div class="client-detail">${escapeHtml(client.email)}</div>` : ''}
    </div>
  `;
}

// ============================================================================
// Document Info
// ============================================================================

function renderDocInfo(context: RenderContext, currency: CurrencyConfig, colors: PresetColors): string {
  const { document, entityType } = context;
  if (!document) return '';

  return `
    <div class="zone zone-doc-info" data-zone="doc_info">
      <div class="info-item">
        <div class="info-label">Date</div>
        <div class="info-value">${formatDate(document.date)}</div>
      </div>
      ${entityType === 'invoice' && document.date_echeance ? `
        <div class="info-item">
          <div class="info-label">Échéance</div>
          <div class="info-value">${formatDate(document.date_echeance)}</div>
        </div>
      ` : ''}
    </div>
  `;
}

// ============================================================================
// Items
// ============================================================================

function renderItems(context: RenderContext, currency: CurrencyConfig, colors: PresetColors): string {
  const { lineItems } = context;

  if (lineItems.length === 0) {
    return `
      <div class="zone zone-items" data-zone="items">
        <div class="items-empty">Aucune prestation</div>
      </div>
    `;
  }

  const rows = lineItems.map((item, index) => {
    const total = item.quantity * item.unit_price;
    return `
      <div class="item-card">
        <div class="item-index">${String(index + 1).padStart(2, '0')}</div>
        <div class="item-content">
          <div class="item-desc">${escapeHtml(item.description)}</div>
          <div class="item-meta">
            ${formatNumber(item.quantity)} × ${formatCurrency(item.unit_price, currency)}
          </div>
        </div>
        <div class="item-total">${formatCurrency(total, currency)}</div>
      </div>
    `;
  }).join('\n');

  return `
    <div class="zone zone-items" data-zone="items">
      <div class="items-label">Prestations</div>
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
      <div class="totals-breakdown">
        <div class="totals-line">
          <span>Sous-total HT</span>
          <span>${formatCurrency(document.total_ht, currency)}</span>
        </div>
        ${document.total_tva > 0 ? `
          <div class="totals-line">
            <span>TVA</span>
            <span>${formatCurrency(document.total_tva, currency)}</span>
          </div>
        ` : ''}
      </div>
      <div class="total-main">
        <div class="total-label">${label}</div>
        <div class="total-amount">${formatCurrency(document.total_ttc, currency)}</div>
        ${lettersHtml}
      </div>
    </div>
  `;
}

// ============================================================================
// Footer Info
// ============================================================================

function renderFooterInfo(context: RenderContext, colors: PresetColors): string {
  const { fields, fieldDefinitions, company } = context;

  // Bank info
  const bankFields: string[] = [];
  const bankKeywords = ['iban', 'bic', 'banque', 'bank', 'titulaire', 'rib', 'swift'];

  for (const [key, value] of Object.entries(fields.company)) {
    if (!value) continue;
    const isBank = bankKeywords.some(kw => key.toLowerCase().includes(kw));
    if (isBank) {
      const def = fieldDefinitions.company[key];
      const label = def?.label || key;
      bankFields.push(`${label}: ${value}`);
    }
  }

  // Legal info
  const legalFields: string[] = [];
  const legalKeywords = ['ice', 'rc', 'patente', 'if', 'tva', 'siret', 'siren', 'capital', 'registre', 'cnss'];

  for (const [key, value] of Object.entries(fields.company)) {
    if (!value) continue;
    const isBank = bankKeywords.some(kw => key.toLowerCase().includes(kw));
    if (isBank) continue;

    const isLegal = legalKeywords.some(kw => key.toLowerCase().includes(kw));
    if (isLegal) {
      const def = fieldDefinitions.company[key];
      const label = def?.label || key;
      legalFields.push(`${label}: ${value}`);
    }
  }

  return `
    <div class="zone zone-footer-info" data-zone="footer">
      ${bankFields.length > 0 ? `
        <div class="footer-section">
          <div class="footer-label">Paiement</div>
          <div class="footer-text">${escapeHtml(bankFields.join(' | '))}</div>
        </div>
      ` : ''}
      ${legalFields.length > 0 ? `
        <div class="footer-section">
          <div class="footer-label">Mentions</div>
          <div class="footer-text">${escapeHtml(legalFields.join(' | '))}</div>
        </div>
      ` : ''}
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
      color: #1e293b;
      background: #fff;
    }

    .document {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: #fff;
      box-sizing: border-box;
      display: flex;
      position: relative;
    }

    /* Accent Sidebar */
    .accent-sidebar {
      width: 25mm;
      background: ${primaryColor};
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      padding: 20mm 0;
    }

    .sidebar-content {
      writing-mode: vertical-rl;
      text-orientation: mixed;
      transform: rotate(180deg);
      padding: 0 8mm;
      color: rgba(255, 255, 255, 0.9);
    }

    .sidebar-label {
      font-size: 10pt;
      font-weight: 300;
      letter-spacing: 3px;
      text-transform: uppercase;
      margin-bottom: 15px;
    }

    .sidebar-number {
      font-size: 14pt;
      font-weight: 700;
      letter-spacing: 1px;
    }

    /* Main Area */
    .main-area {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .document-content {
      flex: 1 1 auto;
      padding: 18mm 20mm 18mm 15mm;
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
      margin-bottom: 35px;
      padding-bottom: 20px;
      border-bottom: 3px solid #f1f5f9;
    }

    .header-brand {
      flex: 0 0 auto;
    }

    .logo-img {
      max-height: 45px;
      max-width: 150px;
    }

    .brand-text {
      font-size: 20pt;
      font-weight: 800;
      color: ${primaryColor};
      letter-spacing: -0.5px;
    }

    .header-contact {
      text-align: right;
      font-size: 9pt;
      color: #64748b;
      line-height: 1.8;
    }

    /* Info Grid */
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-bottom: 35px;
    }

    .block-label {
      font-size: 8pt;
      font-weight: 700;
      color: ${primaryColor};
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 10px;
    }

    /* Client */
    .client-name {
      font-size: 14pt;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 8px;
    }

    .client-detail {
      font-size: 9pt;
      color: #64748b;
      margin-bottom: 3px;
    }

    .client-empty {
      font-style: italic;
      color: #cbd5e1;
    }

    /* Doc Info */
    .zone-doc-info {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .info-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 15px;
      background: #f8fafc;
      border-radius: 8px;
    }

    .info-label {
      font-size: 9pt;
      color: #64748b;
    }

    .info-value {
      font-size: 10pt;
      font-weight: 600;
      color: #1e293b;
    }

    /* Items */
    .items-label {
      font-size: 8pt;
      font-weight: 700;
      color: ${primaryColor};
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 15px;
    }

    .items-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .item-card {
      display: flex;
      align-items: flex-start;
      gap: 15px;
      padding: 15px;
      background: #f8fafc;
      border-radius: 10px;
      border-left: 4px solid ${accentColor};
    }

    .item-index {
      font-size: 11pt;
      font-weight: 700;
      color: ${accentColor};
      min-width: 25px;
    }

    .item-content {
      flex: 1;
    }

    .item-desc {
      font-size: 10pt;
      color: #1e293b;
      margin-bottom: 5px;
    }

    .item-meta {
      font-size: 9pt;
      color: #94a3b8;
    }

    .item-total {
      font-size: 11pt;
      font-weight: 700;
      color: #1e293b;
    }

    .items-empty {
      text-align: center;
      font-style: italic;
      color: #cbd5e1;
      padding: 40px;
      background: #f8fafc;
      border-radius: 10px;
    }

    /* Totals */
    .zone-totals {
      display: flex;
      justify-content: flex-end;
      align-items: flex-start;
      gap: 40px;
      margin-top: 30px;
    }

    .totals-breakdown {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .totals-line {
      display: flex;
      justify-content: space-between;
      gap: 40px;
      font-size: 10pt;
    }

    .totals-line span:first-child {
      color: #64748b;
    }

    .totals-line span:last-child {
      font-weight: 500;
      color: #334155;
    }

    .total-main {
      background: ${primaryColor};
      color: #fff;
      padding: 20px 25px;
      border-radius: 12px;
      text-align: center;
      min-width: 200px;
    }

    .total-label {
      font-size: 9pt;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 1px;
      opacity: 0.8;
      margin-bottom: 5px;
    }

    .total-amount {
      font-size: 22pt;
      font-weight: 800;
    }

    .total-letters {
      font-size: 8pt;
      opacity: 0.7;
      margin-top: 8px;
      font-style: italic;
    }

    /* Footer Info */
    .zone-footer-info {
      margin-top: auto;
      padding-top: 25px;
      border-top: 1px solid #e2e8f0;
    }

    .footer-section {
      margin-bottom: 12px;
    }

    .footer-section:last-child {
      margin-bottom: 0;
    }

    .footer-label {
      font-size: 7pt;
      font-weight: 700;
      color: ${primaryColor};
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 4px;
    }

    .footer-text {
      font-size: 8pt;
      color: #64748b;
      line-height: 1.5;
    }

    ${getPrintStyles()}

    @media print {
      .accent-sidebar {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
    }
  `;
}
