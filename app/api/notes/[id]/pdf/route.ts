import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { createClient } from '@/lib/supabase/server';
import { getNote } from '@/lib/notes/notes';

// GET /api/notes/[id]/pdf - Export note as PDF
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const result = await getNote(supabase, id);

    if (!result.success || !result.data) {
      return NextResponse.json({ error: 'Note non trouvée' }, { status: 404 });
    }

    const note = result.data;

    // Get company info for branding
    const { data: company } = await supabase
      .from('companies')
      .select('name, display_name, logo_url')
      .eq('user_id', user.id)
      .single();

    // Generate HTML
    const html = generateNoteHTML(note, company);

    // Generate PDF with Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    let pdfBuffer: Buffer;

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

      pdfBuffer = Buffer.from(pdfUint8Array);
    } finally {
      await browser.close();
    }

    // Clean filename
    const filename = `${note.title.replace(/[^a-zA-Z0-9-_À-ÿ\s]/g, '').trim() || 'note'}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error in GET /api/notes/[id]/pdf:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération du PDF' },
      { status: 500 }
    );
  }
}

// ============================================================================
// Note HTML Generation
// ============================================================================

interface NoteData {
  id: string;
  title: string;
  content: string;
  content_json?: unknown;
  color: string;
  created_at: string;
  updated_at: string;
  linked_entities?: Array<{ type: string; id: string; title: string }>;
}

interface CompanyData {
  name?: string | null;
  display_name?: string | null;
  logo_url?: string | null;
}

function generateNoteHTML(note: NoteData, company: CompanyData | null): string {
  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const escapeHtml = (text: string) =>
    text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  const companyName = company?.display_name || company?.name || '';

  // Color mapping for note accent
  const colorMap: Record<string, string> = {
    gray: '#6B7280',
    blue: '#3B82F6',
    green: '#10B981',
    yellow: '#F59E0B',
    red: '#EF4444',
    purple: '#8B5CF6',
    pink: '#EC4899',
    orange: '#F97316',
  };

  const accentColor = colorMap[note.color] || colorMap.gray;

  // Convert TipTap JSON to HTML if available, otherwise use plain content
  const contentHtml = note.content
    ? escapeHtml(note.content).replace(/\n/g, '<br>')
    : '<p>Aucun contenu</p>';

  // Generate linked entities section
  const linkedEntitiesHtml = note.linked_entities?.length
    ? `
      <div class="linked-entities">
        <div class="linked-title">Entités liées</div>
        <div class="linked-list">
          ${note.linked_entities
            .map(
              (e) => `<span class="linked-item">${escapeHtml(e.type)}: ${escapeHtml(e.title)}</span>`
            )
            .join('')}
        </div>
      </div>
    `
    : '';

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(note.title)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; font-size: 11pt; line-height: 1.7; color: #374151; background: white; }
    .document { max-width: 100%; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid ${accentColor}; }
    .company-info { display: flex; align-items: center; gap: 12px; }
    .company-logo { height: 40px; width: auto; }
    .company-name { font-size: 14pt; font-weight: 600; color: #111827; }
    .note-meta { text-align: right; font-size: 9pt; color: #6B7280; }
    .note-title { font-size: 24pt; font-weight: 700; color: #111827; margin-bottom: 20px; padding-left: 16px; border-left: 4px solid ${accentColor}; }
    .linked-entities { margin-bottom: 24px; padding: 16px; background: #F9FAFB; border-radius: 8px; }
    .linked-title { font-size: 10pt; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
    .linked-list { display: flex; flex-wrap: wrap; gap: 8px; }
    .linked-item { display: inline-block; padding: 4px 10px; background: white; border: 1px solid #E5E7EB; border-radius: 4px; font-size: 9pt; color: #374151; }
    .content { font-size: 11pt; line-height: 1.8; color: #374151; }
    .content p { margin-bottom: 12px; }
    .content h1, .content h2, .content h3 { color: #111827; margin-top: 20px; margin-bottom: 12px; }
    .content h1 { font-size: 18pt; }
    .content h2 { font-size: 16pt; }
    .content h3 { font-size: 14pt; }
    .content ul, .content ol { margin-left: 20px; margin-bottom: 12px; }
    .content li { margin-bottom: 6px; }
    .content blockquote { border-left: 3px solid ${accentColor}; padding-left: 16px; margin: 16px 0; color: #6B7280; font-style: italic; }
    .content code { background: #F3F4F6; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 10pt; }
    .content pre { background: #F3F4F6; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 16px 0; }
    .content pre code { background: none; padding: 0; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #E5E7EB; font-size: 9pt; color: #9CA3AF; }
    @media print { body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
  </style>
</head>
<body>
  <div class="document">
    <header class="header">
      <div class="company-info">
        ${company?.logo_url ? `<img src="${company.logo_url}" alt="${escapeHtml(companyName)}" class="company-logo">` : ''}
        ${companyName ? `<div class="company-name">${escapeHtml(companyName)}</div>` : ''}
      </div>
      <div class="note-meta">
        Créé le ${formatDate(note.created_at)}<br>
        Modifié le ${formatDate(note.updated_at)}
      </div>
    </header>

    <h1 class="note-title">${escapeHtml(note.title)}</h1>

    ${linkedEntitiesHtml}

    <div class="content">
      ${contentHtml}
    </div>

    <footer class="footer">
      Note exportée depuis Verifolio
    </footer>
  </div>
</body>
</html>
  `.trim();
}
