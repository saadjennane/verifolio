/**
 * API Send - Endpoint unifié pour l'envoi de tous types de documents
 * POST /api/send
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/sender';
import { generateSendEmailHTML, getDefaultSubject } from '@/lib/email/templates';
import { getOrCreatePublicLink, buildPublicUrl } from '@/lib/tracking/public-links';
import { logTrackingEvent } from '@/lib/tracking/events';
import { generatePDF } from '@/lib/pdf/generator';
import type { ResourceType, SendRequest, SendResult, EmailTemplateVariables } from '@/lib/send/types';
import { DOCUMENT_SEND_CONFIGS } from '@/lib/send/types';

// ============================================================================
// TYPES
// ============================================================================

interface SendRequestBody extends SendRequest {
  subject?: string;
  custom_message?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

async function getResourceData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  resourceType: ResourceType,
  resourceId: string,
  userId: string
) {
  switch (resourceType) {
    case 'brief': {
      const { data } = await supabase
        .from('briefs')
        .select('*, client:clients(nom)')
        .eq('id', resourceId)
        .eq('user_id', userId)
        .single();
      return data ? { ...data, client_name: data.client?.nom } : null;
    }

    case 'proposal': {
      const { data } = await supabase
        .from('proposals')
        .select('*, deal:deals(titre, client:clients(nom))')
        .eq('id', resourceId)
        .eq('user_id', userId)
        .single();
      return data ? {
        ...data,
        deal_title: data.deal?.titre,
        client_name: data.deal?.client?.nom,
      } : null;
    }

    case 'quote': {
      const { data } = await supabase
        .from('quotes')
        .select('*, client:clients(*), items:quote_line_items(*)')
        .eq('id', resourceId)
        .eq('user_id', userId)
        .single();
      return data ? { ...data, quote_number: data.numero, client_name: data.client?.nom } : null;
    }

    case 'invoice': {
      const { data } = await supabase
        .from('invoices')
        .select('*, client:clients(*), items:invoice_line_items(*)')
        .eq('id', resourceId)
        .eq('user_id', userId)
        .single();
      return data ? { ...data, invoice_number: data.numero, client_name: data.client?.nom } : null;
    }

    case 'review_request': {
      const { data } = await supabase
        .from('review_requests')
        .select('*, mission:missions(titre, client:clients(nom))')
        .eq('id', resourceId)
        .eq('user_id', userId)
        .single();
      return data ? {
        ...data,
        mission_title: data.mission?.titre,
        client_name: data.mission?.client?.nom,
      } : null;
    }

    default:
      return null;
  }
}

async function updateResourceStatus(
  supabase: Awaited<ReturnType<typeof createClient>>,
  resourceType: ResourceType,
  resourceId: string
) {
  const config = DOCUMENT_SEND_CONFIGS[resourceType];
  if (!config.status_after_send) return;

  const tableName = {
    brief: 'briefs',
    proposal: 'proposals',
    quote: 'quotes',
    invoice: 'invoices',
    review_request: 'review_requests',
  }[resourceType];

  await supabase
    .from(tableName)
    .update({ status: config.status_after_send })
    .eq('id', resourceId);
}

// ============================================================================
// POST HANDLER
// ============================================================================

export async function POST(request: Request) {
  try {
    const body: SendRequestBody = await request.json();
    const {
      resource_type,
      resource_id,
      to_emails,
      subject: customSubject,
      custom_message,
      attach_pdf,
      contact_ids,
    } = body;

    // Validation des paramètres
    if (!resource_type || !resource_id || !to_emails?.length) {
      return NextResponse.json(
        { error: 'Paramètres manquants: resource_type, resource_id, to_emails requis' },
        { status: 400 }
      );
    }

    // Vérifier que le type est valide
    if (!DOCUMENT_SEND_CONFIGS[resource_type]) {
      return NextResponse.json(
        { error: `Type de ressource invalide: ${resource_type}` },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Vérifier l'authentification
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Récupérer la ressource
    const resource = await getResourceData(supabase, resource_type, resource_id, user.id);
    if (!resource) {
      return NextResponse.json(
        { error: `${resource_type} non trouvé ou accès refusé` },
        { status: 404 }
      );
    }

    // Récupérer les infos de l'entreprise et de l'utilisateur
    const { data: company } = await supabase
      .from('companies')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const { data: userProfile } = await supabase
      .from('profiles')
      .select('display_name, email')
      .eq('id', user.id)
      .single();

    const companyName = company?.display_name || 'Mon entreprise';
    // Use email_sender_name if configured, otherwise fall back to display_name or company name
    const userDisplayName = company?.email_sender_name || userProfile?.display_name || company?.display_name || 'Verifolio';
    // Use email_reply_to if configured, otherwise fall back to company email or user email
    const replyToEmail = company?.email_reply_to || company?.email || userProfile?.email || user.email;

    // Obtenir ou créer le lien public
    const { link, error: linkError } = await getOrCreatePublicLink(
      user.id,
      resource_type,
      resource_id
    );

    if (linkError || !link) {
      return NextResponse.json(
        { error: `Erreur création lien public: ${linkError}` },
        { status: 500 }
      );
    }

    const publicUrl = buildPublicUrl(resource_type, link.token);

    // Préparer les variables du template
    const templateVars: EmailTemplateVariables = {
      client_name: resource.client_name,
      deal_title: resource.deal_title,
      mission_title: resource.mission_title,
      quote_number: resource.quote_number,
      invoice_number: resource.invoice_number,
      company_name: companyName,
      user_display_name: userDisplayName,
      public_link_url: publicUrl,
      custom_message,
    };

    // Générer le sujet et le HTML
    const subject = customSubject || getDefaultSubject(resource_type, templateVars);
    const htmlContent = generateSendEmailHTML(resource_type, templateVars);

    // Préparer les pièces jointes (PDF si demandé)
    const attachments: { filename: string; content: Buffer; contentType: string }[] = [];
    const config = DOCUMENT_SEND_CONFIGS[resource_type];

    if (attach_pdf && config.supports_pdf && (resource_type === 'quote' || resource_type === 'invoice')) {
      try {
        const pdfBuffer = await generatePDF({
          type: resource_type,
          document: resource,
          company,
        });
        if (pdfBuffer) {
          attachments.push({
            filename: `${resource.numero || resource_type}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          });
        }
      } catch (pdfError) {
        console.error('[Send] Error generating PDF:', pdfError);
        // Continue sans PDF
      }
    }

    // Créer l'entrée dans outbound_messages AVANT l'envoi
    const { data: outboundMessage } = await supabase
      .from('outbound_messages')
      .insert({
        user_id: user.id,
        entity_type: resource_type,
        entity_id: resource_id,
        doc_type: resource_type,
        document_id: resource_id,
        recipient_contact_ids: contact_ids || [],
        recipient_emails: to_emails,
        status: 'pending',
        subject,
        message: custom_message || null,
      })
      .select()
      .single();

    // Envoyer l'email via Resend
    // From: "{user_display_name} via Verifolio" <documents@verifolio.pro>
    // Reply-To: replyToEmail (configured or company email)
    const emailResult = await sendEmail({
      to: to_emails.join(', '),
      subject,
      html: htmlContent,
      fromName: userDisplayName,
      replyTo: replyToEmail,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    // Mettre à jour le statut dans outbound_messages
    if (outboundMessage) {
      await supabase
        .from('outbound_messages')
        .update({
          status: emailResult.success ? 'sent' : 'failed',
          sent_at: emailResult.success ? new Date().toISOString() : null,
          error_message: emailResult.success ? null : (emailResult.error || 'Erreur inconnue'),
        })
        .eq('id', outboundMessage.id);
    }

    if (!emailResult.success) {
      return NextResponse.json(
        { error: emailResult.error || 'Erreur envoi email' },
        { status: 500 }
      );
    }

    // Logger l'événement de tracking
    await logTrackingEvent({
      userId: user.id,
      resourceType: resource_type,
      resourceId: resource_id,
      eventType: 'email_sent',
      publicLinkId: link.id,
      metadata: {
        recipient_count: to_emails.length,
        has_pdf: attachments.length > 0,
        message_id: emailResult.messageId,
      },
    });

    // Mettre à jour le statut de la ressource
    await updateResourceStatus(supabase, resource_type, resource_id);

    // Réponse
    const result: SendResult = {
      success: true,
      message_id: emailResult.messageId,
      public_link_token: link.token,
      recipient_count: to_emails.length,
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('[Send] Error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'envoi' },
      { status: 500 }
    );
  }
}
