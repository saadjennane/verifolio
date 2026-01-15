'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTabsStore } from '@/lib/stores/tabs-store';
import { DocumentEditorToolbar } from './DocumentEditorToolbar';
import { DocumentEditorPage } from './DocumentEditorPage';
import { DocumentSettingsPanel } from './DocumentSettingsPanel';
import { SendDrawer } from './SendDrawer';
import type { ContactWithResponsibilities } from '@/lib/documents/recipient-selection';
import { getCurrencySymbol } from '@/lib/utils/currency';
import { previewDocNumber, generateDocNumber, DEFAULT_PATTERNS } from '@/lib/numbering/generateDocNumber';
import type { Client, Company, LineItemInput } from '@/lib/supabase/types';
import type { TemplateConfig } from '@/lib/types/settings';

// ============================================================================
// Types
// ============================================================================

export type DocumentType = 'quote' | 'invoice';

export type DocumentStatus = 'brouillon' | 'envoye' | 'envoyee' | 'payee' | 'annulee';

export interface DocumentData {
  id?: string;
  numero: string;
  date_emission: string;
  date_validite?: string | null; // For quotes
  date_echeance?: string | null; // For invoices
  status: DocumentStatus;
  devise: string;
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  notes: string;
  items: LineItemInput[];
}

export interface DocumentSettings {
  showClientAddress: boolean;
  showClientEmail: boolean;
  showClientPhone: boolean;
  showNotes: boolean;
  showTva: boolean;
  showSignature: boolean;
  defaultTvaRate: number;
}

interface DocumentEditorProps {
  type: DocumentType;
  documentId?: string;
  // For creation context
  dealId?: string;    // Quotes must be linked to deals
  missionId?: string; // Invoices must be linked to missions
}

// ============================================================================
// Default values
// ============================================================================

const DEFAULT_SETTINGS: DocumentSettings = {
  showClientAddress: true,
  showClientEmail: true,
  showClientPhone: true,
  showNotes: true,
  showTva: true,
  showSignature: true,
  defaultTvaRate: 20,
};

const createEmptyDocument = (type: DocumentType): DocumentData => ({
  numero: '',
  date_emission: new Date().toISOString().split('T')[0],
  date_validite: type === 'quote' ? '' : undefined,
  date_echeance: type === 'invoice' ? '' : undefined,
  status: 'brouillon',
  devise: 'MAD',
  total_ht: 0,
  total_tva: 0,
  total_ttc: 0,
  notes: '',
  items: [{ description: '', quantite: 1, prix_unitaire: 0, tva_rate: 20 }],
});

// ============================================================================
// Component
// ============================================================================

export function DocumentEditor({ type, documentId, dealId, missionId }: DocumentEditorProps) {
  const { openTab, closeTab, tabs, activeTabId } = useTabsStore();
  const isEditing = !!documentId;
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sendDrawerOpen, setSendDrawerOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [clientContacts, setClientContacts] = useState<ContactWithResponsibilities[]>([]);

  // Data
  const [document, setDocument] = useState<DocumentData>(createEmptyDocument(type));
  const [client, setClient] = useState<Client | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [settings, setSettings] = useState<DocumentSettings>(DEFAULT_SETTINGS);
  const [templateConfig, setTemplateConfig] = useState<Partial<TemplateConfig>>({});
  const [companyFields, setCompanyFields] = useState<{ key: string; label: string; value: string }[]>([]);
  const [clientFields, setClientFields] = useState<{ key: string; label: string; value: string }[]>([]);

  // Validation for creation context
  const requiresDeal = type === 'quote' && !isEditing && !dealId;
  const requiresMission = type === 'invoice' && !isEditing && !missionId;

  // ============================================================================
  // Data fetching
  // ============================================================================

  useEffect(() => {
    async function fetchData() {
      console.log('[DocumentEditor] fetchData called with:', { type, documentId, dealId, missionId });

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError('Non authentifié');
        setLoading(false);
        return;
      }

      // OPTIMIZED: Parallel queries for initial data load
      // Was: 4-6 sequential queries, now: 1 parallel batch
      const [
        companyResult,
        customFieldDefsResult,
        clientsResult,
      ] = await Promise.all([
        supabase.from('companies').select('*').eq('user_id', user.id).single(),
        supabase.from('custom_fields').select('id, key, label').eq('user_id', user.id).eq('scope', 'company'),
        supabase.from('clients').select('*').is('deleted_at', null).order('nom'),
      ]);

      const companyData = companyResult.data;
      const customFieldDefs = customFieldDefsResult.data;
      const clientsData = clientsResult.data;

      if (companyData) {
        setCompany(companyData);
      }

      console.log('[DocumentEditor] Clients loaded:', clientsData?.length, 'clients');
      if (clientsData) {
        setClients(clientsData);
      }

      // Build template config from company settings
      const companyTemplateConfig: Partial<TemplateConfig> = {
        primaryColor: companyData?.template_primary_color || '#1e40af',
        accentColor: companyData?.template_accent_color || '#3b82f6',
        fontFamily: companyData?.template_font_family || 'sans-serif',
        logoPosition: companyData?.template_logo_position || 'left',
        showBankDetails: companyData?.template_show_bank_details ?? true,
        showNotes: companyData?.template_show_notes ?? true,
        showPaymentConditions: companyData?.template_show_payment_conditions ?? true,
        showClientAddress: companyData?.template_show_client_address ?? true,
        showClientEmail: companyData?.template_show_client_email ?? true,
        showClientPhone: companyData?.template_show_client_phone ?? true,
        showTotalsTva: companyData?.template_show_totals_tva ?? true,
        showSignatureBlock: companyData?.template_show_signature_block ?? true,
        paymentConditionsText: companyData?.template_payment_conditions_text || 'Paiement à 30 jours par virement bancaire',
        paymentNotesText: companyData?.template_payment_notes_text || '',
        signatureLabel: companyData?.template_signature_label || 'Cachet et signature',
      };

      setTemplateConfig(companyTemplateConfig);

      // Load company custom field values (depends on companyData)
      if (companyData && customFieldDefs) {
        const { data: customFieldValues } = await supabase
          .from('custom_field_values')
          .select('field_id, value_text')
          .eq('user_id', user.id)
          .eq('entity_type', 'company')
          .eq('entity_id', companyData.id);

        if (customFieldValues) {
          const fields = customFieldDefs
            .map(def => {
              const valueEntry = customFieldValues.find(v => v.field_id === def.id);
              return valueEntry?.value_text
                ? { key: def.key, label: def.label, value: valueEntry.value_text }
                : null;
            })
            .filter((f): f is { key: string; label: string; value: string } => f !== null);
          setCompanyFields(fields);
        }
      }

      // Apply settings from company template config
      setSettings(prev => ({
        ...prev,
        defaultTvaRate: companyData?.default_tax_rate ?? 20,
        showClientAddress: companyTemplateConfig.showClientAddress ?? true,
        showClientEmail: companyTemplateConfig.showClientEmail ?? true,
        showClientPhone: companyTemplateConfig.showClientPhone ?? true,
        showTva: companyTemplateConfig.showTotalsTva ?? true,
        showNotes: companyTemplateConfig.showNotes ?? true,
        showSignature: companyTemplateConfig.showSignatureBlock ?? true,
      }));

      // If editing, load the document
      if (documentId) {
        const tableName = type === 'quote' ? 'quotes' : 'invoices';
        const itemsTable = type === 'quote' ? 'quote_line_items' : 'invoice_line_items';

        const { data: docData, error: docError } = await supabase
          .from(tableName)
          .select(`*, items:${itemsTable}(*)`)
          .eq('id', documentId)
          .single();

        if (docError || !docData) {
          setError('Document non trouvé');
          setLoading(false);
          return;
        }

        // Find client
        const docClient = clientsData?.find(c => c.id === docData.client_id);
        if (docClient) setClient(docClient);

        setDocument({
          id: docData.id,
          numero: docData.numero,
          date_emission: docData.date_emission,
          date_validite: type === 'quote' ? docData.date_validite : undefined,
          date_echeance: type === 'invoice' ? docData.date_echeance : undefined,
          status: docData.status,
          devise: docData.devise || 'MAD',
          total_ht: Number(docData.total_ht),
          total_tva: Number(docData.total_tva),
          total_ttc: Number(docData.total_ttc),
          notes: docData.notes || '',
          items: docData.items?.length > 0
            ? docData.items.map((item: Record<string, unknown>) => ({
                description: item.description as string,
                quantite: Number(item.quantite),
                prix_unitaire: Number(item.prix_unitaire),
                tva_rate: Number(item.tva_rate),
              }))
            : [{ description: '', quantite: 1, prix_unitaire: 0, tva_rate: settings.defaultTvaRate }],
        });
      } else {
        // Creation mode - generate document number using pattern
        const pattern = type === 'quote'
          ? (companyData?.quote_number_pattern || DEFAULT_PATTERNS.quote)
          : (companyData?.invoice_number_pattern || DEFAULT_PATTERNS.invoice);

        let generatedNumero = '';
        try {
          generatedNumero = await previewDocNumber({
            supabase,
            userId: user.id,
            docType: type,
            pattern,
          });
          console.log('[DocumentEditor] Generated numero:', generatedNumero, 'from pattern:', pattern);
        } catch (err) {
          console.error('[DocumentEditor] Error generating numero:', err);
          // Fallback to simple format
          generatedNumero = type === 'quote' ? 'DEV-001' : 'FA-001';
        }

        // Load context from deal/mission
        if (dealId) {
          const { data: dealData } = await supabase
            .from('deals')
            .select('client_id, montant, devise')
            .eq('id', dealId)
            .single();

          if (dealData) {
            const dealClient = clientsData?.find(c => c.id === dealData.client_id);
            if (dealClient) setClient(dealClient);
            setDocument(prev => ({
              ...prev,
              numero: generatedNumero,
              devise: dealData.devise || prev.devise,
            }));
          } else {
            setDocument(prev => ({ ...prev, numero: generatedNumero }));
          }
        } else if (missionId) {
          const { data: missionData, error: missionError } = await supabase
            .from('missions')
            .select('client_id, title, estimated_amount, final_amount')
            .eq('id', missionId)
            .single();

          console.log('[DocumentEditor] Mission data:', missionData, 'Error:', missionError);

          if (missionData) {
            const missionClient = clientsData?.find(c => c.id === missionData.client_id);
            console.log('[DocumentEditor] Found client:', missionClient, 'from client_id:', missionData.client_id);
            if (missionClient) setClient(missionClient);

            // Use final_amount or estimated_amount as the budget
            const budget = missionData.final_amount || missionData.estimated_amount;
            const newItems = budget
              ? [{ description: missionData.title || '', quantite: 1, prix_unitaire: Number(budget), tva_rate: settings.defaultTvaRate }]
              : [{ description: '', quantite: 1, prix_unitaire: 0, tva_rate: settings.defaultTvaRate }];

            // Calculate totals for the new items
            let totalHT = 0;
            let totalTVA = 0;
            newItems.forEach((item) => {
              const ht = item.quantite * item.prix_unitaire;
              const tva = ht * (item.tva_rate / 100);
              totalHT += ht;
              totalTVA += tva;
            });

            setDocument(prev => ({
              ...prev,
              numero: generatedNumero,
              items: newItems,
              total_ht: totalHT,
              total_tva: totalTVA,
              total_ttc: totalHT + totalTVA,
            }));
          } else {
            console.log('[DocumentEditor] No mission data found for missionId:', missionId);
            setDocument(prev => ({ ...prev, numero: generatedNumero }));
          }
        } else {
          // No deal/mission context, just set the number
          setDocument(prev => ({ ...prev, numero: generatedNumero }));
        }
      }

      setLoading(false);
    }

    fetchData();
  }, [documentId, dealId, missionId, type, settings.defaultTvaRate]);

  // Load client custom fields and contacts when client changes
  useEffect(() => {
    async function loadClientData() {
      if (!client) {
        setClientFields([]);
        setClientContacts([]);
        return;
      }

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // OPTIMIZED: Parallel queries for client fields and contacts
      const [clientFieldDefsResult, clientFieldValuesResult, contactsResult] = await Promise.all([
        supabase.from('custom_fields').select('id, key, label').eq('user_id', user.id).eq('scope', 'client'),
        supabase.from('custom_field_values').select('field_id, value_text').eq('user_id', user.id).eq('entity_type', 'client').eq('entity_id', client.id),
        supabase.from('client_contacts')
          .select('id, contact_id, is_primary, handles_billing, handles_ops, handles_commercial, handles_management, contacts(*)')
          .eq('client_id', client.id),
      ]);

      const clientFieldDefs = clientFieldDefsResult.data;
      const clientFieldValues = clientFieldValuesResult.data;
      const contactLinks = contactsResult.data;

      if (clientFieldDefs && clientFieldValues) {
        const fields = clientFieldDefs
          .map(def => {
            const valueEntry = clientFieldValues.find(v => v.field_id === def.id);
            return valueEntry?.value_text
              ? { key: def.key, label: def.label, value: valueEntry.value_text }
              : null;
          })
          .filter((f): f is { key: string; label: string; value: string } => f !== null);
        setClientFields(fields);
      }

      // Build contacts with responsibilities
      if (contactLinks) {
        const contacts: ContactWithResponsibilities[] = contactLinks
          .filter(link => link.contacts && !Array.isArray(link.contacts))
          .map(link => {
            const contact = link.contacts as unknown as { id: string; nom: string; prenom?: string; civilite?: string; email?: string; telephone?: string };
            return {
              id: contact.id,
              nom: contact.nom,
              prenom: contact.prenom || null,
              civilite: contact.civilite || null,
              email: contact.email || null,
              telephone: contact.telephone || null,
              handles_billing: link.handles_billing || false,
              handles_ops: link.handles_ops || false,
              handles_commercial: link.handles_commercial || false,
              handles_management: link.handles_management || false,
              is_primary: link.is_primary || false,
              source: 'client' as const,
              linkId: link.id,
            };
          });
        setClientContacts(contacts);
      }
    }

    loadClientData();
  }, [client]);

  // ============================================================================
  // Calculations
  // ============================================================================

  const recalculateTotals = useCallback((items: LineItemInput[]): { total_ht: number; total_tva: number; total_ttc: number } => {
    let totalHT = 0;
    let totalTVA = 0;

    items.forEach((item) => {
      const ht = item.quantite * item.prix_unitaire;
      const tva = settings.showTva ? ht * ((item.tva_rate || settings.defaultTvaRate) / 100) : 0;
      totalHT += ht;
      totalTVA += tva;
    });

    return {
      total_ht: totalHT,
      total_tva: totalTVA,
      total_ttc: totalHT + totalTVA,
    };
  }, [settings.showTva, settings.defaultTvaRate]);

  // ============================================================================
  // Document updates
  // ============================================================================

  const updateDocument = useCallback((updates: Partial<DocumentData>) => {
    setDocument(prev => {
      const newDoc = { ...prev, ...updates };

      // Recalculate totals if items changed
      if (updates.items) {
        const totals = recalculateTotals(updates.items);
        return { ...newDoc, ...totals };
      }

      return newDoc;
    });
    setHasUnsavedChanges(true);
  }, [recalculateTotals]);

  const updateItem = useCallback((index: number, field: keyof LineItemInput, value: string | number) => {
    setDocument(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      const totals = recalculateTotals(newItems);
      return { ...prev, items: newItems, ...totals };
    });
    setHasUnsavedChanges(true);
  }, [recalculateTotals]);

  const addItem = useCallback(() => {
    setDocument(prev => ({
      ...prev,
      items: [...prev.items, { description: '', quantite: 1, prix_unitaire: 0, tva_rate: settings.defaultTvaRate }],
    }));
    setHasUnsavedChanges(true);
  }, [settings.defaultTvaRate]);

  const removeItem = useCallback((index: number) => {
    setDocument(prev => {
      const newItems = prev.items.filter((_, i) => i !== index);
      if (newItems.length === 0) {
        newItems.push({ description: '', quantite: 1, prix_unitaire: 0, tva_rate: settings.defaultTvaRate });
      }
      const totals = recalculateTotals(newItems);
      return { ...prev, items: newItems, ...totals };
    });
    setHasUnsavedChanges(true);
  }, [recalculateTotals, settings.defaultTvaRate]);

  const duplicateItem = useCallback((index: number) => {
    setDocument(prev => {
      const newItems = [...prev.items];
      newItems.splice(index + 1, 0, { ...prev.items[index] });
      const totals = recalculateTotals(newItems);
      return { ...prev, items: newItems, ...totals };
    });
    setHasUnsavedChanges(true);
  }, [recalculateTotals]);

  // ============================================================================
  // Save
  // ============================================================================

  const save = useCallback(async () => {
    if (!client) {
      setError('Veuillez sélectionner un client');
      return false;
    }

    const validItems = document.items.filter(i => i.description.trim());
    if (validItems.length === 0) {
      setError('Ajoutez au moins une ligne avec une description');
      return false;
    }

    setSaving(true);
    setError('');

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setError('Non authentifié');
      setSaving(false);
      return false;
    }

    const totals = recalculateTotals(validItems);

    try {
      if (isEditing && document.id) {
        // Update existing document
        const tableName = type === 'quote' ? 'quotes' : 'invoices';
        const itemsTable = type === 'quote' ? 'quote_line_items' : 'invoice_line_items';
        const fkColumn = type === 'quote' ? 'quote_id' : 'invoice_id';

        const updateData: Record<string, unknown> = {
          client_id: client.id,
          date_emission: document.date_emission,
          notes: document.notes || null,
          devise: document.devise,
          ...totals,
        };

        if (type === 'quote') {
          updateData.date_validite = document.date_validite || null;
        } else {
          updateData.date_echeance = document.date_echeance || null;
        }

        const { error: updateError } = await supabase
          .from(tableName)
          .update(updateData)
          .eq('id', document.id);

        if (updateError) throw updateError;

        // Delete old items and insert new ones
        await supabase.from(itemsTable).delete().eq(fkColumn, document.id);

        const lineItems = validItems.map((item, index) => {
          const ht = item.quantite * item.prix_unitaire;
          const tvaRate = item.tva_rate || settings.defaultTvaRate;
          const tva = settings.showTva ? ht * (tvaRate / 100) : 0;
          return {
            [fkColumn]: document.id,
            description: item.description,
            quantite: item.quantite,
            prix_unitaire: item.prix_unitaire,
            tva_rate: tvaRate,
            montant_ht: ht,
            montant_tva: tva,
            montant_ttc: ht + tva,
            ordre: index,
          };
        });

        await supabase.from(itemsTable).insert(lineItems);

      } else {
        // Create new document
        const tableName = type === 'quote' ? 'quotes' : 'invoices';
        const itemsTable = type === 'quote' ? 'quote_line_items' : 'invoice_line_items';
        const fkColumn = type === 'quote' ? 'quote_id' : 'invoice_id';

        // Get pattern and generate the real number (with increment)
        const { data: companyData } = await supabase
          .from('companies')
          .select('quote_number_pattern, invoice_number_pattern')
          .eq('user_id', user.id)
          .single();

        const pattern = type === 'quote'
          ? (companyData?.quote_number_pattern || DEFAULT_PATTERNS.quote)
          : (companyData?.invoice_number_pattern || DEFAULT_PATTERNS.invoice);

        const numero = await generateDocNumber({
          supabase,
          userId: user.id,
          docType: type,
          pattern,
        });

        const insertData: Record<string, unknown> = {
          user_id: user.id,
          client_id: client.id,
          numero,
          date_emission: document.date_emission,
          status: 'brouillon',
          devise: document.devise,
          notes: document.notes || null,
          ...totals,
        };

        if (type === 'quote') {
          insertData.date_validite = document.date_validite || null;
          insertData.deal_id = dealId || null;
        } else {
          insertData.date_echeance = document.date_echeance || null;
        }

        const { data: newDoc, error: insertError } = await supabase
          .from(tableName)
          .insert(insertData)
          .select()
          .single();

        if (insertError || !newDoc) throw insertError || new Error('Failed to create document');

        // Note: generateDocNumber already incremented the sequence via next_sequence RPC

        // Insert line items
        const lineItems = validItems.map((item, index) => {
          const ht = item.quantite * item.prix_unitaire;
          const tvaRate = item.tva_rate || settings.defaultTvaRate;
          const tva = settings.showTva ? ht * (tvaRate / 100) : 0;
          return {
            [fkColumn]: newDoc.id,
            description: item.description,
            quantite: item.quantite,
            prix_unitaire: item.prix_unitaire,
            tva_rate: tvaRate,
            montant_ht: ht,
            montant_tva: tva,
            montant_ttc: ht + tva,
            ordre: index,
          };
        });

        await supabase.from(itemsTable).insert(lineItems);

        // Create deal/mission link
        if (type === 'quote' && dealId) {
          await supabase.from('deal_documents').insert({
            deal_id: dealId,
            document_type: 'quote',
            quote_id: newDoc.id,
          });
        }

        if (type === 'invoice' && missionId) {
          await supabase.from('mission_invoices').insert({
            mission_id: missionId,
            invoice_id: newDoc.id,
          });
          // Update mission status
          await supabase
            .from('missions')
            .update({ status: 'invoiced' })
            .eq('id', missionId);
        }

        // Navigate back to deal/mission or to the document detail view
        const currentTab = tabs.find((t) => t.id === activeTabId);
        if (currentTab) closeTab(currentTab.id);

        if (dealId) {
          // Return to deal after creating quote
          openTab({
            type: 'deal',
            path: `/deals/${dealId}`,
            title: 'Deal',
            entityId: dealId,
          }, true);
        } else if (missionId) {
          // Return to mission after creating invoice
          openTab({
            type: 'mission',
            path: `/missions/${missionId}`,
            title: 'Mission',
            entityId: missionId,
          }, true);
        } else {
          // No context, go to document detail
          openTab({
            type: type,
            path: `/${type}s/${newDoc.id}`,
            title: newDoc.numero,
            entityId: newDoc.id,
          }, true);
        }

        return true;
      }

      setHasUnsavedChanges(false);
      setSaving(false);
      return true;

    } catch (err) {
      console.error('Save error:', err);
      setError('Erreur lors de la sauvegarde');
      setSaving(false);
      return false;
    }
  }, [
    client, document, type, isEditing, dealId, missionId,
    settings, recalculateTotals, tabs, activeTabId, closeTab, openTab
  ]);

  // ============================================================================
  // Auto-save
  // ============================================================================

  const autoSave = useCallback(async () => {
    // Don't auto-save if no client selected or no valid items
    if (!client) return;
    const validItems = document.items.filter(i => i.description.trim());
    if (validItems.length === 0) return;

    setIsAutoSaving(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setIsAutoSaving(false);
      return;
    }

    const totals = recalculateTotals(validItems);

    try {
      if (document.id) {
        // Update existing document
        const tableName = type === 'quote' ? 'quotes' : 'invoices';
        const itemsTable = type === 'quote' ? 'quote_line_items' : 'invoice_line_items';
        const fkColumn = type === 'quote' ? 'quote_id' : 'invoice_id';

        const updateData: Record<string, unknown> = {
          client_id: client.id,
          date_emission: document.date_emission,
          notes: document.notes || null,
          devise: document.devise,
          ...totals,
        };

        if (type === 'quote') {
          updateData.date_validite = document.date_validite || null;
        } else {
          updateData.date_echeance = document.date_echeance || null;
        }

        await supabase.from(tableName).update(updateData).eq('id', document.id);

        // Delete old items and insert new ones
        await supabase.from(itemsTable).delete().eq(fkColumn, document.id);

        const lineItems = validItems.map((item, index) => {
          const ht = item.quantite * item.prix_unitaire;
          const tvaRate = item.tva_rate || settings.defaultTvaRate;
          const tva = settings.showTva ? ht * (tvaRate / 100) : 0;
          return {
            [fkColumn]: document.id,
            description: item.description,
            quantite: item.quantite,
            prix_unitaire: item.prix_unitaire,
            tva_rate: tvaRate,
            montant_ht: ht,
            montant_tva: tva,
            montant_ttc: ht + tva,
            ordre: index,
          };
        });

        await supabase.from(itemsTable).insert(lineItems);

      } else {
        // Create new document
        const tableName = type === 'quote' ? 'quotes' : 'invoices';
        const itemsTable = type === 'quote' ? 'quote_line_items' : 'invoice_line_items';
        const fkColumn = type === 'quote' ? 'quote_id' : 'invoice_id';

        // Get pattern and generate the real number
        const { data: companyData } = await supabase
          .from('companies')
          .select('quote_number_pattern, invoice_number_pattern')
          .eq('user_id', user.id)
          .single();

        const pattern = type === 'quote'
          ? (companyData?.quote_number_pattern || DEFAULT_PATTERNS.quote)
          : (companyData?.invoice_number_pattern || DEFAULT_PATTERNS.invoice);

        const numero = await generateDocNumber({
          supabase,
          userId: user.id,
          docType: type,
          pattern,
        });

        const insertData: Record<string, unknown> = {
          user_id: user.id,
          client_id: client.id,
          numero,
          date_emission: document.date_emission,
          status: 'brouillon',
          devise: document.devise,
          notes: document.notes || null,
          ...totals,
        };

        if (type === 'quote') {
          insertData.date_validite = document.date_validite || null;
          insertData.deal_id = dealId || null;
        } else {
          insertData.date_echeance = document.date_echeance || null;
        }

        const { data: newDoc, error: insertError } = await supabase
          .from(tableName)
          .insert(insertData)
          .select()
          .single();

        if (insertError || !newDoc) throw insertError;

        // Insert line items
        const lineItems = validItems.map((item, index) => {
          const ht = item.quantite * item.prix_unitaire;
          const tvaRate = item.tva_rate || settings.defaultTvaRate;
          const tva = settings.showTva ? ht * (tvaRate / 100) : 0;
          return {
            [fkColumn]: newDoc.id,
            description: item.description,
            quantite: item.quantite,
            prix_unitaire: item.prix_unitaire,
            tva_rate: tvaRate,
            montant_ht: ht,
            montant_tva: tva,
            montant_ttc: ht + tva,
            ordre: index,
          };
        });

        await supabase.from(itemsTable).insert(lineItems);

        // Create deal/mission link
        if (type === 'quote' && dealId) {
          await supabase.from('deal_documents').insert({
            deal_id: dealId,
            document_type: 'quote',
            quote_id: newDoc.id,
          });
        }

        if (type === 'invoice' && missionId) {
          await supabase.from('mission_invoices').insert({
            mission_id: missionId,
            invoice_id: newDoc.id,
          });
        }

        // Update document state with the new ID and numero
        setDocument(prev => ({
          ...prev,
          id: newDoc.id,
          numero: newDoc.numero,
        }));

        // Update tab title
        const currentTab = tabs.find((t) => t.id === activeTabId);
        if (currentTab) {
          openTab({
            type: type === 'quote' ? 'edit-quote' : 'edit-invoice',
            path: `/${type}s/${newDoc.id}/edit`,
            title: newDoc.numero,
            entityId: newDoc.id,
          }, true);
        }
      }

      setHasUnsavedChanges(false);
      setLastSaved(new Date());
    } catch (err) {
      console.error('Auto-save error:', err);
    } finally {
      setIsAutoSaving(false);
    }
  }, [client, document, type, dealId, missionId, settings, recalculateTotals, tabs, activeTabId, openTab]);

  // Auto-save effect with debounce
  useEffect(() => {
    if (!hasUnsavedChanges || loading) return;

    // Clear previous timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout for auto-save (1.5 seconds debounce)
    autoSaveTimeoutRef.current = setTimeout(() => {
      autoSave();
    }, 1500);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [hasUnsavedChanges, loading, autoSave]);

  // ============================================================================
  // Navigation
  // ============================================================================

  const handleBack = useCallback(() => {
    const currentTab = tabs.find((t) => t.id === activeTabId);
    if (currentTab) closeTab(currentTab.id);

    if (dealId) {
      openTab({ type: 'deal', path: `/deals/${dealId}`, title: 'Deal', entityId: dealId }, true);
    } else if (missionId) {
      openTab({ type: 'mission', path: `/missions/${missionId}`, title: 'Mission', entityId: missionId }, true);
    } else {
      openTab({ type: 'documents', path: '/documents', title: 'Documents' }, true);
    }
  }, [tabs, activeTabId, closeTab, openTab, dealId, missionId]);

  // ============================================================================
  // Render
  // ============================================================================

  // Validation errors for creation
  if (requiresDeal) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 bg-amber-100 rounded-full flex items-center justify-center">
            <svg className="h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Deal requis</h2>
          <p className="text-gray-600 mb-4">
            Un devis doit être créé depuis un deal. Ouvrez un deal et cliquez sur "Nouveau devis".
          </p>
          <button
            onClick={() => openTab({ type: 'deals', path: '/deals', title: 'Deals' }, true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Voir les deals
          </button>
        </div>
      </div>
    );
  }

  if (requiresMission) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 bg-amber-100 rounded-full flex items-center justify-center">
            <svg className="h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Mission requise</h2>
          <p className="text-gray-600 mb-4">
            Une facture doit être créée depuis une mission. Ouvrez une mission et cliquez sur "Créer une facture".
          </p>
          <button
            onClick={() => openTab({ type: 'missions', path: '/missions', title: 'Missions' }, true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Voir les missions
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const currencySymbol = getCurrencySymbol(document.devise);

  return (
    <div className="h-full flex flex-col bg-gray-100 dark:bg-gray-100">
      {/* Toolbar */}
      <DocumentEditorToolbar
        type={type}
        numero={document.numero || (type === 'quote' ? 'Nouveau devis' : 'Nouvelle facture')}
        status={document.status}
        hasUnsavedChanges={hasUnsavedChanges}
        saving={saving}
        isAutoSaving={isAutoSaving}
        lastSaved={lastSaved}
        canSend={!!document.id && !!client && clientContacts.length > 0}
        onBack={handleBack}
        onSave={save}
        onSend={() => setSendDrawerOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        isEditing={isEditing || !!document.id}
      />

      {/* Error message */}
      {error && (
        <div className="mx-auto max-w-[210mm] w-full px-4 mt-4">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        </div>
      )}

      {/* A4 Page - Force light mode for document preview */}
      <div className="flex-1 overflow-auto py-8 bg-gray-100 dark:bg-gray-100">
        <DocumentEditorPage
          type={type}
          document={document}
          client={client}
          clients={clients}
          company={company}
          settings={settings}
          currencySymbol={currencySymbol}
          templateConfig={templateConfig}
          companyFields={companyFields}
          clientFields={clientFields}
          onUpdateDocument={updateDocument}
          onSelectClient={setClient}
          onUpdateItem={updateItem}
          onAddItem={addItem}
          onRemoveItem={removeItem}
          onDuplicateItem={duplicateItem}
        />
      </div>

      {/* Settings Panel */}
      <DocumentSettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
        document={document}
        onUpdateDocument={updateDocument}
      />

      {/* Send Drawer */}
      {document.id && client && (
        <SendDrawer
          isOpen={sendDrawerOpen}
          onClose={() => setSendDrawerOpen(false)}
          resourceType={type}
          resourceId={document.id}
          documentTitle={document.numero}
          contacts={clientContacts}
          clientName={client.nom}
          quoteNumber={type === 'quote' ? document.numero : undefined}
          invoiceNumber={type === 'invoice' ? document.numero : undefined}
          companyName={company?.nom || ''}
          userDisplayName={company?.nom || ''}
          onSendSuccess={() => {
            // Reload document to update status
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
