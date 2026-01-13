// ============================================================================
// Shared utilities for proposal presets
// ============================================================================

import type { ProposalTheme, ProposalVisualOptions, ProposalSection } from './types';

/**
 * Escape HTML entities
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Get font stack based on font type
 */
export function getFontStack(fontFamily: ProposalTheme['fontFamily']): string {
  switch (fontFamily) {
    case 'serif':
      return "'Georgia', 'Times New Roman', serif";
    case 'mono':
      return "'Menlo', 'Monaco', 'Courier New', monospace";
    default:
      return "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  }
}

/**
 * Convert hex color to rgba
 */
export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Generate table of contents from sections
 */
export function generateTableOfContents(
  sections: ProposalSection[],
  showNumbers: boolean,
  primaryColor: string
): string {
  const enabledSections = sections
    .filter(s => s.is_enabled)
    .sort((a, b) => a.position - b.position);

  if (enabledSections.length === 0) return '';

  const items = enabledSections.map((section, index) => {
    const num = showNumbers ? `${index + 1}. ` : '';
    return `<li style="margin-bottom: 8px;">
      <a href="#section-${section.id}" style="color: ${primaryColor}; text-decoration: none;">
        ${num}${escapeHtml(section.title)}
      </a>
    </li>`;
  }).join('');

  return `
    <div style="margin-bottom: 40px; padding: 24px; background: #f9fafb; border-radius: 8px;">
      <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">Table des matières</h2>
      <ol style="margin: 0; padding-left: 20px; list-style: none;">${items}</ol>
    </div>
  `;
}

/**
 * Render markdown-like content to HTML (basic support)
 */
export function renderMarkdown(text: string): string {
  if (!text) return '';

  let html = escapeHtml(text);

  // Bold: **text** or __text__
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');

  // Italic: *text* or _text_
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');

  // Line breaks
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');

  // Wrap in paragraph
  html = `<p>${html}</p>`;

  // Lists (simple)
  html = html.replace(/<p>- (.*?)<br>/g, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)+/g, '<ul>$&</ul>');

  return html;
}

/**
 * Get base document styles
 */
export function getBaseStyles(theme: ProposalTheme): string {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: ${getFontStack(theme.fontFamily)};
      font-size: 14px;
      line-height: 1.6;
      color: #1f2937;
      background: white;
    }

    h1, h2, h3, h4, h5, h6 {
      color: ${theme.primaryColor};
      font-weight: 600;
      line-height: 1.3;
    }

    p {
      margin-bottom: 1em;
    }

    ul, ol {
      margin-bottom: 1em;
      padding-left: 1.5em;
    }

    li {
      margin-bottom: 0.5em;
    }

    a {
      color: ${theme.accentColor};
      text-decoration: none;
    }

    a:hover {
      text-decoration: underline;
    }

    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }

      .page-break {
        page-break-before: always;
      }

      .no-print {
        display: none !important;
      }
    }

    @page {
      margin: 20mm;
      size: A4;
    }
  `;
}

/**
 * Wrap content in HTML document
 */
export function wrapDocument(
  content: string,
  styles: string,
  title: string
): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>${styles}</style>
</head>
<body>
${content}
</body>
</html>`;
}

/**
 * Render page numbers CSS
 */
export function getPageNumberStyles(show: boolean, accentColor: string): string {
  if (!show) return '';

  return `
    @page {
      @bottom-center {
        content: counter(page);
        font-size: 12px;
        color: ${accentColor};
      }
    }
  `;
}

/**
 * Render footer
 */
export function renderFooter(
  footerText: string | undefined,
  showPageNumbers: boolean,
  primaryColor: string
): string {
  if (!footerText && !showPageNumbers) return '';

  return `
    <footer style="
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
    ">
      ${footerText ? `<p style="margin: 0;">${escapeHtml(footerText)}</p>` : ''}
    </footer>
  `;
}

/**
 * Render company header with logo
 */
export function renderCompanyHeader(
  company: { name: string; logoUrl?: string; address?: string; email?: string; phone?: string },
  showLogo: boolean,
  primaryColor: string,
  alignment: 'left' | 'center' | 'right' = 'left'
): string {
  const logoHtml = showLogo && company.logoUrl
    ? `<img src="${company.logoUrl}" alt="${escapeHtml(company.name)}" style="max-height: 60px; max-width: 200px; margin-bottom: 12px;">`
    : `<h1 style="font-size: 24px; font-weight: 700; color: ${primaryColor}; margin-bottom: 8px;">${escapeHtml(company.name)}</h1>`;

  const contactLines: string[] = [];
  if (company.address) contactLines.push(escapeHtml(company.address));
  if (company.email) contactLines.push(escapeHtml(company.email));
  if (company.phone) contactLines.push(escapeHtml(company.phone));

  return `
    <div style="text-align: ${alignment}; margin-bottom: 40px;">
      ${logoHtml}
      ${contactLines.length > 0 ? `<p style="font-size: 13px; color: #6b7280; margin: 0;">${contactLines.join(' | ')}</p>` : ''}
    </div>
  `;
}

/**
 * Render watermark CSS styles
 */
export function getWatermarkStyles(options: ProposalVisualOptions): string {
  if (!options.watermark?.enabled || !options.watermark?.text) return '';

  const opacity = (options.watermark.opacity ?? 10) / 100;
  const text = options.watermark.text;

  return `
    .page-content::before {
      content: "${text}";
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 80px;
      font-weight: bold;
      color: rgba(0, 0, 0, ${opacity});
      pointer-events: none;
      z-index: 1000;
      white-space: nowrap;
      user-select: none;
    }

    @media print {
      .page-content::before {
        position: fixed;
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
    }
  `;
}

/**
 * Render page header with logo (for all pages)
 */
export function renderPageHeader(
  company: { name: string; logoUrl?: string },
  showLogoOnAllPages: boolean,
  position: 'left' | 'right' = 'right'
): string {
  if (!showLogoOnAllPages || !company.logoUrl) return '';

  return `
    <div class="page-header" style="
      position: fixed;
      top: 15px;
      ${position}: 20px;
      z-index: 100;
    ">
      <img
        src="${company.logoUrl}"
        alt="${escapeHtml(company.name)}"
        style="max-height: 30px; max-width: 100px; opacity: 0.8;"
      >
    </div>
  `;
}

/**
 * Get styles for page header (logo on all pages)
 */
export function getPageHeaderStyles(showLogoOnAllPages: boolean): string {
  if (!showLogoOnAllPages) return '';

  return `
    @media print {
      .page-header {
        position: fixed;
        top: 10mm;
        right: 10mm;
      }
    }
  `;
}
