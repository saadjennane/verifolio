// ============================================================================
// Minimal Proposal Preset
// Ultra-clean design with generous whitespace and light typography
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

export function renderMinimalProposal(
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
      max-width: 700px;
      margin: 0 auto;
      padding: 60px 40px;
    }

    .header {
      text-align: center;
      margin-bottom: 80px;
    }

    .company-logo {
      max-height: 40px;
      max-width: 150px;
      margin-bottom: 20px;
    }

    .company-name {
      font-size: 18px;
      font-weight: 500;
      color: ${primaryColor};
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-bottom: 8px;
    }

    .divider {
      width: 60px;
      height: 1px;
      background: ${accentColor};
      margin: 30px auto;
    }

    .proposal-title {
      font-size: 28px;
      font-weight: 300;
      color: ${primaryColor};
      margin-bottom: 20px;
      letter-spacing: -0.5px;
    }

    .meta-info {
      display: flex;
      justify-content: center;
      gap: 40px;
      margin-top: 40px;
      font-size: 13px;
      color: #6b7280;
    }

    .meta-item {
      text-align: center;
    }

    .meta-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #9ca3af;
      margin-bottom: 4px;
    }

    .meta-value {
      color: ${primaryColor};
    }

    .toc {
      margin-bottom: 60px;
      padding: 30px;
      background: #fafafa;
      border-radius: 4px;
    }

    .toc h2 {
      font-size: 14px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #9ca3af;
      margin-bottom: 16px;
    }

    .toc-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .toc-list li {
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }

    .toc-list li:last-child {
      border-bottom: none;
    }

    .toc-list a {
      color: ${primaryColor};
      font-size: 14px;
    }

    .section {
      margin-bottom: 60px;
    }

    .section-title {
      font-size: 18px;
      font-weight: 500;
      color: ${primaryColor};
      margin-bottom: 24px;
      padding-bottom: 12px;
      border-bottom: 1px solid #e5e7eb;
    }

    .section-number {
      color: ${accentColor};
      margin-right: 12px;
      font-weight: 400;
    }

    .section-body {
      color: #4b5563;
      line-height: 1.9;
      font-size: 15px;
    }

    .section-body p {
      margin-bottom: 1.5em;
    }

    .footer {
      margin-top: 80px;
      text-align: center;
      padding-top: 30px;
      border-top: 1px solid #e5e7eb;
    }

    .footer-text {
      font-size: 12px;
      color: #9ca3af;
    }
  `;

  // Header
  const logoHtml = options.showLogo && company.logoUrl
    ? `<img src="${company.logoUrl}" alt="${escapeHtml(company.name)}" class="company-logo">`
    : `<div class="company-name">${escapeHtml(company.name)}</div>`;

  const headerHtml = `
    <div class="header">
      ${logoHtml}
      <div class="divider"></div>
      <h1 class="proposal-title">${escapeHtml(title)}</h1>
      ${client ? `
        <div class="meta-info">
          <div class="meta-item">
            <div class="meta-label">Pour</div>
            <div class="meta-value">${escapeHtml(client.name)}</div>
          </div>
        </div>
      ` : ''}
    </div>
  `;

  // Table of contents
  let tocHtml = '';
  if (options.showTableOfContents && enabledSections.length > 0) {
    const tocItems = enabledSections.map((section, index) => {
      const num = options.showSectionNumbers ? `${index + 1}. ` : '';
      return `<li><a href="#section-${section.id}">${num}${escapeHtml(section.title)}</a></li>`;
    }).join('');

    tocHtml = `
      <div class="toc">
        <h2>Sommaire</h2>
        <ol class="toc-list">${tocItems}</ol>
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
        <h2 class="section-title">
          ${numberHtml}${escapeHtml(section.title)}
        </h2>
        <div class="section-body">
          ${renderMarkdown(section.body)}
        </div>
      </div>
    `;
  }).join('');

  // Footer
  const footerHtml = options.footerText ? `
    <div class="footer">
      <p class="footer-text">${escapeHtml(options.footerText)}</p>
    </div>
  ` : '';

  // Page header (logo on all pages)
  const pageHeaderHtml = renderPageHeader(company, options.showLogoOnAllPages, 'right');

  const content = `
    ${pageHeaderHtml}
    <div class="proposal-container page-content">
      ${headerHtml}
      ${tocHtml}
      ${sectionsHtml}
      ${footerHtml}
    </div>
  `;

  return wrapDocument(content, customStyles, title);
}
