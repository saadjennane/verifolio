import type { RenderContext } from '@/lib/render/buildRenderContext';
import type { PresetColors } from './types';

// ============================================================================
// Currency Configuration
// ============================================================================

export interface CurrencyConfig {
  code: string;
  symbol: string;
  locale: string;
  supportsLetters: boolean;
}

export const CURRENCIES: Record<string, CurrencyConfig> = {
  MAD: { code: 'MAD', symbol: 'DH', locale: 'fr-MA', supportsLetters: true },
  EUR: { code: 'EUR', symbol: '€', locale: 'fr-FR', supportsLetters: true },
  USD: { code: 'USD', symbol: '$', locale: 'en-US', supportsLetters: false },
  GBP: { code: 'GBP', symbol: '£', locale: 'en-GB', supportsLetters: false },
  CHF: { code: 'CHF', symbol: 'CHF', locale: 'fr-CH', supportsLetters: false },
};

// ============================================================================
// Formatting Utilities
// ============================================================================

export function getCurrency(context: RenderContext): CurrencyConfig {
  const code = context.company?.default_currency || 'EUR';
  return CURRENCIES[code] || CURRENCIES.EUR;
}

export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, char => map[char] || char);
}

export function formatCurrency(amount: number, currency: CurrencyConfig): string {
  return new Intl.NumberFormat(currency.locale, {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + ' ' + currency.symbol;
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('fr-FR').format(num);
}

export function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateStr;
  }
}

// ============================================================================
// Number to Words (French)
// ============================================================================

export function numberToWords(amount: number, currencyCode: string): string {
  if (amount < 0 || amount >= 1000000000) return '';

  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const tens = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

  const currencyNames: Record<string, { singular: string; plural: string; cents: string }> = {
    MAD: { singular: 'dirham', plural: 'dirhams', cents: 'centimes' },
    EUR: { singular: 'euro', plural: 'euros', cents: 'centimes' },
  };

  const curr = currencyNames[currencyCode];
  if (!curr) return '';

  const intPart = Math.floor(amount);
  const decPart = Math.round((amount - intPart) * 100);

  function convertHundreds(n: number): string {
    if (n === 0) return '';
    if (n < 10) return units[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) {
      const t = Math.floor(n / 10);
      const u = n % 10;
      if (t === 7 || t === 9) {
        if (u < 10) {
          return tens[t] + (u === 1 && t === 7 ? '-et-' : '-') + teens[u];
        }
      }
      if (t === 8 && u === 0) return 'quatre-vingts';
      if (u === 1 && t < 8) return tens[t] + '-et-un';
      if (u === 0) return tens[t];
      return tens[t] + '-' + units[u];
    }
    const h = Math.floor(n / 100);
    const rest = n % 100;
    let result = h === 1 ? 'cent' : units[h] + ' cent';
    if (rest === 0 && h > 1) result += 's';
    if (rest > 0) result += ' ' + convertHundreds(rest);
    return result;
  }

  function convertThousands(n: number): string {
    if (n === 0) return 'zéro';
    if (n < 1000) return convertHundreds(n);

    const thousands = Math.floor(n / 1000);
    const rest = n % 1000;

    let result = '';
    if (thousands === 1) {
      result = 'mille';
    } else if (thousands > 1) {
      result = convertHundreds(thousands) + ' mille';
    }

    if (rest > 0) {
      result += ' ' + convertHundreds(rest);
    }

    return result.trim();
  }

  function convertMillions(n: number): string {
    if (n < 1000000) return convertThousands(n);

    const millions = Math.floor(n / 1000000);
    const rest = n % 1000000;

    let result = '';
    if (millions === 1) {
      result = 'un million';
    } else {
      result = convertThousands(millions) + ' millions';
    }

    if (rest > 0) {
      result += ' ' + convertThousands(rest);
    }

    return result.trim();
  }

  let result = convertMillions(intPart);
  result += ' ' + (intPart === 1 ? curr.singular : curr.plural);

  if (decPart > 0) {
    result += ' et ' + convertHundreds(decPart) + ' ' + curr.cents;
  }

  // Capitalize first letter
  return result.charAt(0).toUpperCase() + result.slice(1);
}

// ============================================================================
// Font Stack
// ============================================================================

export function getFontStack(fontFamily: PresetColors['fontFamily']): string {
  switch (fontFamily) {
    case 'serif':
      return "'Georgia', 'Times New Roman', serif";
    case 'mono':
      return "'Courier New', 'Monaco', monospace";
    default:
      return "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
  }
}

// ============================================================================
// Color Utilities
// ============================================================================

export function hexToRgba(hex: string, alpha: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ============================================================================
// Dynamic Fields Renderer
// ============================================================================

export function renderDynamicFields(
  context: RenderContext,
  scope: 'company' | 'client' | 'document',
  hiddenKeys: string[] = []
): string {
  const values = context.fields[scope];
  const definitions = context.fieldDefinitions[scope];

  const fields: string[] = [];

  for (const [key, value] of Object.entries(values)) {
    if (!value) continue;
    if (hiddenKeys.includes(key)) continue;

    const def = definitions[key];
    const label = def?.label || key;

    fields.push(`
      <div class="dynamic-field">
        <span class="dynamic-field-label">${escapeHtml(label)} :</span>
        <span class="dynamic-field-value">${escapeHtml(value)}</span>
      </div>
    `);
  }

  return fields.join('\n');
}

// ============================================================================
// Common HTML Structure
// ============================================================================

export function wrapDocument(
  title: string,
  styles: string,
  content: string
): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
${styles}
  </style>
</head>
<body>
  ${content}

  <!-- Interactive zone selection script -->
  <script>
    (function() {
      const zones = document.querySelectorAll('.zone[data-zone]');
      zones.forEach(function(zone) {
        zone.addEventListener('click', function(e) {
          e.stopPropagation();
          zones.forEach(function(z) { z.classList.remove('selected'); });
          zone.classList.add('selected');
          window.parent.postMessage({
            type: 'zone-click',
            zone: zone.dataset.zone,
            x: e.clientX,
            y: e.clientY
          }, '*');
        });
      });
      document.body.addEventListener('click', function(e) {
        if (!e.target.closest('.zone[data-zone]')) {
          zones.forEach(function(z) { z.classList.remove('selected'); });
          window.parent.postMessage({ type: 'zone-deselect' }, '*');
        }
      });
    })();
  </script>
</body>
</html>
  `.trim();
}

// ============================================================================
// Common Reset Styles
// ============================================================================

export function getResetStyles(): string {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
  `;
}

// ============================================================================
// Common Zone Interactive Styles
// ============================================================================

export function getZoneInteractiveStyles(): string {
  return `
    .zone[data-zone] {
      position: relative;
      cursor: pointer;
      transition: outline 0.15s ease;
      border-radius: 4px;
    }

    .zone[data-zone]:hover {
      outline: 1px dashed #94a3b8;
      outline-offset: 4px;
    }

    .zone[data-zone].selected {
      outline: 2px solid #3b82f6;
      outline-offset: 4px;
    }
  `;
}

// ============================================================================
// Print Styles
// ============================================================================

export function getPrintStyles(): string {
  return `
    @media print {
      body {
        background: none;
      }
      .document {
        padding: 10mm 15mm;
        max-width: none;
        width: 100%;
      }
    }

    @page {
      size: A4;
      margin: 0;
    }
  `;
}
