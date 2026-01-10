'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTabsStore } from '@/lib/stores/tabs-store';
import { useRefreshTrigger } from '@/lib/hooks/useRefreshTrigger';
import { Button, Badge } from '@/components/ui';
import type { InvoiceStatus } from '@/lib/supabase/types';

interface Invoice {
  id: string;
  numero: string;
  status: InvoiceStatus;
  date_emission: string;
  date_echeance: string | null;
  total_ttc: number;
  devise: string;
  client: { nom: string } | null;
}

const statusConfig: Record<InvoiceStatus, { label: string; variant: 'gray' | 'blue' | 'green' | 'yellow' }> = {
  brouillon: { label: 'Brouillon', variant: 'gray' },
  envoyee: { label: 'Envoyée', variant: 'blue' },
  payee: { label: 'Payée', variant: 'green' },
  annulee: { label: 'Annulée', variant: 'gray' },
};

export function InvoicesListTab() {
  const { openTab } = useTabsStore();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvoices = useCallback(async () => {
    const supabase = createClient();

    const { data } = await supabase
      .from('invoices')
      .select(`
        *,
        client:clients(nom)
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (data) {
      setInvoices(data);
    }
    setLoading(false);
  }, []);

  // Charger au montage
  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Écouter les triggers de refresh depuis le chat
  useRefreshTrigger('invoices', fetchInvoices);

  const handleInvoiceClick = (e: React.MouseEvent, invoice: Invoice) => {
    const permanent = e.ctrlKey || e.metaKey;
    openTab(
      {
        type: 'invoice',
        path: `/invoices/${invoice.id}`,
        title: invoice.numero,
        entityId: invoice.id,
      },
      permanent
    );
  };

  const handleInvoiceDoubleClick = (invoice: Invoice) => {
    openTab(
      {
        type: 'invoice',
        path: `/invoices/${invoice.id}`,
        title: invoice.numero,
        entityId: invoice.id,
      },
      true
    );
  };

  const handleNewInvoice = () => {
    openTab(
      { type: 'new-invoice', path: '/invoices/new', title: 'Nouvelle facture' },
      true
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Factures</h1>
          <Button onClick={handleNewInvoice}>Nouvelle facture</Button>
        </div>

        {/* Liste */}
        {invoices.length > 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
            {invoices.map((invoice) => {
              const config = statusConfig[invoice.status] || statusConfig.brouillon;
              return (
                <button
                  key={invoice.id}
                  onClick={(e) => handleInvoiceClick(e, invoice)}
                  onDoubleClick={() => handleInvoiceDoubleClick(invoice)}
                  className="w-full block p-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{invoice.numero}</span>
                        <Badge variant={config.variant}>{config.label}</Badge>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {invoice.client?.nom || 'Client inconnu'} — {invoice.date_emission}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        {Number(invoice.total_ttc).toFixed(2)} {invoice.devise}
                      </p>
                      {invoice.date_echeance && invoice.status !== 'payee' && (
                        <p className="text-xs text-gray-400">
                          Échéance: {invoice.date_echeance}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-500 mb-4">Aucune facture pour le moment</p>
            <Button variant="secondary" onClick={handleNewInvoice}>
              Créer votre première facture
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
