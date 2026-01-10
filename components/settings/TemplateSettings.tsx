'use client';

import { useState, useEffect, useCallback } from 'react';
import { TemplateToolbar } from './TemplateToolbar';
import { TemplatePreview, type ZoneClickInfo } from './TemplatePreview';
import { ZonePopup } from './ZonePopup';
import { DocTypeSelector } from './DocTypeSelector';
import type { TemplateConfig } from '@/lib/types/settings';
import { DEFAULT_TEMPLATE_CONFIG } from '@/lib/types/settings';
import type { TemplateContextData } from '@/lib/render/clientRenderContext';

export function TemplateSettings() {
  const [selectedDocType, setSelectedDocType] = useState<'invoice' | 'quote' | null>(null);
  const [config, setConfig] = useState<TemplateConfig>(DEFAULT_TEMPLATE_CONFIG);
  const [templateContext, setTemplateContext] = useState<TemplateContextData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [popupInfo, setPopupInfo] = useState<ZoneClickInfo | null>(null);

  // Load template config and context in parallel when doc type is selected
  useEffect(() => {
    if (!selectedDocType) return;

    async function loadData() {
      setLoading(true);
      try {
        // Fetch config and context in parallel for better performance
        const [configResponse, contextResponse] = await Promise.all([
          fetch('/api/settings/company'),
          fetch(`/api/settings/template-context?docType=${selectedDocType}`),
        ]);

        // Process config
        if (configResponse.ok) {
          const data = await configResponse.json();
          if (data.company) {
            setConfig({
              primaryColor: data.company.template_primary_color || DEFAULT_TEMPLATE_CONFIG.primaryColor,
              accentColor: data.company.template_accent_color || DEFAULT_TEMPLATE_CONFIG.accentColor,
              fontFamily: data.company.template_font_family || DEFAULT_TEMPLATE_CONFIG.fontFamily,
              logoPosition: data.company.template_logo_position || DEFAULT_TEMPLATE_CONFIG.logoPosition,
              showBankDetails: data.company.template_show_bank_details ?? DEFAULT_TEMPLATE_CONFIG.showBankDetails,
              showNotes: data.company.template_show_notes ?? DEFAULT_TEMPLATE_CONFIG.showNotes,
              showPaymentConditions: data.company.template_show_payment_conditions ?? DEFAULT_TEMPLATE_CONFIG.showPaymentConditions,
              // Client block options
              clientBlockStyle: data.company.template_client_block_style || DEFAULT_TEMPLATE_CONFIG.clientBlockStyle,
              clientBlockLabel: data.company.template_client_block_label || DEFAULT_TEMPLATE_CONFIG.clientBlockLabel,
              showClientAddress: data.company.template_show_client_address ?? DEFAULT_TEMPLATE_CONFIG.showClientAddress,
              showClientEmail: data.company.template_show_client_email ?? DEFAULT_TEMPLATE_CONFIG.showClientEmail,
              showClientPhone: data.company.template_show_client_phone ?? DEFAULT_TEMPLATE_CONFIG.showClientPhone,
              hiddenClientFields: data.company.template_hidden_client_fields ?? DEFAULT_TEMPLATE_CONFIG.hiddenClientFields,
              // Doc info block options
              docInfoDateLabel: data.company.template_doc_info_date_label || DEFAULT_TEMPLATE_CONFIG.docInfoDateLabel,
              docInfoDueDateLabel: data.company.template_doc_info_due_date_label || DEFAULT_TEMPLATE_CONFIG.docInfoDueDateLabel,
              showDocInfoDate: data.company.template_show_doc_info_date ?? DEFAULT_TEMPLATE_CONFIG.showDocInfoDate,
              showDocInfoDueDate: data.company.template_show_doc_info_due_date ?? DEFAULT_TEMPLATE_CONFIG.showDocInfoDueDate,
              // Items table options
              itemsColDescriptionLabel: data.company.template_items_col_description_label || DEFAULT_TEMPLATE_CONFIG.itemsColDescriptionLabel,
              itemsColQtyLabel: data.company.template_items_col_qty_label || DEFAULT_TEMPLATE_CONFIG.itemsColQtyLabel,
              itemsColPriceLabel: data.company.template_items_col_price_label || DEFAULT_TEMPLATE_CONFIG.itemsColPriceLabel,
              itemsColTvaLabel: data.company.template_items_col_tva_label || DEFAULT_TEMPLATE_CONFIG.itemsColTvaLabel,
              itemsColTotalLabel: data.company.template_items_col_total_label || DEFAULT_TEMPLATE_CONFIG.itemsColTotalLabel,
              showItemsColQty: data.company.template_show_items_col_qty ?? DEFAULT_TEMPLATE_CONFIG.showItemsColQty,
              showItemsColPrice: data.company.template_show_items_col_price ?? DEFAULT_TEMPLATE_CONFIG.showItemsColPrice,
              showItemsColTva: data.company.template_show_items_col_tva ?? DEFAULT_TEMPLATE_CONFIG.showItemsColTva,
              showItemsColTotal: data.company.template_show_items_col_total ?? DEFAULT_TEMPLATE_CONFIG.showItemsColTotal,
              // Totals options
              totalsHtLabel: data.company.template_totals_ht_label || DEFAULT_TEMPLATE_CONFIG.totalsHtLabel,
              totalsDiscountLabel: data.company.template_totals_discount_label || DEFAULT_TEMPLATE_CONFIG.totalsDiscountLabel,
              totalsTvaLabel: data.company.template_totals_tva_label || DEFAULT_TEMPLATE_CONFIG.totalsTvaLabel,
              totalsTtcLabel: data.company.template_totals_ttc_label || DEFAULT_TEMPLATE_CONFIG.totalsTtcLabel,
              totalsDueLabel: data.company.template_totals_due_label || DEFAULT_TEMPLATE_CONFIG.totalsDueLabel,
              showTotalsDiscount: data.company.template_show_totals_discount ?? DEFAULT_TEMPLATE_CONFIG.showTotalsDiscount,
              showTotalsTva: data.company.template_show_totals_tva ?? DEFAULT_TEMPLATE_CONFIG.showTotalsTva,
              showTotalsInWords: data.company.template_show_totals_in_words ?? DEFAULT_TEMPLATE_CONFIG.showTotalsInWords,
              // Payment block options
              paymentBankLabel: data.company.template_payment_bank_label || DEFAULT_TEMPLATE_CONFIG.paymentBankLabel,
              paymentBankText: data.company.template_payment_bank_text || DEFAULT_TEMPLATE_CONFIG.paymentBankText,
              paymentConditionsLabel: data.company.template_payment_conditions_label || DEFAULT_TEMPLATE_CONFIG.paymentConditionsLabel,
              paymentNotesLabel: data.company.template_payment_notes_label || DEFAULT_TEMPLATE_CONFIG.paymentNotesLabel,
              paymentConditionsText: data.company.template_payment_conditions_text || DEFAULT_TEMPLATE_CONFIG.paymentConditionsText,
              paymentNotesText: data.company.template_payment_notes_text || DEFAULT_TEMPLATE_CONFIG.paymentNotesText,
              // Footer options
              showFooterIdentity: data.company.template_show_footer_identity ?? DEFAULT_TEMPLATE_CONFIG.showFooterIdentity,
              showFooterLegal: data.company.template_show_footer_legal ?? DEFAULT_TEMPLATE_CONFIG.showFooterLegal,
              showFooterContact: data.company.template_show_footer_contact ?? DEFAULT_TEMPLATE_CONFIG.showFooterContact,
              footerCustomText: data.company.template_footer_custom_text || DEFAULT_TEMPLATE_CONFIG.footerCustomText,
              // Signature options
              showSignatureBlock: data.company.template_show_signature_block ?? DEFAULT_TEMPLATE_CONFIG.showSignatureBlock,
              signatureLabel: data.company.template_signature_label || DEFAULT_TEMPLATE_CONFIG.signatureLabel,
            });
          }
        }

        // Process context for client-side rendering
        if (contextResponse.ok) {
          const contextData = await contextResponse.json();
          setTemplateContext(contextData);
        }
      } catch (error) {
        console.error('Error loading template data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [selectedDocType]);

  // Save template config to company
  const handleSave = useCallback(async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/settings/company', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_primary_color: config.primaryColor,
          template_accent_color: config.accentColor,
          template_font_family: config.fontFamily,
          template_logo_position: config.logoPosition,
          template_show_bank_details: config.showBankDetails,
          template_show_notes: config.showNotes,
          template_show_payment_conditions: config.showPaymentConditions,
          // Client block options
          template_client_block_style: config.clientBlockStyle,
          template_client_block_label: config.clientBlockLabel,
          template_show_client_address: config.showClientAddress,
          template_show_client_email: config.showClientEmail,
          template_show_client_phone: config.showClientPhone,
          template_hidden_client_fields: config.hiddenClientFields,
          // Doc info block options
          template_doc_info_date_label: config.docInfoDateLabel,
          template_doc_info_due_date_label: config.docInfoDueDateLabel,
          template_show_doc_info_date: config.showDocInfoDate,
          template_show_doc_info_due_date: config.showDocInfoDueDate,
          // Items table options
          template_items_col_description_label: config.itemsColDescriptionLabel,
          template_items_col_qty_label: config.itemsColQtyLabel,
          template_items_col_price_label: config.itemsColPriceLabel,
          template_items_col_tva_label: config.itemsColTvaLabel,
          template_items_col_total_label: config.itemsColTotalLabel,
          template_show_items_col_qty: config.showItemsColQty,
          template_show_items_col_price: config.showItemsColPrice,
          template_show_items_col_tva: config.showItemsColTva,
          template_show_items_col_total: config.showItemsColTotal,
          // Totals options
          template_totals_ht_label: config.totalsHtLabel,
          template_totals_discount_label: config.totalsDiscountLabel,
          template_totals_tva_label: config.totalsTvaLabel,
          template_totals_ttc_label: config.totalsTtcLabel,
          template_totals_due_label: config.totalsDueLabel,
          template_show_totals_discount: config.showTotalsDiscount,
          template_show_totals_tva: config.showTotalsTva,
          template_show_totals_in_words: config.showTotalsInWords,
          // Payment block options
          template_payment_bank_label: config.paymentBankLabel,
          template_payment_bank_text: config.paymentBankText,
          template_payment_conditions_label: config.paymentConditionsLabel,
          template_payment_notes_label: config.paymentNotesLabel,
          template_payment_conditions_text: config.paymentConditionsText,
          template_payment_notes_text: config.paymentNotesText,
          // Footer options
          template_show_footer_identity: config.showFooterIdentity,
          template_show_footer_legal: config.showFooterLegal,
          template_show_footer_contact: config.showFooterContact,
          template_footer_custom_text: config.footerCustomText,
          // Signature options
          template_show_signature_block: config.showSignatureBlock,
          template_signature_label: config.signatureLabel,
        }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Template enregistré avec succès' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.error || 'Erreur lors de la sauvegarde' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur de connexion' });
    } finally {
      setSaving(false);
    }
  }, [config]);

  // Handle zone click from preview
  const handleZoneClick = useCallback((info: ZoneClickInfo | null) => {
    setPopupInfo(info);
  }, []);

  // Close popup
  const handleClosePopup = useCallback(() => {
    setPopupInfo(null);
  }, []);

  // Show doc type selector if no type selected
  if (!selectedDocType) {
    return <DocTypeSelector onSelect={setSelectedDocType} />;
  }

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Show template editor with back button
  return (
    <div className="h-[calc(100vh-200px)] flex flex-col">
      {/* Header with back button */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setSelectedDocType(null)}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          title="Retour"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <h2 className="text-lg font-medium text-gray-900">
          Modèle de {selectedDocType === 'invoice' ? 'Facture' : 'Devis'}
        </h2>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Toolbar */}
      <TemplateToolbar
        config={config}
        onChange={setConfig}
      />

      {/* Preview - Full width */}
      <div className="flex-1 mt-4 min-h-0">
        <TemplatePreview
          config={config}
          templateContext={templateContext}
          onZoneClick={handleZoneClick}
          onSave={handleSave}
          saving={saving}
        />
      </div>

      {/* Popup - appears on zone click */}
      {popupInfo && (
        <ZonePopup
          zone={popupInfo.zone}
          position={{ x: popupInfo.x, y: popupInfo.y }}
          config={config}
          onChange={setConfig}
          onClose={handleClosePopup}
        />
      )}
    </div>
  );
}
