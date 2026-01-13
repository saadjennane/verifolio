// ============================================================================
// Creative Proposal Preset
// Bold design with colored sidebar accent, asymmetric layout, strong typography
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

export function renderCreativeProposal(
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

    .proposal-wrapper {
      display: flex;
      min-height: 100vh;
    }

    .sidebar {
      width: 60px;
      background: linear-gradient(180deg, ${accentColor}, ${primaryColor});
      position: fixed;
      left: 0;
      top: 0;
      bottom: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 30px 0;
    }

    .sidebar-logo {
      width: 40px;
      height: 40px;
      background: white;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 30px;
      overflow: hidden;
    }

    .sidebar-logo img {
      max-width: 30px;
      max-height: 30px;
    }

    .sidebar-text {
      writing-mode: vertical-rl;
      text-orientation: mixed;
      transform: rotate(180deg);
      color: white;
      font-size: 11px;
      letter-spacing: 3px;
      text-transform: uppercase;
      opacity: 0.7;
    }

    .proposal-container {
      margin-left: 60px;
      padding: 50px 60px;
      max-width: 850px;
    }

    .header {
      margin-bottom: 50px;
    }

    .company-name {
      font-size: 14px;
      font-weight: 600;
      color: ${accentColor};
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 30px;
    }

    .title-block {
      position: relative;
      padding-left: 25px;
      border-left: 4px solid ${accentColor};
    }

    .proposal-title {
      font-size: 36px;
      font-weight: 800;
      color: ${primaryColor};
      line-height: 1.2;
      margin-bottom: 15px;
    }

    .proposal-subtitle {
      font-size: 16px;
      color: #6b7280;
      font-weight: 400;
    }

    .meta-strip {
      display: flex;
      gap: 40px;
      margin: 40px 0;
      padding: 20px 0;
      border-top: 1px solid #e5e7eb;
      border-bottom: 1px solid #e5e7eb;
    }

    .meta-item {
      flex: 1;
    }

    .meta-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: ${accentColor};
      font-weight: 600;
      margin-bottom: 5px;
    }

    .meta-value {
      font-size: 15px;
      color: ${primaryColor};
      font-weight: 500;
    }

    .toc {
      margin-bottom: 50px;
      background: #f9fafb;
      padding: 30px;
      border-radius: 12px;
    }

    .toc h2 {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: ${accentColor};
      margin-bottom: 20px;
    }

    .toc-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    .toc-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 15px;
      background: white;
      border-radius: 8px;
      transition: all 0.2s;
    }

    .toc-item:hover {
      background: ${accentColor};
      color: white;
    }

    .toc-item:hover .toc-number {
      background: white;
      color: ${accentColor};
    }

    .toc-item:hover a {
      color: white;
    }

    .toc-number {
      width: 28px;
      height: 28px;
      background: ${accentColor};
      color: white;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      transition: all 0.2s;
    }

    .toc-item a {
      color: ${primaryColor};
      font-size: 13px;
      font-weight: 500;
      text-decoration: none;
    }

    .section {
      margin-bottom: 50px;
      position: relative;
    }

    .section-marker {
      position: absolute;
      left: -40px;
      top: 0;
      width: 3px;
      height: 100%;
      background: linear-gradient(180deg, ${accentColor}, transparent);
      border-radius: 2px;
    }

    .section-header {
      display: flex;
      align-items: flex-start;
      gap: 20px;
      margin-bottom: 25px;
    }

    .section-number {
      width: 50px;
      height: 50px;
      background: ${accentColor};
      color: white;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      font-weight: 800;
      flex-shrink: 0;
    }

    .section-title-block {
      flex: 1;
      padding-top: 5px;
    }

    .section-title {
      font-size: 22px;
      font-weight: 700;
      color: ${primaryColor};
      margin: 0 0 5px;
    }

    .section-underline {
      width: 60px;
      height: 3px;
      background: ${accentColor};
      border-radius: 2px;
    }

    .section-body {
      color: #4b5563;
      line-height: 1.8;
      font-size: 14px;
      padding-left: 70px;
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
      position: relative;
    }

    .section-body ul li::marker {
      color: ${accentColor};
    }

    .section-body h3 {
      font-size: 16px;
      font-weight: 700;
      color: ${primaryColor};
      margin: 1.5em 0 0.5em;
    }

    .section-body blockquote {
      background: linear-gradient(135deg, rgba(${hexToRgb(accentColor)}, 0.1), transparent);
      border-left: 4px solid ${accentColor};
      padding: 20px 25px;
      margin: 1.5em 0;
      border-radius: 0 12px 12px 0;
      font-style: italic;
    }

    .section-body code {
      background: #f3f4f6;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 13px;
    }

    .section-body pre {
      background: ${primaryColor};
      color: white;
      padding: 20px;
      border-radius: 12px;
      overflow-x: auto;
      margin: 1.5em 0;
    }

    .section-body pre code {
      background: none;
      padding: 0;
      color: inherit;
    }

    .cta-block {
      background: linear-gradient(135deg, ${accentColor}, ${primaryColor});
      color: white;
      padding: 40px;
      border-radius: 16px;
      text-align: center;
      margin: 50px 0;
    }

    .cta-title {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 10px;
    }

    .cta-text {
      font-size: 14px;
      opacity: 0.9;
    }

    .footer {
      margin-top: 60px;
      padding-top: 30px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .footer-brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .footer-dot {
      width: 8px;
      height: 8px;
      background: ${accentColor};
      border-radius: 50%;
    }

    .footer-company {
      font-size: 13px;
      font-weight: 600;
      color: ${primaryColor};
    }

    .footer-text {
      font-size: 12px;
      color: #9ca3af;
    }

    @media print {
      .sidebar {
        position: absolute;
        height: 100%;
      }

      .proposal-container {
        margin-left: 60px;
      }

      .section {
        break-inside: avoid;
      }

      .toc-item:hover {
        background: white;
        color: inherit;
      }

      .toc-item:hover .toc-number {
        background: ${accentColor};
        color: white;
      }

      .toc-item:hover a {
        color: ${primaryColor};
      }
    }
  `;

  // Format date
  const today = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Sidebar
  const sidebarLogoHtml = options.showLogo && company.logoUrl
    ? `<img src="${company.logoUrl}" alt="${escapeHtml(company.name)}">`
    : `<span style="font-weight:700;color:${accentColor}">${company.name.charAt(0)}</span>`;

  const sidebarHtml = `
    <div class="sidebar">
      <div class="sidebar-logo">
        ${sidebarLogoHtml}
      </div>
      <div class="sidebar-text">PROPOSITION</div>
    </div>
  `;

  // Header
  const headerHtml = `
    <div class="header">
      <div class="company-name">${escapeHtml(company.name)}</div>
      <div class="title-block">
        <h1 class="proposal-title">${escapeHtml(title)}</h1>
        ${client ? `<p class="proposal-subtitle">Proposition pour ${escapeHtml(client.name)}</p>` : ''}
      </div>
    </div>
  `;

  // Meta strip
  let metaStripHtml = '';
  if (client) {
    metaStripHtml = `
      <div class="meta-strip">
        <div class="meta-item">
          <div class="meta-label">Client</div>
          <div class="meta-value">${escapeHtml(client.name)}</div>
        </div>
        ${client.contactName ? `
          <div class="meta-item">
            <div class="meta-label">Contact</div>
            <div class="meta-value">${escapeHtml(client.contactName)}</div>
          </div>
        ` : ''}
        <div class="meta-item">
          <div class="meta-label">Date</div>
          <div class="meta-value">${today}</div>
        </div>
      </div>
    `;
  }

  // Table of contents
  let tocHtml = '';
  if (options.showTableOfContents && enabledSections.length > 0) {
    const tocItems = enabledSections.map((section, index) => {
      return `
        <div class="toc-item">
          ${options.showSectionNumbers ? `<div class="toc-number">${index + 1}</div>` : ''}
          <a href="#section-${section.id}">${escapeHtml(section.title)}</a>
        </div>
      `;
    }).join('');

    tocHtml = `
      <div class="toc">
        <h2>Au programme</h2>
        <div class="toc-grid">${tocItems}</div>
      </div>
    `;
  }

  // Sections
  const sectionsHtml = enabledSections.map((section, index) => {
    const numberHtml = options.showSectionNumbers
      ? `<div class="section-number">${index + 1}</div>`
      : '';

    return `
      <div class="section" id="section-${section.id}">
        <div class="section-marker"></div>
        <div class="section-header">
          ${numberHtml}
          <div class="section-title-block">
            <h2 class="section-title">${escapeHtml(section.title)}</h2>
            <div class="section-underline"></div>
          </div>
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
      <div class="footer-brand">
        <div class="footer-dot"></div>
        <div class="footer-company">${escapeHtml(company.name)}</div>
      </div>
      ${options.footerText ? `<div class="footer-text">${escapeHtml(options.footerText)}</div>` : ''}
    </div>
  `;

  // Page header (logo on all pages)
  const pageHeaderHtml = renderPageHeader(company, options.showLogoOnAllPages, 'right');

  const content = `
    ${pageHeaderHtml}
    <div class="proposal-wrapper page-content">
      ${sidebarHtml}
      <div class="proposal-container">
        ${headerHtml}
        ${metaStripHtml}
        ${tocHtml}
        ${sectionsHtml}
        ${footerHtml}
      </div>
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
