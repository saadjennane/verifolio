// ============================================================================
// Professional Proposal Preset
// Dense, structured layout with all information visible, business-focused
// ============================================================================

import type { ProposalRenderContext, ProposalTheme, ProposalVisualOptions } from './types';
import {
  escapeHtml,
  getBaseStyles,
  wrapDocument,
  renderMarkdown,
  generateTableOfContents,
  getWatermarkStyles,
  renderPageHeader,
  getPageHeaderStyles,
} from './shared';

export function renderProfessionalProposal(
  context: ProposalRenderContext,
  theme: ProposalTheme,
  options: ProposalVisualOptions
): string {
  const { title, sections, company, client } = context;
  const { primaryColor, accentColor } = theme;

  const enabledSections = sections
    .filter(s => s.is_enabled)
    .sort((a, b) => a.position - b.position);

  const customStyles = `
    ${getBaseStyles(theme)}
    ${getWatermarkStyles(options)}
    ${getPageHeaderStyles(options.showLogoOnAllPages)}

    .proposal-container {
      max-width: 850px;
      margin: 0 auto;
      padding: 40px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 20px;
      border-bottom: 2px solid ${primaryColor};
      margin-bottom: 30px;
    }

    .company-info {
      flex: 1;
    }

    .company-logo {
      max-height: 45px;
      max-width: 160px;
      margin-bottom: 10px;
    }

    .company-name {
      font-size: 20px;
      font-weight: 700;
      color: ${primaryColor};
      margin-bottom: 5px;
    }

    .company-details {
      font-size: 11px;
      color: #6b7280;
      line-height: 1.5;
    }

    .document-info {
      text-align: right;
      background: ${primaryColor};
      color: white;
      padding: 15px 25px;
      margin: -40px -40px 0 0;
    }

    .document-type {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 2px;
      opacity: 0.8;
      margin-bottom: 5px;
    }

    .document-title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 10px;
    }

    .document-date {
      font-size: 12px;
      opacity: 0.9;
    }

    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 25px;
      margin-bottom: 35px;
      background: #f9fafb;
      padding: 25px;
      border: 1px solid #e5e7eb;
    }

    .info-block h3 {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: ${primaryColor};
      font-weight: 700;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e5e7eb;
    }

    .info-block p {
      font-size: 13px;
      color: #374151;
      line-height: 1.6;
      margin: 0;
    }

    .info-block .name {
      font-weight: 600;
      color: ${primaryColor};
    }

    .toc {
      margin-bottom: 35px;
      border: 1px solid #e5e7eb;
    }

    .toc-header {
      background: ${primaryColor};
      color: white;
      padding: 10px 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .toc-body {
      padding: 15px 20px;
    }

    .toc-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 30px;
    }

    .toc-list li {
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .toc-list a {
      color: #374151;
      flex: 1;
    }

    .toc-list a:hover {
      color: ${accentColor};
    }

    .toc-number {
      color: ${accentColor};
      font-weight: 600;
      min-width: 20px;
    }

    .section {
      margin-bottom: 35px;
    }

    .section-header {
      background: #f3f4f6;
      padding: 12px 20px;
      margin-bottom: 20px;
      border-left: 4px solid ${accentColor};
      display: flex;
      align-items: center;
      gap: 15px;
    }

    .section-number {
      font-size: 18px;
      font-weight: 700;
      color: ${accentColor};
    }

    .section-title {
      font-size: 16px;
      font-weight: 600;
      color: ${primaryColor};
      margin: 0;
      flex: 1;
    }

    .section-body {
      color: #374151;
      line-height: 1.7;
      font-size: 13px;
      padding: 0 20px;
    }

    .section-body p {
      margin-bottom: 1em;
    }

    .section-body ul,
    .section-body ol {
      padding-left: 25px;
      margin-bottom: 1em;
    }

    .section-body li {
      margin-bottom: 0.4em;
    }

    .section-body h3 {
      font-size: 14px;
      font-weight: 600;
      color: ${primaryColor};
      margin: 1.5em 0 0.5em;
    }

    .section-body table {
      width: 100%;
      border-collapse: collapse;
      margin: 1em 0;
      font-size: 12px;
    }

    .section-body th,
    .section-body td {
      border: 1px solid #e5e7eb;
      padding: 8px 12px;
      text-align: left;
    }

    .section-body th {
      background: #f3f4f6;
      font-weight: 600;
      color: ${primaryColor};
    }

    .section-body blockquote {
      background: #f9fafb;
      border-left: 3px solid ${accentColor};
      padding: 15px 20px;
      margin: 1em 0;
      font-style: italic;
    }

    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid ${primaryColor};
      background: ${primaryColor};
      color: white;
      padding: 20px;
      margin: 40px -40px -40px;
    }

    .footer-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .footer-company {
      font-size: 12px;
      font-weight: 600;
    }

    .footer-text {
      font-size: 11px;
      opacity: 0.9;
    }

    .footer-page {
      font-size: 11px;
      opacity: 0.8;
    }

    @media print {
      .proposal-container {
        padding: 0;
      }

      .document-info {
        margin: 0;
      }

      .footer {
        margin: 40px 0 0;
      }

      .section {
        break-inside: avoid;
      }
    }
  `;

  // Format date
  const today = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Header
  const logoHtml = options.showLogo && company.logoUrl
    ? `<img src="${company.logoUrl}" alt="${escapeHtml(company.name)}" class="company-logo">`
    : `<div class="company-name">${escapeHtml(company.name)}</div>`;

  const headerHtml = `
    <div class="header">
      <div class="company-info">
        ${logoHtml}
        <div class="company-details">
          ${company.address ? escapeHtml(company.address) : ''}
          ${company.phone ? `<br>Tél: ${escapeHtml(company.phone)}` : ''}
          ${company.email ? `<br>${escapeHtml(company.email)}` : ''}
        </div>
      </div>
      <div class="document-info">
        <div class="document-type">Proposition commerciale</div>
        <div class="document-title">${escapeHtml(title)}</div>
        <div class="document-date">${today}</div>
      </div>
    </div>
  `;

  // Info grid
  let infoGridHtml = '';
  if (client) {
    infoGridHtml = `
      <div class="info-grid">
        <div class="info-block">
          <h3>Client</h3>
          <p class="name">${escapeHtml(client.name)}</p>
          ${client.contactName ? `<p>${escapeHtml(client.contactName)}</p>` : ''}
          ${client.address ? `<p>${escapeHtml(client.address)}</p>` : ''}
          ${client.email ? `<p>${escapeHtml(client.email)}</p>` : ''}
        </div>
        <div class="info-block">
          <h3>Informations</h3>
          <p><strong>Date:</strong> ${today}</p>
          <p><strong>Validité:</strong> 30 jours</p>
          <p><strong>Référence:</strong> PROP-${Date.now().toString().slice(-6)}</p>
        </div>
      </div>
    `;
  }

  // Table of contents
  let tocHtml = '';
  if (options.showTableOfContents && enabledSections.length > 0) {
    const tocItems = enabledSections.map((section, index) => {
      const num = options.showSectionNumbers ? `<span class="toc-number">${index + 1}.</span>` : '';
      return `<li>${num}<a href="#section-${section.id}">${escapeHtml(section.title)}</a></li>`;
    }).join('');

    tocHtml = `
      <div class="toc">
        <div class="toc-header">Sommaire</div>
        <div class="toc-body">
          <ol class="toc-list">${tocItems}</ol>
        </div>
      </div>
    `;
  }

  // Sections
  const sectionsHtml = enabledSections.map((section, index) => {
    const numberHtml = options.showSectionNumbers
      ? `<span class="section-number">${index + 1}.</span>`
      : '';

    return `
      <div class="section" id="section-${section.id}">
        <div class="section-header">
          ${numberHtml}
          <h2 class="section-title">${escapeHtml(section.title)}</h2>
        </div>
        <div class="section-body">
          ${renderMarkdown(section.body)}
        </div>
      </div>
    `;
  }).join('');

  // Footer
  const footerHtml = `
    <div class="footer">
      <div class="footer-content">
        <div class="footer-company">${escapeHtml(company.name)}</div>
        ${options.footerText ? `<div class="footer-text">${escapeHtml(options.footerText)}</div>` : ''}
        ${options.showPageNumbers ? '<div class="footer-page">Page 1</div>' : ''}
      </div>
    </div>
  `;

  // Page header (logo on all pages)
  const pageHeaderHtml = renderPageHeader(company, options.showLogoOnAllPages, 'right');

  const content = `
    ${pageHeaderHtml}
    <div class="proposal-container page-content">
      ${headerHtml}
      ${infoGridHtml}
      ${tocHtml}
      ${sectionsHtml}
      ${footerHtml}
    </div>
  `;

  return wrapDocument(content, customStyles, title);
}
