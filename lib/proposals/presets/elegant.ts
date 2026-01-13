// ============================================================================
// Elegant Proposal Preset
// Refined design with decorative separators, subtle color touches
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

export function renderElegantProposal(
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
      max-width: 800px;
      margin: 0 auto;
      padding: 50px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 50px;
    }

    .header-left {
      flex: 1;
    }

    .company-logo {
      max-height: 50px;
      max-width: 180px;
      margin-bottom: 15px;
    }

    .company-name {
      font-size: 22px;
      font-weight: 600;
      color: ${primaryColor};
      margin-bottom: 5px;
    }

    .header-right {
      text-align: right;
    }

    .proposal-badge {
      display: inline-block;
      background: ${accentColor};
      color: white;
      padding: 8px 20px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 2px;
      border-radius: 2px;
    }

    .decorative-line {
      height: 3px;
      background: linear-gradient(90deg, ${accentColor}, ${primaryColor});
      margin: 40px 0;
      border-radius: 2px;
    }

    .title-section {
      text-align: center;
      margin-bottom: 50px;
    }

    .proposal-title {
      font-size: 32px;
      font-weight: 300;
      color: ${primaryColor};
      margin-bottom: 15px;
      line-height: 1.3;
    }

    .title-underline {
      width: 80px;
      height: 2px;
      background: ${accentColor};
      margin: 0 auto 20px;
    }

    .subtitle {
      font-size: 14px;
      color: #6b7280;
      font-style: italic;
    }

    .client-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 50px;
      gap: 40px;
    }

    .client-block {
      flex: 1;
      background: linear-gradient(135deg, rgba(${hexToRgb(accentColor)}, 0.05), transparent);
      border-left: 3px solid ${accentColor};
      padding: 25px;
    }

    .client-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: ${accentColor};
      font-weight: 600;
      margin-bottom: 12px;
    }

    .client-name {
      font-size: 18px;
      font-weight: 600;
      color: ${primaryColor};
      margin-bottom: 8px;
    }

    .client-details {
      font-size: 13px;
      color: #6b7280;
      line-height: 1.6;
    }

    .date-block {
      text-align: right;
    }

    .date-block .client-label {
      color: #9ca3af;
    }

    .date-value {
      font-size: 15px;
      color: ${primaryColor};
      font-weight: 500;
    }

    .toc {
      margin-bottom: 50px;
      padding: 30px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      background: #fafafa;
    }

    .toc h2 {
      font-size: 14px;
      font-weight: 600;
      color: ${primaryColor};
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 1px solid #e5e7eb;
    }

    .toc-list {
      list-style: none;
      padding: 0;
      margin: 0;
      columns: 2;
      column-gap: 40px;
    }

    .toc-list li {
      padding: 6px 0;
      break-inside: avoid;
    }

    .toc-list a {
      color: #4b5563;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .toc-list a:hover {
      color: ${accentColor};
    }

    .toc-list a::before {
      content: '◆';
      color: ${accentColor};
      font-size: 6px;
    }

    .section {
      margin-bottom: 50px;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 15px;
      margin-bottom: 25px;
    }

    .section-icon {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, ${accentColor}, ${primaryColor});
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: 14px;
    }

    .section-title {
      font-size: 20px;
      font-weight: 600;
      color: ${primaryColor};
      margin: 0;
      flex: 1;
    }

    .section-line {
      flex: 1;
      height: 1px;
      background: linear-gradient(90deg, #e5e7eb, transparent);
    }

    .section-body {
      color: #4b5563;
      line-height: 1.8;
      font-size: 14px;
      padding-left: 55px;
    }

    .section-body p {
      margin-bottom: 1.2em;
    }

    .section-body ul,
    .section-body ol {
      padding-left: 20px;
      margin-bottom: 1.2em;
    }

    .section-body li {
      margin-bottom: 0.5em;
    }

    .section-body blockquote {
      border-left: 3px solid ${accentColor};
      padding-left: 20px;
      margin: 1.5em 0;
      font-style: italic;
      color: #6b7280;
    }

    .footer {
      margin-top: 60px;
      text-align: center;
      padding-top: 30px;
      border-top: 1px solid #e5e7eb;
    }

    .footer-decoration {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 15px;
      margin-bottom: 15px;
    }

    .footer-dot {
      width: 6px;
      height: 6px;
      background: ${accentColor};
      border-radius: 50%;
    }

    .footer-line {
      width: 60px;
      height: 1px;
      background: #e5e7eb;
    }

    .footer-text {
      font-size: 11px;
      color: #9ca3af;
    }

    @media print {
      .proposal-container {
        padding: 0;
      }

      .section {
        break-inside: avoid;
      }
    }
  `;

  // Header with logo and badge
  const logoHtml = options.showLogo && company.logoUrl
    ? `<img src="${company.logoUrl}" alt="${escapeHtml(company.name)}" class="company-logo">`
    : `<div class="company-name">${escapeHtml(company.name)}</div>`;

  const headerHtml = `
    <div class="header">
      <div class="header-left">
        ${logoHtml}
      </div>
      <div class="header-right">
        <div class="proposal-badge">Proposition</div>
      </div>
    </div>
  `;

  // Title section
  const titleHtml = `
    <div class="title-section">
      <h1 class="proposal-title">${escapeHtml(title)}</h1>
      <div class="title-underline"></div>
      ${client ? `<p class="subtitle">Préparée pour ${escapeHtml(client.name)}</p>` : ''}
    </div>
  `;

  // Client and date section
  let clientSectionHtml = '';
  if (client) {
    const today = new Date().toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    clientSectionHtml = `
      <div class="client-section">
        <div class="client-block">
          <div class="client-label">Client</div>
          <div class="client-name">${escapeHtml(client.name)}</div>
          ${client.contactName ? `<div class="client-details">${escapeHtml(client.contactName)}</div>` : ''}
          ${client.email ? `<div class="client-details">${escapeHtml(client.email)}</div>` : ''}
        </div>
        <div class="date-block">
          <div class="client-label">Date</div>
          <div class="date-value">${today}</div>
        </div>
      </div>
    `;
  }

  // Table of contents
  let tocHtml = '';
  if (options.showTableOfContents && enabledSections.length > 0) {
    const tocItems = enabledSections.map((section, index) => {
      const num = options.showSectionNumbers ? `${index + 1}. ` : '';
      return `<li><a href="#section-${section.id}">${num}${escapeHtml(section.title)}</a></li>`;
    }).join('');

    tocHtml = `
      <div class="toc">
        <h2>Table des matières</h2>
        <ol class="toc-list">${tocItems}</ol>
      </div>
    `;
  }

  // Sections
  const sectionsHtml = enabledSections.map((section, index) => {
    const numberHtml = options.showSectionNumbers
      ? `<div class="section-icon">${index + 1}</div>`
      : '';

    return `
      <div class="section" id="section-${section.id}">
        <div class="section-header">
          ${numberHtml}
          <h2 class="section-title">${escapeHtml(section.title)}</h2>
          <div class="section-line"></div>
        </div>
        <div class="section-body">
          ${renderMarkdown(section.body)}
        </div>
      </div>
    `;
  }).join('');

  // Footer
  const footerHtml = options.footerText ? `
    <div class="footer">
      <div class="footer-decoration">
        <div class="footer-line"></div>
        <div class="footer-dot"></div>
        <div class="footer-line"></div>
      </div>
      <p class="footer-text">${escapeHtml(options.footerText)}</p>
    </div>
  ` : '';

  // Page header (logo on all pages)
  const pageHeaderHtml = renderPageHeader(company, options.showLogoOnAllPages, 'right');

  const content = `
    ${pageHeaderHtml}
    <div class="proposal-container page-content">
      ${headerHtml}
      <div class="decorative-line"></div>
      ${titleHtml}
      ${clientSectionHtml}
      ${tocHtml}
      ${sectionsHtml}
      ${footerHtml}
    </div>
  `;

  return wrapDocument(content, customStyles, title);
}

// Helper to convert hex to RGB
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
  }
  return '0, 0, 0';
}
