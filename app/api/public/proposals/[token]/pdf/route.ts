import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { createClient } from '@/lib/supabase/server';
import { logTrackingEvent } from '@/lib/tracking/events';
import {
  buildContextFromProposal,
  buildVariableMap,
  renderTemplate,
} from '@/lib/proposals/variables';
import type { ProposalTheme } from '@/lib/types/proposals';

interface RouteContext {
  params: Promise<{ token: string }>;
}

/**
 * GET /api/public/proposals/:token/pdf
 * Generate PDF for a proposal (public access via token)
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    const supabase = await createClient();

    // Get proposal by public token with all necessary data
    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .select(`
        id,
        status,
        title,
        owner_user_id,
        theme_override,
        created_at,
        client:clients(nom, email, telephone, adresse, ville, code_postal, pays),
        deal:deals(title, estimated_amount, currency, description),
        template:proposal_templates(theme),
        sections:proposal_sections(
          id,
          title,
          body,
          position,
          is_enabled
        ),
        variables:proposal_variables(key, value),
        recipients:proposal_recipients(
          contact:contacts(civilite, prenom, nom, email, telephone)
        )
      `)
      .eq('public_token', token)
      .single();

    if (proposalError || !proposal) {
      return NextResponse.json({ error: 'Proposition non trouvée' }, { status: 404 });
    }

    // Don't expose draft proposals publicly
    if (proposal.status === 'DRAFT') {
      return NextResponse.json({ error: 'Proposition non accessible' }, { status: 403 });
    }

    // Get company info
    const { data: company } = await supabase
      .from('companies')
      .select('name, logo_url, email, phone, address, city, postal_code, country, siret, vat_number')
      .eq('user_id', proposal.owner_user_id)
      .single();

    // Handle relations which can be object or array
    const client = Array.isArray(proposal.client) ? proposal.client[0] : proposal.client;
    const deal = Array.isArray(proposal.deal) ? proposal.deal[0] : proposal.deal;
    const template = Array.isArray(proposal.template) ? proposal.template[0] : proposal.template;

    // Generate HTML
    const html = generateProposalHTML(proposal, company, client, deal, template);

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

      // Log tracking event
      const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                       request.headers.get('x-real-ip') ||
                       'unknown';
      const userAgent = request.headers.get('user-agent') || undefined;

      await logTrackingEvent({
        userId: proposal.owner_user_id,
        resourceType: 'proposal',
        resourceId: proposal.id,
        eventType: 'pdf_downloaded',
        ipAddress,
        userAgent,
      });

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
    console.error('GET /api/public/proposals/:token/pdf error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// ============================================================================
// HTML Generation (same as authenticated route)
// ============================================================================

interface ProposalData {
  id: string;
  title: string;
  status: string;
  created_at: string;
  theme_override: ProposalTheme | null;
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
    }[] | {
      civilite?: string | null;
      prenom?: string | null;
      nom?: string | null;
      email?: string | null;
      telephone?: string | null;
    } | null;
  }>;
}

interface ClientData {
  nom?: string | null;
  email?: string | null;
  telephone?: string | null;
  adresse?: string | null;
  ville?: string | null;
  code_postal?: string | null;
  pays?: string | null;
}

interface DealData {
  title?: string | null;
  estimated_amount?: number | null;
  currency?: string | null;
  description?: string | null;
}

interface TemplateData {
  theme?: ProposalTheme | null;
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

function generateProposalHTML(
  proposal: ProposalData,
  company: CompanyData | null,
  client: ClientData | null,
  deal: DealData | null,
  template: TemplateData | null
): string {
  // Build variable context
  const context = buildContextFromProposal({
    variables: proposal.variables || [],
    deal: deal ? {
      title: deal.title || undefined,
      estimated_amount: deal.estimated_amount || undefined,
      currency: deal.currency || undefined,
      description: deal.description || undefined,
    } : undefined,
    client: client ? {
      nom: client.nom || undefined,
      email: client.email || undefined,
      telephone: client.telephone || undefined,
      adresse: client.adresse || undefined,
      ville: client.ville || undefined,
      code_postal: client.code_postal || undefined,
      pays: client.pays || undefined,
    } : undefined,
    recipients: proposal.recipients?.map((r) => {
      const contact = Array.isArray(r.contact) ? r.contact[0] : r.contact;
      return { contact };
    }),
    company: company || undefined,
  });

  const variableMap = buildVariableMap(context);

  // Get theme
  const theme: ProposalTheme = proposal.theme_override || template?.theme || {
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
          <span class="meta-value">${escapeHtml(client?.nom || 'Client')}</span>
        </div>
        <div>
          <span class="meta-label">Date : </span>
          <span>${formatDate(proposal.created_at)}</span>
        </div>
        ${deal?.title ? `
        <div>
          <span class="meta-label">Réf : </span>
          <span>${escapeHtml(deal.title)}</span>
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
