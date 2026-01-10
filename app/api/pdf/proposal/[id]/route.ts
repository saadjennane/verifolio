import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { createClient } from '@/lib/supabase/server';
import { getProposal } from '@/lib/proposals';
import {
  buildContextFromProposal,
  buildVariableMap,
  renderTemplate,
} from '@/lib/proposals/variables';
import type { ProposalTheme } from '@/lib/types/proposals';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/pdf/proposal/:id
 * Generate PDF for a proposal
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Get proposal
    const proposal = await getProposal(supabase, user.id, id);
    if (!proposal) {
      return NextResponse.json({ error: 'Proposition non trouvée' }, { status: 404 });
    }

    // Get company info
    const { data: company } = await supabase
      .from('companies')
      .select('name, logo_url, email, phone, address, city, postal_code, country, siret, vat_number')
      .eq('user_id', user.id)
      .single();

    // Generate HTML
    const html = generateProposalHTML(proposal, company);

    // Generate PDF with Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfUint8Array = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '15mm',
          right: '15mm',
          bottom: '15mm',
          left: '15mm',
        },
      });

      // Convert to Buffer for NextResponse
      const pdfBuffer = Buffer.from(pdfUint8Array);

      // Clean filename
      const filename = `proposition-${proposal.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.pdf`;

      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error('GET /api/pdf/proposal/:id error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// ============================================================================
// HTML Generation
// ============================================================================

interface ProposalData {
  id: string;
  title: string;
  status: string;
  created_at: string;
  theme_override: ProposalTheme | null;
  template?: { theme?: ProposalTheme } | null;
  client?: { nom: string; email?: string | null } | null;
  deal?: { title: string; estimated_amount?: number; currency?: string; description?: string } | null;
  sections?: Array<{
    id: string;
    title: string;
    body: string;
    position: number;
    is_enabled: boolean;
  }>;
  variables?: Array<{ key: string; value: string }>;
  recipients?: Array<{
    contact?: {
      civilite?: string | null;
      prenom?: string | null;
      nom?: string | null;
      email?: string | null;
      telephone?: string | null;
    } | null;
  }>;
}

interface CompanyData {
  name?: string | null;
  logo_url?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  country?: string | null;
  siret?: string | null;
  vat_number?: string | null;
}

function generateProposalHTML(proposal: ProposalData, company: CompanyData | null): string {
  // Build variable context
  const context = buildContextFromProposal({
    variables: proposal.variables || [],
    deal: proposal.deal ? {
      title: proposal.deal.title,
      estimated_amount: proposal.deal.estimated_amount,
      currency: proposal.deal.currency,
      description: proposal.deal.description,
    } : undefined,
    client: proposal.client ? {
      nom: proposal.client.nom,
      email: proposal.client.email,
    } : undefined,
    recipients: proposal.recipients?.map((r) => ({ contact: r.contact })),
    company: company || undefined,
  });

  const variableMap = buildVariableMap(context);

  // Get theme
  const theme: ProposalTheme = proposal.theme_override || proposal.template?.theme || {
    primaryColor: '#111111',
    accentColor: '#3B82F6',
    font: 'Inter',
  };

  // Get enabled sections
  const sections = (proposal.sections || [])
    .filter((s) => s.is_enabled)
    .sort((a, b) => a.position - b.position);

  // Interpolate function
  const interpolate = (text: string) => renderTemplate(text, variableMap);

  // Format date
  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

  // Escape HTML
  const escapeHtml = (text: string) =>
    text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  // Generate sections HTML
  const sectionsHtml = sections
    .map(
      (section) => `
      <section class="section">
        <h2 style="color: ${theme.accentColor}; border-color: ${theme.accentColor}30;">
          ${escapeHtml(interpolate(section.title))}
        </h2>
        <div class="section-body">
          ${escapeHtml(interpolate(section.body)).replace(/\n/g, '<br>')}
        </div>
      </section>
    `
    )
    .join('');

  // Company address
  const companyAddress = company
    ? [company.address, company.postal_code, company.city, company.country]
        .filter(Boolean)
        .join(', ')
    : '';

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(proposal.title)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: '${theme.font}', 'Inter', sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #374151;
      background: white;
    }

    .document {
      max-width: 100%;
      margin: 0 auto;
    }

    /* Header */
    .header {
      padding: 30px 0;
      border-bottom: 4px solid ${theme.accentColor};
      margin-bottom: 30px;
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .company-info {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .company-logo {
      height: 50px;
      width: auto;
    }

    .company-name {
      font-size: 18pt;
      font-weight: 600;
      color: #111827;
    }

    .company-contact {
      font-size: 9pt;
      color: #6B7280;
    }

    /* Title section */
    .title-section {
      background: #F9FAFB;
      padding: 24px;
      margin-bottom: 30px;
      border-radius: 4px;
    }

    .proposal-title {
      font-size: 20pt;
      font-weight: 700;
      color: ${theme.primaryColor};
      margin-bottom: 12px;
    }

    .proposal-meta {
      display: flex;
      gap: 24px;
      font-size: 10pt;
      color: #6B7280;
    }

    .meta-label {
      color: #9CA3AF;
    }

    .meta-value {
      font-weight: 500;
      color: #111827;
    }

    /* Sections */
    .section {
      margin-bottom: 30px;
      page-break-inside: avoid;
    }

    .section h2 {
      font-size: 14pt;
      font-weight: 600;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid;
    }

    .section-body {
      color: #374151;
      line-height: 1.7;
    }

    /* Footer */
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #E5E7EB;
      font-size: 9pt;
      color: #6B7280;
    }

    .footer-content {
      display: flex;
      justify-content: space-between;
    }

    .footer-address {
      margin-top: 8px;
      font-size: 8pt;
      color: #9CA3AF;
    }

    @media print {
      body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      .section {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="document">
    <!-- Header -->
    <header class="header">
      <div class="header-content">
        <div class="company-info">
          ${company?.logo_url ? `<img src="${company.logo_url}" alt="${escapeHtml(company.name || '')}" class="company-logo">` : ''}
          <div>
            ${company?.name ? `<div class="company-name">${escapeHtml(company.name)}</div>` : ''}
            <div class="company-contact">
              ${company?.email ? `${escapeHtml(company.email)}` : ''}
              ${company?.phone ? ` • ${escapeHtml(company.phone)}` : ''}
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Title -->
    <div class="title-section">
      <h1 class="proposal-title">${escapeHtml(interpolate(proposal.title))}</h1>
      <div class="proposal-meta">
        <div>
          <span class="meta-label">Pour : </span>
          <span class="meta-value">${escapeHtml(proposal.client?.nom || 'Client')}</span>
        </div>
        <div>
          <span class="meta-label">Date : </span>
          <span>${formatDate(proposal.created_at)}</span>
        </div>
        ${proposal.deal ? `
        <div>
          <span class="meta-label">Réf : </span>
          <span>${escapeHtml(proposal.deal.title)}</span>
        </div>
        ` : ''}
      </div>
    </div>

    <!-- Sections -->
    ${sectionsHtml}

    <!-- Footer -->
    <footer class="footer">
      <div class="footer-content">
        <div>
          ${company?.name ? `<span>${escapeHtml(company.name)}</span>` : ''}
          ${company?.siret ? ` • SIRET : ${escapeHtml(company.siret)}` : ''}
        </div>
        <div>
          Proposition émise le ${formatDate(proposal.created_at)}
        </div>
      </div>
      ${companyAddress ? `<div class="footer-address">${escapeHtml(companyAddress)}</div>` : ''}
    </footer>
  </div>
</body>
</html>
  `.trim();
}
