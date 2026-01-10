'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTabsStore } from '@/lib/stores/tabs-store';
import { Button, Input, Select, Textarea } from '@/components/ui';
import { LineItemsEditor } from './LineItemsEditor';
import type { Quote, QuoteLineItem, Client, LineItemInput } from '@/lib/supabase/types';

interface QuoteFormProps {
  quote?: Quote & { items?: QuoteLineItem[] };
  clients?: Client[];
}

export function QuoteForm({ quote, clients: initialClients }: QuoteFormProps) {
  const router = useRouter();
  const { tabs, activeTabId, closeTab, openTab } = useTabsStore();
  const isEditing = !!quote;

  const [clients, setClients] = useState<Client[]>(initialClients || []);
  const [clientId, setClientId] = useState(quote?.client_id || '');

  // Handle client selection to inherit VAT setting
  const handleClientChange = (newClientId: string) => {
    setClientId(newClientId);
    // Inherit VAT setting from client when creating new quote
    if (!isEditing && newClientId) {
      const selectedClient = clients.find(c => c.id === newClientId);
      if (selectedClient && 'vat_enabled' in selectedClient) {
        setVatEnabled(selectedClient.vat_enabled ?? true);
      }
    }
  };
  const [dateEmission, setDateEmission] = useState(quote?.date_emission || new Date().toISOString().split('T')[0]);
  const [dateValidite, setDateValidite] = useState(quote?.date_validite || '');
  const [notes, setNotes] = useState(quote?.notes || '');
  const [currency, setCurrency] = useState(quote?.devise || 'MAD');
  const [vatEnabled, setVatEnabled] = useState(quote?.vat_enabled ?? true);
  const [items, setItems] = useState<LineItemInput[]>(
    quote?.items?.map(item => ({
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

    // Récupérer la devise par défaut si pas de devis existant
    if (!quote?.devise) {
      supabase
        .from('companies')
        .select('default_currency')
        .single()
        .then(({ data }) => {
          if (data?.default_currency) setCurrency(data.default_currency);
        });
    }
  }, [initialClients, quote?.devise]);

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
      // Mise à jour du devis
      const { error: quoteError } = await supabase
        .from('quotes')
        .update({
          client_id: clientId,
          date_emission: dateEmission,
          date_validite: dateValidite || null,
          notes: notes || null,
          vat_enabled: vatEnabled,
          ...totals,
        })
        .eq('id', quote.id);

      if (quoteError) {
        setError('Erreur lors de la mise à jour');
        setLoading(false);
        return;
      }

      // Supprimer les anciennes lignes et réinsérer
      await supabase
        .from('quote_line_items')
        .delete()
        .eq('quote_id', quote.id);

      const lineItems = items.filter(i => i.description).map((item, index) => {
        const ht = item.quantite * item.prix_unitaire;
        const tvaRate = item.tva_rate || 20;
        const tva = ht * (tvaRate / 100);
        return {
          quote_id: quote.id,
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

      await supabase.from('quote_line_items').insert(lineItems);

      router.push(`/quotes/${quote.id}`);
    } else {
      // Création du devis
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Non authentifié');
        setLoading(false);
        return;
      }

      // Récupérer et incrémenter le numéro
      const { data: company } = await supabase
        .from('companies')
        .select('quote_prefix, next_quote_number')
        .eq('user_id', user.id)
        .single();

      const prefix = company?.quote_prefix || 'DEV-';
      const number = company?.next_quote_number || 1;
      const numero = `${prefix}${String(number).padStart(4, '0')}`;

      const { data: newQuote, error: quoteError } = await supabase
        .from('quotes')
        .insert({
          user_id: user.id,
          client_id: clientId,
          numero,
          date_emission: dateEmission,
          date_validite: dateValidite || null,
          status: 'brouillon',
          devise: currency,
          notes: notes || null,
          vat_enabled: vatEnabled,
          ...totals,
        })
        .select()
        .single();

      if (quoteError || !newQuote) {
        setError('Erreur lors de la création');
        setLoading(false);
        return;
      }

      // Incrémenter le compteur
      await supabase
        .from('companies')
        .update({ next_quote_number: number + 1 })
        .eq('user_id', user.id);

      // Ajouter les lignes
      const lineItems = items.filter(i => i.description).map((item, index) => {
        const ht = item.quantite * item.prix_unitaire;
        const tvaRate = item.tva_rate || 20;
        const tva = ht * (tvaRate / 100);
        return {
          quote_id: newQuote.id,
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

      await supabase.from('quote_line_items').insert(lineItems);

      router.push(`/quotes/${newQuote.id}`);
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
          label="Date de validité"
          value={dateValidite}
          onChange={(e) => setDateValidite(e.target.value)}
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
          Lignes du devis
        </label>
        <LineItemsEditor items={items} onChange={setItems} currency={currency} />
      </div>

      <Textarea
        label="Notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes ou conditions particulières..."
        rows={3}
      />

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <div className="flex gap-3 pt-4">
        <Button type="submit" loading={loading}>
          {isEditing ? 'Enregistrer' : 'Créer le devis'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            // Si on est dans un onglet, le fermer et retourner à Documents
            if (activeTabId) {
              const currentTab = tabs.find(t => t.id === activeTabId);
              if (currentTab && (currentTab.type === 'new-quote' || currentTab.type === 'edit-quote')) {
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
