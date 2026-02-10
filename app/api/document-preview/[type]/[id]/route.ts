import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { renderDocumentHtml } from '@/lib/pdf/renderDocumentHtml';
import { buildRenderContext } from '@/lib/render/buildRenderContext';
import type { TemplateConfig } from '@/lib/types/settings';
import { DEFAULT_TEMPLATE_CONFIG } from '@/lib/types/settings';

/**
 * GET /api/document-preview/[type]/[id]
 * Renders a document (invoice/quote) as HTML using the user's template settings
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  try {
    const { type, id } = await params;
    const supabase = await createClient();

    // Validate type
    if (type !== 'invoice' && type !== 'quote') {
      return NextResponse.json(
        { error: 'Type invalide (invoice ou quote)' },
        { status: 400 }
      );
    }

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Fetch company to get template settings
    const { data: company } = await supabase
      .from('companies')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Build template config from company settings
    const templateConfig: TemplateConfig = {
      presetId: 'classic', // Use classic layout by default
      primaryColor: company?.template_primary_color || DEFAULT_TEMPLATE_CONFIG.primaryColor,
      accentColor: company?.template_accent_color || DEFAULT_TEMPLATE_CONFIG.accentColor,
      fontFamily: company?.template_font_family || DEFAULT_TEMPLATE_CONFIG.fontFamily,
      logoPosition: company?.template_logo_position || DEFAULT_TEMPLATE_CONFIG.logoPosition,
      showBankDetails: company?.template_show_bank_details ?? DEFAULT_TEMPLATE_CONFIG.showBankDetails,
      showNotes: company?.template_show_notes ?? DEFAULT_TEMPLATE_CONFIG.showNotes,
      showPaymentConditions: company?.template_show_payment_conditions ?? DEFAULT_TEMPLATE_CONFIG.showPaymentConditions,
      // Client block options
      clientBlockStyle: company?.template_client_block_style || DEFAULT_TEMPLATE_CONFIG.clientBlockStyle,
      clientBlockLabel: DEFAULT_TEMPLATE_CONFIG.clientBlockLabel,
      showClientAddress: company?.template_show_client_address ?? DEFAULT_TEMPLATE_CONFIG.showClientAddress,
      showClientEmail: company?.template_show_client_email ?? DEFAULT_TEMPLATE_CONFIG.showClientEmail,
      showClientPhone: company?.template_show_client_phone ?? DEFAULT_TEMPLATE_CONFIG.showClientPhone,
      hiddenClientFields: company?.template_hidden_client_fields || [],
      // Use defaults for remaining options
      docInfoDateLabel: DEFAULT_TEMPLATE_CONFIG.docInfoDateLabel,
      docInfoDueDateLabel: DEFAULT_TEMPLATE_CONFIG.docInfoDueDateLabel,
      showDocInfoDate: DEFAULT_TEMPLATE_CONFIG.showDocInfoDate,
      showDocInfoDueDate: DEFAULT_TEMPLATE_CONFIG.showDocInfoDueDate,
      itemsColDescriptionLabel: DEFAULT_TEMPLATE_CONFIG.itemsColDescriptionLabel,
      itemsColQtyLabel: DEFAULT_TEMPLATE_CONFIG.itemsColQtyLabel,
      itemsColPriceLabel: DEFAULT_TEMPLATE_CONFIG.itemsColPriceLabel,
      itemsColTvaLabel: DEFAULT_TEMPLATE_CONFIG.itemsColTvaLabel,
      itemsColTotalLabel: DEFAULT_TEMPLATE_CONFIG.itemsColTotalLabel,
      showItemsColQty: DEFAULT_TEMPLATE_CONFIG.showItemsColQty,
      showItemsColPrice: DEFAULT_TEMPLATE_CONFIG.showItemsColPrice,
      showItemsColTva: DEFAULT_TEMPLATE_CONFIG.showItemsColTva,
      showItemsColTotal: DEFAULT_TEMPLATE_CONFIG.showItemsColTotal,
      totalsHtLabel: DEFAULT_TEMPLATE_CONFIG.totalsHtLabel,
      totalsDiscountLabel: DEFAULT_TEMPLATE_CONFIG.totalsDiscountLabel,
      totalsTvaLabel: DEFAULT_TEMPLATE_CONFIG.totalsTvaLabel,
      totalsTtcLabel: DEFAULT_TEMPLATE_CONFIG.totalsTtcLabel,
      totalsDueLabel: DEFAULT_TEMPLATE_CONFIG.totalsDueLabel,
      showTotalsDiscount: DEFAULT_TEMPLATE_CONFIG.showTotalsDiscount,
      showTotalsTva: DEFAULT_TEMPLATE_CONFIG.showTotalsTva,
      showTotalsInWords: DEFAULT_TEMPLATE_CONFIG.showTotalsInWords,
      paymentBankLabel: DEFAULT_TEMPLATE_CONFIG.paymentBankLabel,
      paymentBankText: DEFAULT_TEMPLATE_CONFIG.paymentBankText,
      paymentConditionsLabel: DEFAULT_TEMPLATE_CONFIG.paymentConditionsLabel,
      paymentNotesLabel: DEFAULT_TEMPLATE_CONFIG.paymentNotesLabel,
      paymentConditionsText: DEFAULT_TEMPLATE_CONFIG.paymentConditionsText,
      paymentNotesText: DEFAULT_TEMPLATE_CONFIG.paymentNotesText,
      showFooterIdentity: DEFAULT_TEMPLATE_CONFIG.showFooterIdentity,
      showFooterLegal: DEFAULT_TEMPLATE_CONFIG.showFooterLegal,
      showFooterContact: DEFAULT_TEMPLATE_CONFIG.showFooterContact,
      footerCustomText: DEFAULT_TEMPLATE_CONFIG.footerCustomText,
      showSignatureBlock: DEFAULT_TEMPLATE_CONFIG.showSignatureBlock,
      signatureLabel: DEFAULT_TEMPLATE_CONFIG.signatureLabel,
    };

    // Build render context with real document data
    const context = await buildRenderContext(supabase, user.id, {
      entityType: type as 'quote' | 'invoice',
      entityId: id,
    });

    if (!context.document) {
      return NextResponse.json(
        { error: 'Document non trouvé' },
        { status: 404 }
      );
    }

    // Generate HTML
    const html = renderDocumentHtml(context, templateConfig);

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error generating document preview:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération de l\'aperçu' },
      { status: 500 }
    );
  }
}
