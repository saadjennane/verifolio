import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { renderDocumentHtml } from '@/lib/pdf/renderDocumentHtml';
import { buildMockRenderContext } from '@/lib/render/buildMockRenderContext';
import type { TemplateConfig } from '@/lib/types/settings';
import { DEFAULT_TEMPLATE_CONFIG } from '@/lib/types/settings';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    console.log('[template-preview] Auth check:', { user: user?.id, authError: authError?.message });

    if (authError || !user) {
      console.log('[template-preview] Auth failed, returning 401');
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Parse template config from query params
    const url = new URL(request.url);

    // Parse hiddenClientFields from JSON string in query params
    let hiddenClientFields: string[] = [];
    const hiddenFieldsParam = url.searchParams.get('hiddenClientFields');
    if (hiddenFieldsParam) {
      try {
        hiddenClientFields = JSON.parse(hiddenFieldsParam);
      } catch {
        hiddenClientFields = [];
      }
    }

    const config: TemplateConfig = {
      primaryColor: url.searchParams.get('primaryColor') || DEFAULT_TEMPLATE_CONFIG.primaryColor,
      accentColor: url.searchParams.get('accentColor') || DEFAULT_TEMPLATE_CONFIG.accentColor,
      fontFamily: (url.searchParams.get('fontFamily') as TemplateConfig['fontFamily']) || DEFAULT_TEMPLATE_CONFIG.fontFamily,
      logoPosition: (url.searchParams.get('logoPosition') as TemplateConfig['logoPosition']) || DEFAULT_TEMPLATE_CONFIG.logoPosition,
      showBankDetails: url.searchParams.get('showBankDetails') !== 'false',
      showNotes: url.searchParams.get('showNotes') !== 'false',
      showPaymentConditions: url.searchParams.get('showPaymentConditions') !== 'false',
      // Client block options
      clientBlockStyle: (url.searchParams.get('clientBlockStyle') as TemplateConfig['clientBlockStyle']) || DEFAULT_TEMPLATE_CONFIG.clientBlockStyle,
      clientBlockLabel: url.searchParams.get('clientBlockLabel') || DEFAULT_TEMPLATE_CONFIG.clientBlockLabel,
      showClientAddress: url.searchParams.get('showClientAddress') !== 'false',
      showClientEmail: url.searchParams.get('showClientEmail') !== 'false',
      showClientPhone: url.searchParams.get('showClientPhone') !== 'false',
      hiddenClientFields,
      // Doc info block options
      docInfoDateLabel: url.searchParams.get('docInfoDateLabel') || DEFAULT_TEMPLATE_CONFIG.docInfoDateLabel,
      docInfoDueDateLabel: url.searchParams.get('docInfoDueDateLabel') || DEFAULT_TEMPLATE_CONFIG.docInfoDueDateLabel,
      showDocInfoDate: url.searchParams.get('showDocInfoDate') !== 'false',
      showDocInfoDueDate: url.searchParams.get('showDocInfoDueDate') !== 'false',
      // Items table options
      itemsColDescriptionLabel: url.searchParams.get('itemsColDescriptionLabel') || DEFAULT_TEMPLATE_CONFIG.itemsColDescriptionLabel,
      itemsColQtyLabel: url.searchParams.get('itemsColQtyLabel') || DEFAULT_TEMPLATE_CONFIG.itemsColQtyLabel,
      itemsColPriceLabel: url.searchParams.get('itemsColPriceLabel') || DEFAULT_TEMPLATE_CONFIG.itemsColPriceLabel,
      itemsColTvaLabel: url.searchParams.get('itemsColTvaLabel') || DEFAULT_TEMPLATE_CONFIG.itemsColTvaLabel,
      itemsColTotalLabel: url.searchParams.get('itemsColTotalLabel') || DEFAULT_TEMPLATE_CONFIG.itemsColTotalLabel,
      showItemsColQty: url.searchParams.get('showItemsColQty') !== 'false',
      showItemsColPrice: url.searchParams.get('showItemsColPrice') !== 'false',
      showItemsColTva: url.searchParams.get('showItemsColTva') === 'true',
      showItemsColTotal: url.searchParams.get('showItemsColTotal') !== 'false',
      // Totals options
      totalsHtLabel: url.searchParams.get('totalsHtLabel') || DEFAULT_TEMPLATE_CONFIG.totalsHtLabel,
      totalsDiscountLabel: url.searchParams.get('totalsDiscountLabel') || DEFAULT_TEMPLATE_CONFIG.totalsDiscountLabel,
      totalsTvaLabel: url.searchParams.get('totalsTvaLabel') || DEFAULT_TEMPLATE_CONFIG.totalsTvaLabel,
      totalsTtcLabel: url.searchParams.get('totalsTtcLabel') || DEFAULT_TEMPLATE_CONFIG.totalsTtcLabel,
      totalsDueLabel: url.searchParams.get('totalsDueLabel') || DEFAULT_TEMPLATE_CONFIG.totalsDueLabel,
      showTotalsDiscount: url.searchParams.get('showTotalsDiscount') !== 'false',
      showTotalsTva: url.searchParams.get('showTotalsTva') !== 'false',
      showTotalsInWords: url.searchParams.get('showTotalsInWords') !== 'false',
      // Payment block options
      paymentBankLabel: url.searchParams.get('paymentBankLabel') || DEFAULT_TEMPLATE_CONFIG.paymentBankLabel,
      paymentBankText: url.searchParams.get('paymentBankText') || DEFAULT_TEMPLATE_CONFIG.paymentBankText,
      paymentConditionsLabel: url.searchParams.get('paymentConditionsLabel') || DEFAULT_TEMPLATE_CONFIG.paymentConditionsLabel,
      paymentNotesLabel: url.searchParams.get('paymentNotesLabel') || DEFAULT_TEMPLATE_CONFIG.paymentNotesLabel,
      paymentConditionsText: url.searchParams.get('paymentConditionsText') || DEFAULT_TEMPLATE_CONFIG.paymentConditionsText,
      paymentNotesText: url.searchParams.get('paymentNotesText') || DEFAULT_TEMPLATE_CONFIG.paymentNotesText,
      // Footer options
      showFooterIdentity: url.searchParams.get('showFooterIdentity') !== 'false',
      showFooterLegal: url.searchParams.get('showFooterLegal') !== 'false',
      showFooterContact: url.searchParams.get('showFooterContact') !== 'false',
      footerCustomText: url.searchParams.get('footerCustomText') || DEFAULT_TEMPLATE_CONFIG.footerCustomText,
      // Signature options
      showSignatureBlock: url.searchParams.get('showSignatureBlock') !== 'false',
      signatureLabel: url.searchParams.get('signatureLabel') || DEFAULT_TEMPLATE_CONFIG.signatureLabel,
    };

    // Build mock context with real company data
    const context = await buildMockRenderContext(supabase, user.id);

    // Generate HTML with template config
    const html = renderDocumentHtml(context, config);

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error generating template preview:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération de l\'aperçu' },
      { status: 500 }
    );
  }
}
