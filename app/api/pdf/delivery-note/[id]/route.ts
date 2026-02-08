import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { createClient } from '@/lib/supabase/server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/pdf/delivery-note/:id
 * Generate PDF for a delivery note
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

    // Get delivery note with related data
    const { data: deliveryNote, error: dnError } = await supabase
      .from('delivery_notes')
      .select(`
        id,
        delivery_note_number,
        title,
        status,
        created_at,
        sent_at,
        mission:missions(id, title),
        client:clients(nom, email, telephone, adresse, ville, code_postal, pays)
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (dnError || !deliveryNote) {
      return NextResponse.json({ error: 'Bon de livraison introuvable' }, { status: 404 });
    }

    // Get company info
    const { data: company } = await supabase
      .from('companies')
      .select('name, display_name, logo_url, email, phone, address, city, postal_code, country, siret, vat_number')
      .eq('user_id', user.id)
      .single();

    // Handle Supabase relation format
    const mission = Array.isArray(deliveryNote.mission) ? deliveryNote.mission[0] : deliveryNote.mission;
    const client = Array.isArray(deliveryNote.client) ? deliveryNote.client[0] : deliveryNote.client;

    // Generate HTML
    const html = generateDeliveryNoteHTML(deliveryNote, company, mission, client);

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
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm',
        },
      });

      // Convert to Buffer for NextResponse
      const pdfBuffer = Buffer.from(pdfUint8Array);

      // Clean filename
      const filename = `${deliveryNote.delivery_note_number}.pdf`;

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
    console.error('GET /api/pdf/delivery-note/:id error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// ============================================================================
// HTML Generation
// ============================================================================

interface DeliveryNoteData {
  id: string;
  delivery_note_number: string;
  title: string;
  status: string;
  created_at: string;
  sent_at?: string | null;
}

interface MissionData {
  id?: string;
  title?: string | null;
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

interface CompanyData {
  name?: string | null;
  display_name?: string | null;
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

function generateDeliveryNoteHTML(
  deliveryNote: DeliveryNoteData,
  company: CompanyData | null,
  mission: MissionData | null,
  client: ClientData | null
): string {
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

  // Company name
  const companyName = company?.display_name || company?.name || '';

  // Company address
  const companyAddress = company
    ? [company.address, company.postal_code, company.city, company.country]
        .filter(Boolean)
        .join(', ')
    : '';

  // Client address
  const clientAddress = client
    ? [client.adresse, client.code_postal, client.ville, client.pays]
        .filter(Boolean)
        .join(', ')
    : '';

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bon de livraison ${escapeHtml(deliveryNote.delivery_note_number)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Inter', sans-serif;
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
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #E5E7EB;
    }

    .company-info {
      display: flex;
      align-items: flex-start;
      gap: 16px;
    }

    .company-logo {
      height: 60px;
      width: auto;
    }

    .company-name {
      font-size: 18pt;
      font-weight: 700;
      color: #111827;
      margin-bottom: 4px;
    }

    .company-contact {
      font-size: 9pt;
      color: #6B7280;
      line-height: 1.5;
    }

    .document-info {
      text-align: right;
    }

    .document-type {
      font-size: 24pt;
      font-weight: 700;
      color: #111827;
      margin-bottom: 8px;
    }

    .document-number {
      font-size: 14pt;
      font-weight: 600;
      color: #3B82F6;
      margin-bottom: 8px;
    }

    .document-date {
      font-size: 10pt;
      color: #6B7280;
    }

    /* Client section */
    .client-section {
      display: flex;
      gap: 40px;
      margin-bottom: 40px;
    }

    .client-block {
      flex: 1;
      padding: 20px;
      background: #F9FAFB;
      border-radius: 8px;
    }

    .block-title {
      font-size: 10pt;
      font-weight: 600;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
    }

    .client-name {
      font-size: 14pt;
      font-weight: 600;
      color: #111827;
      margin-bottom: 8px;
    }

    .client-details {
      font-size: 10pt;
      color: #6B7280;
      line-height: 1.6;
    }

    /* Content */
    .content-section {
      margin-bottom: 40px;
    }

    .content-title {
      font-size: 12pt;
      font-weight: 600;
      color: #111827;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #E5E7EB;
    }

    .content-body {
      padding: 20px;
      background: #F9FAFB;
      border-radius: 8px;
      border-left: 4px solid #3B82F6;
    }

    .delivery-title {
      font-size: 14pt;
      font-weight: 500;
      color: #111827;
    }

    .mission-ref {
      font-size: 10pt;
      color: #6B7280;
      margin-top: 8px;
    }

    /* Signature section */
    .signature-section {
      margin-top: 60px;
      padding: 30px;
      border: 2px dashed #E5E7EB;
      border-radius: 8px;
    }

    .signature-title {
      font-size: 12pt;
      font-weight: 600;
      color: #111827;
      margin-bottom: 20px;
      text-align: center;
    }

    .signature-row {
      display: flex;
      justify-content: space-between;
      gap: 40px;
    }

    .signature-box {
      flex: 1;
    }

    .signature-label {
      font-size: 10pt;
      color: #6B7280;
      margin-bottom: 8px;
    }

    .signature-line {
      height: 60px;
      border-bottom: 1px solid #9CA3AF;
    }

    .signature-date {
      font-size: 9pt;
      color: #9CA3AF;
      margin-top: 8px;
    }

    /* Footer */
    .footer {
      margin-top: 60px;
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
    }
  </style>
</head>
<body>
  <div class="document">
    <!-- Header -->
    <header class="header">
      <div class="company-info">
        ${company?.logo_url ? `<img src="${company.logo_url}" alt="${escapeHtml(companyName)}" class="company-logo">` : ''}
        <div>
          ${companyName ? `<div class="company-name">${escapeHtml(companyName)}</div>` : ''}
          <div class="company-contact">
            ${company?.email ? `${escapeHtml(company.email)}<br>` : ''}
            ${company?.phone ? `${escapeHtml(company.phone)}` : ''}
          </div>
        </div>
      </div>
      <div class="document-info">
        <div class="document-type">BON DE LIVRAISON</div>
        <div class="document-number">${escapeHtml(deliveryNote.delivery_note_number)}</div>
        <div class="document-date">
          Date : ${formatDate(deliveryNote.created_at)}
        </div>
      </div>
    </header>

    <!-- Client section -->
    <div class="client-section">
      <div class="client-block">
        <div class="block-title">Destinataire</div>
        ${client?.nom ? `<div class="client-name">${escapeHtml(client.nom)}</div>` : ''}
        <div class="client-details">
          ${clientAddress ? `${escapeHtml(clientAddress)}<br>` : ''}
          ${client?.email ? `${escapeHtml(client.email)}<br>` : ''}
          ${client?.telephone ? `${escapeHtml(client.telephone)}` : ''}
        </div>
      </div>
    </div>

    <!-- Content section -->
    <div class="content-section">
      <div class="content-title">Objet de la livraison</div>
      <div class="content-body">
        <div class="delivery-title">${escapeHtml(deliveryNote.title)}</div>
        ${mission?.title ? `<div class="mission-ref">Mission : ${escapeHtml(mission.title)}</div>` : ''}
      </div>
    </div>

    <!-- Signature section -->
    <div class="signature-section">
      <div class="signature-title">Bon pour accord et réception</div>
      <div class="signature-row">
        <div class="signature-box">
          <div class="signature-label">Date de réception :</div>
          <div class="signature-line"></div>
          <div class="signature-date">___ / ___ / ______</div>
        </div>
        <div class="signature-box">
          <div class="signature-label">Nom et signature du destinataire :</div>
          <div class="signature-line"></div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <footer class="footer">
      <div class="footer-content">
        <div>
          ${companyName ? `<span>${escapeHtml(companyName)}</span>` : ''}
          ${company?.siret ? ` • SIRET : ${escapeHtml(company.siret)}` : ''}
        </div>
        <div>
          Bon de livraison émis le ${formatDate(deliveryNote.created_at)}
        </div>
      </div>
      ${companyAddress ? `<div class="footer-address">${escapeHtml(companyAddress)}</div>` : ''}
    </footer>
  </div>
</body>
</html>
  `.trim();
}
