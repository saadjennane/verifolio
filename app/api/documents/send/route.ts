import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generatePDF } from '@/lib/pdf/generator';
import { sendEmail, generateEmailHTML } from '@/lib/email/sender';
import type { QuoteWithClientAndItems, InvoiceWithClientAndItems } from '@/lib/supabase/types';

interface SendDocumentBody {
  docType: 'quote' | 'invoice' | 'proposal' | 'review_request';
  documentId: string;
  entityType: 'deal' | 'mission' | 'client';
  entityId: string;
  contactIds: string[];
  message?: string;
}

export async function POST(request: Request) {
  try {
    const body: SendDocumentBody = await request.json();
    const { docType, documentId, entityType, entityId, contactIds, message } = body;

    // Validation des paramètres
    if (!docType || !documentId || !entityType || !entityId || !contactIds?.length) {
      return NextResponse.json(
        { error: 'Paramètres manquants' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Vérifier l'authentification
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Récupérer les contacts avec leurs emails
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('id, email, nom, prenom, civilite')
      .in('id', contactIds);

    if (contactsError || !contacts?.length) {
      return NextResponse.json(
        { error: 'Contacts non trouvés' },
        { status: 404 }
      );
    }

    // Filtrer les contacts avec email
    const contactsWithEmail = contacts.filter((c) => c.email);
    if (contactsWithEmail.length === 0) {
      return NextResponse.json(
        { error: 'Aucun contact avec email' },
        { status: 400 }
      );
    }

    const recipientEmails = contactsWithEmail.map((c) => c.email as string);

    // Récupérer le document selon le type
    let document: QuoteWithClientAndItems | InvoiceWithClientAndItems | null = null;
    let pdfBuffer: Buffer | null = null;
    let subject = '';

    // Récupérer les infos de l'entreprise
    const { data: company } = await supabase
      .from('companies')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const companyName = company?.display_name || 'Mon entreprise';
    // Email sender settings
    const senderName = company?.email_sender_name || company?.display_name || 'Verifolio';
    const replyToEmail = company?.email_reply_to || company?.email || user.email;

    if (docType === 'quote') {
      // SÉCURITÉ: Filtrer par user_id pour empêcher l'accès aux devis d'autres utilisateurs
      const { data: quote, error } = await supabase
        .from('quotes')
        .select(`*, client:clients(*), items:quote_line_items(*)`)
        .eq('id', documentId)
        .eq('user_id', user.id)
        .single();

      if (error || !quote) {
        return NextResponse.json({ error: 'Devis non trouvé' }, { status: 404 });
      }

      document = quote as QuoteWithClientAndItems;
      pdfBuffer = await generatePDF({ type: 'quote', document, company });
      subject = `Devis ${quote.numero} - ${companyName}`;

    } else if (docType === 'invoice') {
      // SÉCURITÉ: Filtrer par user_id pour empêcher l'accès aux factures d'autres utilisateurs
      const { data: invoice, error } = await supabase
        .from('invoices')
        .select(`*, client:clients(*), items:invoice_line_items(*)`)
        .eq('id', documentId)
        .eq('user_id', user.id)
        .single();

      if (error || !invoice) {
        return NextResponse.json({ error: 'Facture non trouvée' }, { status: 404 });
      }

      document = invoice as InvoiceWithClientAndItems;
      pdfBuffer = await generatePDF({ type: 'invoice', document, company });
      subject = `Facture ${invoice.numero} - ${companyName}`;

    } else if (docType === 'proposal') {
      // Pour les propositions, on n'envoie pas de PDF pour l'instant
      // On envoie juste un lien vers la proposition
      // SÉCURITÉ: Filtrer par user_id pour empêcher l'accès aux propositions d'autres utilisateurs
      const { data: proposal, error } = await supabase
        .from('proposals')
        .select(`*, client:clients(*)`)
        .eq('id', documentId)
        .eq('user_id', user.id)
        .single();

      if (error || !proposal) {
        return NextResponse.json({ error: 'Proposition non trouvée' }, { status: 404 });
      }

      subject = `Proposition commerciale - ${companyName}`;

    } else if (docType === 'review_request') {
      // Pour les review requests, on utilise le système existant
      subject = `Demande d'avis - ${companyName}`;
    }

    // Créer l'entrée dans outbound_messages AVANT l'envoi
    const { data: outboundMessage, error: createError } = await supabase
      .from('outbound_messages')
      .insert({
        user_id: user.id,
        entity_type: entityType,
        entity_id: entityId,
        doc_type: docType,
        document_id: documentId,
        recipient_contact_ids: contactIds,
        recipient_emails: recipientEmails,
        status: 'pending',
        subject,
        message: message || null,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating outbound message:', createError);
      // On continue quand même l'envoi
    }

    // Préparer le contenu de l'email
    let emailHtml = '';
    if (docType === 'quote' || docType === 'invoice') {
      emailHtml = generateEmailHTML(docType, document?.numero || '', companyName);
      if (message) {
        emailHtml = emailHtml.replace('</body>', `<p style="margin-top: 20px; white-space: pre-wrap;">${message}</p></body>`);
      }
    } else {
      // Email simple pour proposal/review_request
      emailHtml = `
        <html>
          <body style="font-family: Arial, sans-serif; color: #333;">
            <p>Bonjour,</p>
            ${message ? `<p style="white-space: pre-wrap;">${message}</p>` : ''}
            <p>Cordialement,<br/>${companyName}</p>
          </body>
        </html>
      `;
    }

    // Envoyer l'email
    const attachments = pdfBuffer ? [
      {
        filename: `${document?.numero || 'document'}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ] : [];

    // Envoyer à tous les destinataires
    const result = await sendEmail({
      to: recipientEmails.join(', '),
      subject,
      html: emailHtml,
      fromName: senderName,
      replyTo: replyToEmail,
      attachments,
    });

    // Mettre à jour le statut dans outbound_messages
    if (outboundMessage) {
      await supabase
        .from('outbound_messages')
        .update({
          status: result.success ? 'sent' : 'failed',
          sent_at: result.success ? new Date().toISOString() : null,
          error_message: result.success ? null : (result.error || 'Erreur inconnue'),
        })
        .eq('id', outboundMessage.id);
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Erreur envoi email' },
        { status: 500 }
      );
    }

    // Mettre à jour le statut du document si c'est un devis ou facture
    // SÉCURITÉ: Inclure user_id dans les updates pour garantir l'isolation
    if (docType === 'quote' && document) {
      await supabase
        .from('quotes')
        .update({ status: 'sent' })
        .eq('id', documentId)
        .eq('user_id', user.id)
        .eq('status', 'brouillon');
    } else if (docType === 'invoice' && document) {
      await supabase
        .from('invoices')
        .update({ status: 'sent' })
        .eq('id', documentId)
        .eq('user_id', user.id)
        .eq('status', 'brouillon');
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      recipientCount: contactsWithEmail.length,
    });

  } catch (error) {
    console.error('Erreur envoi document:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'envoi du document' },
      { status: 500 }
    );
  }
}
