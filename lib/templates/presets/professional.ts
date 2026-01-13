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
 * Professional layout - Business-focused design
 * - Two balanced columns for header info
 * - All information visible
 * - Prominent legal mentions
 * - Complete bank details section
 */
export function renderProfessional(context: RenderContext, colors: PresetColors): string {
  const { entityType, document } = context;
  const docTitle = entityType === 'quote' ? 'DEVIS' : 'FACTURE';
  const currency = getCurrency(context);

  const styles = getStyles(colors);
  const content = `
    <div class="document">
      <div class="document-content">
        <!-- Two-column header -->
        <div class="header-row">
          ${renderCompanyInfo(context, colors)}
          ${renderDocHeader(context, docTitle, colors)}
        </div>

        <!-- Client info full width -->
        ${renderClient(context, colors)}

        <!-- Items table -->
        ${renderItems(context, currency)}

        <!-- Totals and Bank side by side -->
        <div class="bottom-row">
          ${renderBankDetails(context, colors)}
          ${renderTotals(context, currency, colors)}
        </div>

        <!-- Legal mentions -->
        ${renderLegalMentions(context, colors)}
      </div>

      ${renderFooter(context, colors)}
    </div>
  `;

  return wrapDocument(`${docTitle} ${document?.numero || ''}`, styles, content);
}

// ============================================================================
// Company Info (Left Column)
// ============================================================================

function renderCompanyInfo(context: RenderContext, colors: PresetColors): string {
  const { company, fields, fieldDefinitions } = context;

  const hasLogo = !!company?.logo_url;

  // Gather company info
  const infoLines: string[] = [];
  if (company?.address) {
    infoLines.push(escapeHtml(company.address).replace(/\n/g, '<br>'));
  }
  if (company?.email) infoLines.push(escapeHtml(company.email));
  if (company?.phone) infoLines.push(escapeHtml(company.phone));

  return `
    <div class="zone zone-header company-column" data-zone="header">
      ${hasLogo
        ? `<img src="${escapeHtml(company!.logo_url!)}" alt="${escapeHtml(company?.display_name || '')}" class="logo-img" />`
        : ''
      }
      <div class="company-name">${escapeHtml(company?.display_name || 'Mon entreprise')}</div>
      <div class="company-details">
        ${infoLines.join('<br>')}
      </div>
    </div>
  `;
}

// ============================================================================
// Document Header (Right Column)
// ============================================================================

function renderDocHeader(context: RenderContext, docTitle: string, colors: PresetColors): string {
  const { document, entityType } = context;
  if (!document) return '';

  return `
    <div class="zone zone-doc-info doc-column" data-zone="doc_info">
      <div class="doc-type-badge">${docTitle}</div>
      <table class="doc-info-table">
        <tr>
          <td class="info-label">Numéro</td>
          <td class="info-value">${escapeHtml(document.numero)}</td>
        </tr>
        <tr>
          <td class="info-label">Date d'émission</td>
          <td class="info-value">${formatDate(document.date)}</td>
        </tr>
        ${entityType === 'invoice' && document.date_echeance ? `
          <tr>
            <td class="info-label">Date d'échéance</td>
            <td class="info-value">${formatDate(document.date_echeance)}</td>
          </tr>
        ` : ''}
        <tr>
          <td class="info-label">Statut</td>
          <td class="info-value status-badge">${document.status || 'Brouillon'}</td>
        </tr>
      </table>
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
        <div class="client-section">
          <div class="section-header">Informations client</div>
          <div class="client-empty">Client non défini</div>
        </div>
      </div>
    `;
  }

  const clientFields = renderDynamicFields(context, 'client');

  return `
    <div class="zone zone-client" data-zone="client">
      <div class="client-section">
        <div class="section-header">Informations client</div>
        <div class="client-grid">
          <div class="client-main">
            <div class="client-name">${escapeHtml(client.nom)}</div>
            ${client.address ? `<div class="client-address">${escapeHtml(client.address).replace(/\n/g, '<br>')}</div>` : ''}
          </div>
          <div class="client-contact">
            ${client.email ? `<div><strong>Email:</strong> ${escapeHtml(client.email)}</div>` : ''}
            ${client.phone ? `<div><strong>Tél:</strong> ${escapeHtml(client.phone)}</div>` : ''}
            ${client.type ? `<div><strong>Type:</strong> ${client.type === 'entreprise' ? 'Entreprise' : 'Particulier'}</div>` : ''}
          </div>
        </div>
        ${clientFields ? `<div class="client-fields">${clientFields}</div>` : ''}
      </div>
    </div>
  `;
}

// ============================================================================
// Items Table
// ============================================================================

function renderItems(context: RenderContext, currency: CurrencyConfig): string {
  const { lineItems, company } = context;

  const headerCols = `
    <th class="col-ref">#</th>
    <th class="col-desc">Description</th>
    <th class="col-qty">Qté</th>
    <th class="col-price">Prix unit. HT</th>
    <th class="col-tva">TVA</th>
    <th class="col-total">Total HT</th>
  `;

  if (lineItems.length === 0) {
    return `
      <div class="zone zone-items" data-zone="items">
        <div class="section-header">Détail des prestations</div>
        <table class="items-table">
          <thead><tr>${headerCols}</tr></thead>
          <tbody>
            <tr><td colspan="6" class="items-empty">Aucune prestation</td></tr>
          </tbody>
        </table>
      </div>
    `;
  }

  const rows = lineItems.map((item, index) => {
    const total = item.quantity * item.unit_price;
    const tvaRate = item.tva_rate ?? company?.default_tax_rate ?? 20;
    return `
      <tr>
        <td class="col-ref">${index + 1}</td>
        <td class="col-desc">${escapeHtml(item.description).replace(/\n/g, '<br>')}</td>
        <td class="col-qty">${formatNumber(item.quantity)}</td>
        <td class="col-price">${formatCurrency(item.unit_price, currency)}</td>
        <td class="col-tva">${tvaRate}%</td>
        <td class="col-total">${formatCurrency(total, currency)}</td>
      </tr>
    `;
  }).join('\n');

  return `
    <div class="zone zone-items" data-zone="items">
      <div class="section-header">Détail des prestations</div>
      <table class="items-table">
        <thead><tr>${headerCols}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

// ============================================================================
// Bank Details
// ============================================================================

function renderBankDetails(context: RenderContext, colors: PresetColors): string {
  const { fields, fieldDefinitions } = context;

  const bankFields: { label: string; value: string }[] = [];
  const bankKeywords = ['iban', 'bic', 'banque', 'bank', 'titulaire', 'rib', 'swift'];

  for (const [key, value] of Object.entries(fields.company)) {
    if (!value) continue;
    const isBank = bankKeywords.some(kw => key.toLowerCase().includes(kw));
    if (isBank) {
      const def = fieldDefinitions.company[key];
      const label = def?.label || key;
      bankFields.push({ label, value });
    }
  }

  if (bankFields.length === 0) {
    return `
      <div class="zone zone-payment bank-column" data-zone="payment">
        <div class="section-header">Informations de paiement</div>
        <div class="bank-empty">Coordonnées bancaires non renseignées</div>
      </div>
    `;
  }

  return `
    <div class="zone zone-payment bank-column" data-zone="payment">
      <div class="section-header">Informations de paiement</div>
      <table class="bank-table">
        ${bankFields.map(f => `
          <tr>
            <td class="bank-label">${escapeHtml(f.label)}</td>
            <td class="bank-value">${escapeHtml(f.value)}</td>
          </tr>
        `).join('\n')}
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

  const label = entityType === 'quote' ? 'TOTAL DU DEVIS' : 'TOTAL À RÉGLER';

  let lettersHtml = '';
  if (currency.supportsLetters) {
    const letters = numberToWords(document.total_ttc, currency.code);
    if (letters) {
      lettersHtml = `<div class="total-letters">Soit : ${escapeHtml(letters)}</div>`;
    }
  }

  return `
    <div class="zone zone-totals totals-column" data-zone="totals">
      <table class="totals-table">
        <tr>
          <td>Total HT</td>
          <td>${formatCurrency(document.total_ht, currency)}</td>
        </tr>
        ${document.total_tva > 0 ? `
          <tr>
            <td>Total TVA</td>
            <td>${formatCurrency(document.total_tva, currency)}</td>
          </tr>
        ` : ''}
        <tr class="total-ttc-row">
          <td>${label}</td>
          <td>${formatCurrency(document.total_ttc, currency)}</td>
        </tr>
      </table>
      ${lettersHtml}
    </div>
  `;
}

// ============================================================================
// Legal Mentions
// ============================================================================

function renderLegalMentions(context: RenderContext, colors: PresetColors): string {
  const { fields, fieldDefinitions, document, entityType } = context;

  const legalFields: string[] = [];
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
      legalFields.push(`<strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}`);
    }
  }

  const standardMentions: string[] = [];
  if (entityType === 'quote') {
    standardMentions.push('Devis valable 30 jours à compter de sa date d\'émission.');
  } else {
    standardMentions.push('En cas de retard de paiement, une pénalité de 3 fois le taux d\'intérêt légal sera appliquée.');
    standardMentions.push('Indemnité forfaitaire pour frais de recouvrement: 40€.');
  }

  if (document?.conditions) {
    standardMentions.push(document.conditions);
  }

  return `
    <div class="zone zone-legal" data-zone="footer">
      <div class="section-header">Mentions légales</div>
      <div class="legal-content">
        ${legalFields.length > 0 ? `
          <div class="legal-ids">
            ${legalFields.join(' | ')}
          </div>
        ` : ''}
        <div class="legal-mentions">
          ${standardMentions.map(m => `<p>${escapeHtml(m)}</p>`).join('\n')}
        </div>
      </div>
    </div>
  `;
}

// ============================================================================
// Footer
// ============================================================================

function renderFooter(context: RenderContext, colors: PresetColors): string {
  const { company } = context;

  return `
    <div class="zone zone-footer" data-zone="footer">
      <div class="footer-line"></div>
      <div class="footer-content">
        ${company ? escapeHtml(company.display_name) : ''}
        ${company?.email ? ` — ${escapeHtml(company.email)}` : ''}
        ${company?.phone ? ` — ${escapeHtml(company.phone)}` : ''}
      </div>
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
      font-size: 9pt;
      line-height: 1.5;
      color: #1f2937;
      background: #fff;
    }

    .document {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 15mm 18mm;
      background: #fff;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
    }

    .document-content {
      flex: 1 1 auto;
    }

    .zone {
      margin-bottom: 15px;
    }

    ${getZoneInteractiveStyles()}

    /* Section Headers */
    .section-header {
      font-size: 9pt;
      font-weight: 700;
      color: ${primaryColor};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding-bottom: 8px;
      margin-bottom: 10px;
      border-bottom: 2px solid ${primaryColor};
    }

    /* Header Row */
    .header-row {
      display: flex;
      justify-content: space-between;
      gap: 30px;
      margin-bottom: 20px;
    }

    .company-column {
      flex: 1;
    }

    .doc-column {
      flex: 0 0 220px;
    }

    /* Company Info */
    .logo-img {
      max-height: 50px;
      max-width: 150px;
      margin-bottom: 10px;
    }

    .company-name {
      font-size: 14pt;
      font-weight: 700;
      color: ${primaryColor};
      margin-bottom: 8px;
    }

    .company-details {
      font-size: 9pt;
      color: #4b5563;
      line-height: 1.6;
    }

    /* Document Info */
    .doc-type-badge {
      display: inline-block;
      background: ${primaryColor};
      color: #fff;
      font-size: 12pt;
      font-weight: 700;
      padding: 8px 16px;
      letter-spacing: 1px;
      margin-bottom: 12px;
    }

    .doc-info-table {
      width: 100%;
      font-size: 9pt;
    }

    .doc-info-table td {
      padding: 5px 0;
    }

    .doc-info-table .info-label {
      color: #6b7280;
      width: 110px;
    }

    .doc-info-table .info-value {
      color: #1f2937;
      font-weight: 500;
    }

    .status-badge {
      display: inline-block;
      background: ${hexToRgba(accentColor, 0.15)};
      color: ${accentColor};
      padding: 2px 8px;
      border-radius: 3px;
      font-size: 8pt;
      text-transform: uppercase;
    }

    /* Client Section */
    .client-section {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      padding: 15px;
    }

    .client-grid {
      display: flex;
      gap: 40px;
    }

    .client-main {
      flex: 1;
    }

    .client-contact {
      flex: 0 0 200px;
      font-size: 9pt;
      color: #4b5563;
    }

    .client-contact div {
      margin-bottom: 4px;
    }

    .client-contact strong {
      color: #6b7280;
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
    }

    .client-fields {
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px dashed #d1d5db;
    }

    .client-empty {
      font-style: italic;
      color: #9ca3af;
    }

    /* Items Table */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9pt;
    }

    .items-table th {
      background: #f3f4f6;
      border: 1px solid #d1d5db;
      padding: 8px 10px;
      text-align: left;
      font-weight: 600;
      color: #374151;
      text-transform: uppercase;
      font-size: 8pt;
    }

    .items-table td {
      border: 1px solid #e5e7eb;
      padding: 10px;
      vertical-align: top;
    }

    .items-table .col-ref {
      width: 5%;
      text-align: center;
      color: #9ca3af;
    }

    .items-table .col-desc {
      width: 40%;
    }

    .items-table .col-qty {
      width: 10%;
      text-align: center;
    }

    .items-table .col-price,
    .items-table .col-total {
      width: 17%;
      text-align: right;
    }

    .items-table .col-tva {
      width: 11%;
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
      padding: 25px;
    }

    /* Bottom Row */
    .bottom-row {
      display: flex;
      justify-content: space-between;
      gap: 30px;
      margin-top: 20px;
    }

    .bank-column {
      flex: 1;
    }

    .totals-column {
      flex: 0 0 280px;
    }

    /* Bank Details */
    .bank-table {
      width: 100%;
      font-size: 9pt;
    }

    .bank-table td {
      padding: 5px 0;
    }

    .bank-table .bank-label {
      color: #6b7280;
      width: 100px;
    }

    .bank-table .bank-value {
      font-family: 'Courier New', monospace;
      color: #1f2937;
    }

    .bank-empty {
      font-style: italic;
      color: #9ca3af;
      font-size: 9pt;
    }

    /* Totals */
    .totals-table {
      width: 100%;
      border-collapse: collapse;
    }

    .totals-table td {
      padding: 8px 12px;
      font-size: 9pt;
      border-bottom: 1px solid #e5e7eb;
    }

    .totals-table td:first-child {
      color: #6b7280;
    }

    .totals-table td:last-child {
      text-align: right;
      font-weight: 600;
      color: #1f2937;
    }

    .total-ttc-row {
      background: ${hexToRgba(primaryColor, 0.08)};
    }

    .total-ttc-row td {
      border-top: 2px solid ${primaryColor};
      border-bottom: none;
      font-size: 11pt;
      font-weight: 700;
      color: ${primaryColor} !important;
    }

    .total-letters {
      font-size: 8pt;
      color: #6b7280;
      font-style: italic;
      margin-top: 10px;
      text-align: right;
    }

    /* Legal Mentions */
    .zone-legal {
      margin-top: 20px;
      padding-top: 15px;
      border-top: 1px solid #e5e7eb;
    }

    .legal-content {
      font-size: 8pt;
      color: #6b7280;
    }

    .legal-ids {
      margin-bottom: 10px;
      padding-bottom: 10px;
      border-bottom: 1px dashed #e5e7eb;
    }

    .legal-mentions p {
      margin-bottom: 5px;
    }

    /* Footer */
    .zone-footer {
      margin-top: auto;
    }

    .footer-line {
      height: 3px;
      background: ${primaryColor};
      margin-bottom: 10px;
    }

    .footer-content {
      text-align: center;
      font-size: 8pt;
      color: #6b7280;
    }

    /* Dynamic Fields */
    .dynamic-field {
      font-size: 9pt;
      margin-bottom: 3px;
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
