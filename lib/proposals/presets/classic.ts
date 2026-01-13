// ============================================================================
// Classic Proposal Preset
// Traditional layout with bordered sections and numbered headings
// ============================================================================

import type { ProposalRenderContext, ProposalTheme, ProposalVisualOptions } from './types';
import {
  escapeHtml,
  getFontStack,
  getBaseStyles,
  wrapDocument,
  renderMarkdown,
  generateTableOfContents,
  renderFooter,
  renderCompanyHeader,
  getWatermarkStyles,
  renderPageHeader,
  getPageHeaderStyles,
} from './shared';

export function renderClassicProposal(
  context: ProposalRenderContext,
  theme: ProposalTheme,
  options: ProposalVisualOptions
): string {
  const { title, sections, company, client } = context;
  const { primaryColor, accentColor } = theme;

  const enabledSections = sections
    .filter(s => s.is_enabled)
    .sort((a, b) => a.position - b.position);

  // Custom styles for classic layout
  const customStyles = `
    ${getBaseStyles(theme)}
    ${getWatermarkStyles(options)}
    ${getPageHeaderStyles(options.showLogoOnAllPages)}

    .proposal-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
    }

    .proposal-header {
      border-bottom: 2px solid ${primaryColor};
      padding-bottom: 30px;
      margin-bottom: 40px;
    }

    .proposal-title {
      font-size: 32px;
      font-weight: 700;
      color: ${primaryColor};
      margin: 30px 0 20px 0;
    }

    .client-info {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-left: 4px solid ${accentColor};
      padding: 20px;
      margin-bottom: 40px;
    }

    .client-info h3 {
      font-size: 14px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }

    .section {
      margin-bottom: 40px;
      padding-bottom: 30px;
      border-bottom: 1px solid #e5e7eb;
    }

    .section:last-child {
      border-bottom: none;
    }

    .section-title {
      font-size: 20px;
      color: ${primaryColor};
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid ${accentColor};
      display: inline-block;
    }

    .section-number {
      display: inline-block;
      width: 32px;
      height: 32px;
      background: ${accentColor};
      color: white;
      border-radius: 50%;
      text-align: center;
      line-height: 32px;
      font-size: 14px;
      font-weight: 600;
      margin-right: 12px;
    }

    .section-body {
      color: #374151;
      line-height: 1.8;
    }
  `;

  // Build header
  const headerHtml = renderCompanyHeader(company, options.showLogo, primaryColor, 'left');

  // Build page header (logo on all pages)
  const pageHeaderHtml = renderPageHeader(company, options.showLogoOnAllPages, 'right');

  // Build client block
  const clientHtml = client ? `
    <div class="client-info">
      <h3>Pour</h3>
      <p style="font-size: 16px; font-weight: 600; color: ${primaryColor}; margin: 0;">
        ${escapeHtml(client.name)}
      </p>
      ${client.address ? `<p style="margin: 4px 0 0 0; color: #6b7280;">${escapeHtml(client.address)}</p>` : ''}
    </div>
  ` : '';

  // Build table of contents
  const tocHtml = options.showTableOfContents
    ? generateTableOfContents(enabledSections, options.showSectionNumbers, primaryColor)
    : '';

  // Build sections
  const sectionsHtml = enabledSections.map((section, index) => {
    const number = options.showSectionNumbers
      ? `<span class="section-number">${index + 1}</span>`
      : '';

    return `
      <div class="section" id="section-${section.id}">
        <h2 class="section-title">
          ${number}${escapeHtml(section.title)}
        </h2>
        <div class="section-body">
          ${renderMarkdown(section.body)}
        </div>
      </div>
    `;
  }).join('');

  // Build footer
  const footerHtml = renderFooter(options.footerText, options.showPageNumbers, primaryColor);

  // Assemble content
  const content = `
    ${pageHeaderHtml}
    <div class="proposal-container page-content">
      <div class="proposal-header">
        ${headerHtml}
        <h1 class="proposal-title">${escapeHtml(title)}</h1>
      </div>

      ${clientHtml}
      ${tocHtml}
      ${sectionsHtml}
      ${footerHtml}
    </div>
  `;

  return wrapDocument(content, customStyles, title);
}
