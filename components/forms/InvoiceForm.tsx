'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTabsStore } from '@/lib/stores/tabs-store';
import { Button, Input, Select, Textarea } from '@/components/ui';
import { LineItemsEditor } from './LineItemsEditor';
import type { Invoice, InvoiceLineItem, Client, LineItemInput } from '@/lib/supabase/types';

interface InvoiceFormProps {
  invoice?: Invoice & { items?: InvoiceLineItem[] };
  clients?: Client[];
}

export function InvoiceForm({ invoice, clients: initialClients }: InvoiceFormProps) {
  const router = useRouter();
  const { tabs, activeTabId, closeTab, openTab } = useTabsStore();
  const isEditing = !!invoice;

  const [clients, setClients] = useState<Client[]>(initialClients || []);
  const [clientId, setClientId] = useState(invoice?.client_id || '');

  // Handle client selection to inherit VAT setting
  const handleClientChange = (newClientId: string) => {
    setClientId(newClientId);
    // Inherit VAT setting from client when creating new invoice
    if (!isEditing && newClientId) {
      const selectedClient = clients.find(c => c.id === newClientId);
      if (selectedClient && 'vat_enabled' in selectedClient) {
        setVatEnabled(selectedClient.vat_enabled ?? true);
      }
    }
  };
  const [dateEmission, setDateEmission] = useState(invoice?.date_emission || new Date().toISOString().split('T')[0]);
  const [dateEcheance, setDateEcheance] = useState(invoice?.date_echeance || '');
  const [notes, setNotes] = useState(invoice?.notes || '');
  const [currency, setCurrency] = useState(invoice?.devise || 'MAD');
  const [vatEnabled, setVatEnabled] = useState(invoice?.vat_enabled ?? true);
  const [items, setItems] = useState<LineItemInput[]>(
    invoice?.items?.map(item => ({
      description: item.description,
      quantite: Number(item.quantite),
      prix_unitaire: Number(item.prix_unitaire),
      tva_rate: Number(item.tva_rate),
    })) || [{ description: '', quantite: 1, prix_unitaire: 0, tva_rate: 20 }]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const supabase = createClient();

    if (!initialClients) {
      supabase
        .from('clients')
        .select('*')
        .order('nom')
        .then(({ data }) => {
          if (data) setClients(data);
        });
    }

    // Récupérer la devise par défaut si pas de facture existante
    if (!invoice?.devise) {
      supabase
        .from('companies')
        .select('default_currency')
        .single()
        .then(({ data }) => {
          if (data?.default_currency) setCurrency(data.default_currency);
        });
    }
  }, [initialClients, invoice?.devise]);

  const calculateTotals = () => {
    let totalHT = 0;
    let totalTVA = 0;

    items.forEach((item) => {
      const ht = item.quantite * item.prix_unitaire;
      const tva = vatEnabled ? ht * ((item.tva_rate || 20) / 100) : 0;
      totalHT += ht;
      totalTVA += tva;
    });

    return {
      total_ht: totalHT,
      total_tva: totalTVA,
      total_ttc: totalHT + totalTVA,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!clientId) {
      setError('Veuillez sélectionner un client');
      return;
    }

    if (items.length === 0 || items.every(i => !i.description)) {
      setError('Ajoutez au moins une ligne');
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const totals = calculateTotals();

    if (isEditing) {
      // Mise à jour de la facture
      const { error: invoiceError } = await supabase
        .from('invoices')
        .update({
          client_id: clientId,
          date_emission: dateEmission,
          date_echeance: dateEcheance || null,
          notes: notes || null,
          vat_enabled: vatEnabled,
          ...totals,
        })
        .eq('id', invoice.id);

      if (invoiceError) {
        setError('Erreur lors de la mise à jour');
        setLoading(false);
        return;
      }

      // Supprimer les anciennes lignes et réinsérer
      await supabase
        .from('invoice_line_items')
        .delete()
        .eq('invoice_id', invoice.id);

      const lineItems = items.filter(i => i.description).map((item, index) => {
        const ht = item.quantite * item.prix_unitaire;
        const tvaRate = item.tva_rate || 20;
        const tva = ht * (tvaRate / 100);
        return {
          invoice_id: invoice.id,
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

      await supabase.from('invoice_line_items').insert(lineItems);

      router.push(`/invoices/${invoice.id}`);
    } else {
      // Création de la facture
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Non authentifié');
        setLoading(false);
        return;
      }

      // Récupérer et incrémenter le numéro
      const { data: company } = await supabase
        .from('companies')
        .select('invoice_prefix, next_invoice_number')
        .eq('user_id', user.id)
        .single();

      const prefix = company?.invoice_prefix || 'FAC-';
      const number = company?.next_invoice_number || 1;
      const numero = `${prefix}${String(number).padStart(4, '0')}`;

      const { data: newInvoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          user_id: user.id,
          client_id: clientId,
          numero,
          date_emission: dateEmission,
          date_echeance: dateEcheance || null,
          status: 'brouillon',
          devise: currency,
          notes: notes || null,
          vat_enabled: vatEnabled,
          ...totals,
        })
        .select()
        .single();

      if (invoiceError || !newInvoice) {
        setError('Erreur lors de la création');
        setLoading(false);
        return;
      }

      // Incrémenter le compteur
      await supabase
        .from('companies')
        .update({ next_invoice_number: number + 1 })
        .eq('user_id', user.id);

      // Ajouter les lignes
      const lineItems = items.filter(i => i.description).map((item, index) => {
        const ht = item.quantite * item.prix_unitaire;
        const tvaRate = item.tva_rate || 20;
        const tva = ht * (tvaRate / 100);
        return {
          invoice_id: newInvoice.id,
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

      await supabase.from('invoice_line_items').insert(lineItems);

      router.push(`/invoices/${newInvoice.id}`);
    }

    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Select
        label="Client"
        value={clientId}
        onChange={(e) => handleClientChange(e.target.value)}
        options={clients.map((c) => ({ value: c.id, label: c.nom }))}
        placeholder="Sélectionner un client"
        required
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          type="date"
          label="Date d'émission"
          value={dateEmission}
          onChange={(e) => setDateEmission(e.target.value)}
          required
        />
        <Input
          type="date"
          label="Date d'échéance"
          value={dateEcheance}
          onChange={(e) => setDateEcheance(e.target.value)}
        />
      </div>

      <Select
        label="Devise"
        value={currency}
        onChange={(e) => setCurrency(e.target.value)}
        options={[
          { value: 'MAD', label: 'MAD (DH)' },
          { value: 'EUR', label: 'EUR (€)' },
          { value: 'USD', label: 'USD ($)' },
          { value: 'GBP', label: 'GBP (£)' },
          { value: 'CHF', label: 'CHF' },
        ]}
        required
      />

      {/* VAT toggle */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="vat_enabled"
          checked={vatEnabled}
          onChange={(e) => setVatEnabled(e.target.checked)}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor="vat_enabled" className="text-sm text-gray-700">
          TVA appliquée
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Lignes de la facture
        </label>
        <LineItemsEditor items={items} onChange={setItems} currency={currency} />
      </div>

      <Textarea
        label="Notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes ou conditions de paiement..."
        rows={3}
      />

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <div className="flex gap-3 pt-4">
        <Button type="submit" loading={loading}>
          {isEditing ? 'Enregistrer' : 'Créer la facture'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            // Si on est dans un onglet, le fermer et retourner à Documents
            if (activeTabId) {
              const currentTab = tabs.find(t => t.id === activeTabId);
              if (currentTab && (currentTab.type === 'new-invoice' || currentTab.type === 'edit-invoice')) {
                closeTab(activeTabId);
                openTab({
                  type: 'documents',
                  path: '/documents',
                  title: 'Documents',
                });
                return;
              }
            }
            // Sinon navigation normale
            router.push('/documents');
          }}
        >
          Annuler
        </Button>
      </div>
    </form>
  );
}
