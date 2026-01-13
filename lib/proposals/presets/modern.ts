// ============================================================================
// Modern Proposal Preset
// Contemporary style with rounded cards, accent band, generous spacing
// ============================================================================

import type { ProposalRenderContext, ProposalTheme, ProposalVisualOptions } from './types';
import {
  escapeHtml,
  getBaseStyles,
  wrapDocument,
  renderMarkdown,
  generateTableOfContents,
  renderFooter,
  hexToRgba,
  getWatermarkStyles,
  renderPageHeader,
  getPageHeaderStyles,
} from './shared';

export function renderModernProposal(
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
    }

    .accent-band {
      height: 8px;
      background: linear-gradient(90deg, ${accentColor}, ${hexToRgba(accentColor, 0.6)});
      margin-bottom: 40px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 0 40px;
      margin-bottom: 40px;
    }

    .company-info {
      flex: 1;
    }

    .company-logo {
      max-height: 50px;
      max-width: 180px;
      margin-bottom: 8px;
    }

    .company-name {
      font-size: 22px;
      font-weight: 700;
      color: ${primaryColor};
      margin-bottom: 4px;
    }

    .company-contact {
      font-size: 12px;
      color: #6b7280;
    }

    .proposal-title {
      font-size: 36px;
      font-weight: 800;
      color: ${primaryColor};
      padding: 0 40px;
      margin-bottom: 40px;
      line-height: 1.2;
    }

    .info-cards {
      display: flex;
      gap: 20px;
      padding: 0 40px;
      margin-bottom: 50px;
    }

    .info-card {
      flex: 1;
      background: ${hexToRgba(accentColor, 0.05)};
      border-radius: 12px;
      padding: 24px;
    }

    .info-card-label {
      font-size: 12px;
      color: ${accentColor};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
      font-weight: 600;
    }

    .info-card-value {
      font-size: 16px;
      font-weight: 600;
      color: ${primaryColor};
    }

    .content {
      padding: 0 40px;
    }

    .section {
      margin-bottom: 50px;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 20px;
    }

    .section-number {
      width: 40px;
      height: 40px;
      background: ${accentColor};
      color: white;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: 700;
    }

    .section-title {
      font-size: 22px;
      color: ${primaryColor};
      margin: 0;
    }

    .section-body {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 28px;
      color: #374151;
      line-height: 1.8;
    }

    .footer {
      margin-top: 60px;
      padding: 30px 40px;
      background: ${hexToRgba(primaryColor, 0.03)};
      text-align: center;
    }
  `;

  // Header with logo
  const logoHtml = options.showLogo && company.logoUrl
    ? `<img src="${company.logoUrl}" alt="${escapeHtml(company.name)}" class="company-logo">`
    : `<div class="company-name">${escapeHtml(company.name)}</div>`;

  const contactParts: string[] = [];
  if (company.email) contactParts.push(escapeHtml(company.email));
  if (company.phone) contactParts.push(escapeHtml(company.phone));

  const headerHtml = `
    <div class="header">
      <div class="company-info">
        ${logoHtml}
        <div class="company-contact">${contactParts.join(' • ')}</div>
      </div>
    </div>
  `;

  // Info cards
  const infoCardsHtml = client ? `
    <div class="info-cards">
      <div class="info-card">
        <div class="info-card-label">Client</div>
        <div class="info-card-value">${escapeHtml(client.name)}</div>
      </div>
      <div class="info-card">
        <div class="info-card-label">Proposition</div>
        <div class="info-card-value">${escapeHtml(title)}</div>
      </div>
    </div>
  ` : '';

  // Table of contents
  const tocHtml = options.showTableOfContents
    ? `<div class="content">${generateTableOfContents(enabledSections, options.showSectionNumbers, accentColor)}</div>`
    : '';

  // Sections
  const sectionsHtml = enabledSections.map((section, index) => {
    const numberHtml = options.showSectionNumbers
      ? `<div class="section-number">${index + 1}</div>`
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
  const footerHtml = options.footerText ? `
    <div class="footer">
      <p style="margin: 0; color: #6b7280; font-size: 13px;">${escapeHtml(options.footerText)}</p>
    </div>
  ` : '';

  // Page header (logo on all pages)
  const pageHeaderHtml = renderPageHeader(company, options.showLogoOnAllPages, 'right');

  const content = `
    ${pageHeaderHtml}
    <div class="proposal-container page-content">
      <div class="accent-band"></div>
      ${headerHtml}
      <h1 class="proposal-title">${escapeHtml(title)}</h1>
      ${infoCardsHtml}
      ${tocHtml}
      <div class="content">
        ${sectionsHtml}
      </div>
      ${footerHtml}
    </div>
  `;

  return wrapDocument(content, customStyles, title);
}
