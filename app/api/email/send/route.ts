import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generatePDF } from '@/lib/pdf/generator';
import { sendEmail, generateEmailHTML } from '@/lib/email/sender';
import type { QuoteWithClientAndItems, InvoiceWithClientAndItems } from '@/lib/supabase/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, id, to } = body;

    if (!type || !id || !to) {
      return NextResponse.json(
        { error: 'Paramètres manquants: type, id, to' },
        { status: 400 }
      );
    }

    if (type !== 'quote' && type !== 'invoice') {
      return NextResponse.json(
        { error: 'Type invalide: quote ou invoice' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Vérifier l'authentification
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Récupérer le document
    const table = type === 'invoice' ? 'invoices' : 'quotes';
    const itemsTable = type === 'invoice' ? 'invoice_line_items' : 'quote_line_items';

    const { data: document, error: docError } = await supabase
      .from(table)
      .select(`
        *,
        client:clients(*),
        items:${itemsTable}(*)
      `)
      .eq('id', id)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: `${type === 'invoice' ? 'Facture' : 'Devis'} non trouvé` },
        { status: 404 }
      );
    }

    // Récupérer les infos de l'entreprise
    const { data: company } = await supabase
      .from('companies')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Générer le PDF
    const pdfBuffer = await generatePDF({
      type,
      document: document as QuoteWithClientAndItems | InvoiceWithClientAndItems,
      company,
    });

    // Générer l'email
    const companyName = company?.display_name || 'Mon entreprise';
    const senderName = company?.email_sender_name || company?.display_name || 'Verifolio';
    const replyToEmail = company?.email_reply_to || company?.email || user.email;
    const emailHtml = generateEmailHTML(type, document.numero, companyName);
    const subject = type === 'invoice'
      ? `[Verifolio] Facture ${document.numero} – ${document.client?.nom || companyName}`
      : `[Verifolio] Devis – ${document.client?.nom || companyName}`;

    // Envoyer l'email
    const result = await sendEmail({
      to,
      subject,
      html: emailHtml,
      fromName: senderName,
      replyTo: replyToEmail,
      attachments: [
        {
          filename: `${document.numero}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Erreur envoi email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    });
  } catch (error) {
    console.error('Erreur envoi email:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'envoi de l\'email' },
      { status: 500 }
    );
  }
}
