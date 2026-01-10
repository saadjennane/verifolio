/**
 * API publique pour télécharger un PDF
 * GET /api/public/pdf?type=quote|invoice&token=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPublicLinkByToken } from '@/lib/tracking/public-links';
import { logTrackingEvent } from '@/lib/tracking/events';
import { generatePDF } from '@/lib/pdf/generator';
import { headers } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') as 'quote' | 'invoice';
    const token = searchParams.get('token');

    // Validation
    if (!type || !token) {
      return NextResponse.json(
        { error: 'Paramètres manquants: type et token requis' },
        { status: 400 }
      );
    }

    if (type !== 'quote' && type !== 'invoice') {
      return NextResponse.json(
        { error: 'Type invalide: quote ou invoice attendu' },
        { status: 400 }
      );
    }

    // Vérifier le lien public
    const { link, error } = await getPublicLinkByToken(token);

    if (error || !link) {
      return NextResponse.json(
        { error: 'Lien invalide ou expiré' },
        { status: 404 }
      );
    }

    // Vérifier que le type correspond
    if (link.resource_type !== type) {
      return NextResponse.json(
        { error: 'Type de document incorrect' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Récupérer le document
    let document;
    let filename;

    if (type === 'quote') {
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .select('*, client:clients(*), items:quote_line_items(*)')
        .eq('id', link.resource_id)
        .single();

      if (quoteError || !quote) {
        return NextResponse.json({ error: 'Devis non trouvé' }, { status: 404 });
      }

      document = quote;
      filename = `${quote.numero}.pdf`;
    } else {
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('*, client:clients(*), items:invoice_line_items(*)')
        .eq('id', link.resource_id)
        .single();

      if (invoiceError || !invoice) {
        return NextResponse.json({ error: 'Facture non trouvée' }, { status: 404 });
      }

      document = invoice;
      filename = `${invoice.numero}.pdf`;
    }

    // Récupérer les infos de l'entreprise
    const { data: company } = await supabase
      .from('companies')
      .select('*')
      .eq('user_id', link.user_id)
      .single();

    // Générer le PDF
    const pdfBuffer = await generatePDF({
      type,
      document,
      company,
    });

    // Logger l'événement de téléchargement
    const headersList = await headers();
    const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0] || headersList.get('x-real-ip');
    const userAgent = headersList.get('user-agent');

    await logTrackingEvent({
      userId: link.user_id,
      resourceType: type,
      resourceId: link.resource_id,
      eventType: 'pdf_downloaded',
      publicLinkId: link.id,
      metadata: { token },
      ipAddress: ipAddress || undefined,
      userAgent: userAgent || undefined,
    });

    // Retourner le PDF (convertir Buffer en Uint8Array pour NextResponse)
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('[PublicPDF] Error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération du PDF' },
      { status: 500 }
    );
  }
}
