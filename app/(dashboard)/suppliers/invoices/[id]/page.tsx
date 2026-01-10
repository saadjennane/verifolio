'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useTabsStore } from '@/lib/stores/tabs-store';

interface SupplierInvoice {
  id: string;
  numero: string | null;
  date_facture: string | null;
  date_echeance: string | null;
  total_ht: number | null;
  total_tva: number | null;
  total_ttc: number | null;
  vat_enabled: boolean;
  status: string;
  paid_at: string | null;
  notes: string | null;
  document_url: string | null;
  supplier: {
    id: string;
    nom: string;
  } | null;
  supplier_quote: {
    id: string;
    reference: string | null;
  } | null;
  created_at: string;
}

const statusVariants: Record<string, 'gray' | 'blue' | 'green' | 'yellow' | 'red'> = {
  pending: 'yellow',
  paid: 'green',
  overdue: 'red',
};

const statusLabels: Record<string, string> = {
  pending: 'En attente',
  paid: 'Payée',
  overdue: 'En retard',
};

export default function SupplierInvoiceDetailPage() {
  const params = useParams();
  const invoiceId = params.id as string;
  const { openTab, closeTab, updateTabTitle, activeTabId } = useTabsStore();

  const [invoice, setInvoice] = useState<SupplierInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInvoice();
  }, [invoiceId]);

  async function loadInvoice() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/suppliers/invoices/${invoiceId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors du chargement');
      }

      setInvoice(data.data);
      if (activeTabId) updateTabTitle(activeTabId, data.data.numero || 'Facture');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkPaid() {
    try {
      const res = await fetch(`/api/suppliers/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid', paid_at: new Date().toISOString() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur');
      }

      setInvoice(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  }

  async function handleCreateExpense() {
    // Navigate to new expense form with invoice pre-filled
    openTab({
      type: 'new-expense',
      path: `/expenses/new?invoice_id=${invoiceId}`,
      title: 'Nouvelle dépense',
    }, true);
  }

  async function handleDelete() {
    if (!confirm('Supprimer cette facture ?')) return;

    try {
      const res = await fetch(`/api/suppliers/invoices/${invoiceId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur');
      }

      if (activeTabId) closeTab(activeTabId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  }

  function formatDate(dateString: string | null) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR');
  }

  function formatAmount(amount: number | null) {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  }

  function isOverdue(): boolean {
    if (!invoice || invoice.status === 'paid' || !invoice.date_echeance) return false;
    return new Date(invoice.date_echeance) < new Date();
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error && !invoice) {
    return (
      <div className="p-6">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!invoice) return null;

  const overdue = isOverdue();
  const displayStatus = overdue ? 'overdue' : invoice.status;

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {invoice.numero || 'Facture fournisseur'}
            </h1>
            <Badge variant={statusVariants[displayStatus] || 'gray'}>
              {statusLabels[displayStatus] || displayStatus}
            </Badge>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {invoice.supplier?.nom || 'Fournisseur inconnu'}
          </p>
        </div>
        <div className="flex gap-2">
          {invoice.status === 'pending' && (
            <>
              <Button variant="outline" onClick={handleCreateExpense}>
                Créer dépense
              </Button>
              <Button onClick={handleMarkPaid}>
                Marquer payée
              </Button>
            </>
          )}
          <Button variant="outline" onClick={handleDelete}>
            Supprimer
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {overdue && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="font-medium text-red-800">
              Cette facture est en retard de paiement
            </span>
          </div>
          <p className="text-sm text-red-700 mt-1">
            Date d'échéance : {formatDate(invoice.date_echeance)}
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="col-span-2 space-y-6">
          <Card>
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">Informations de la facture</h2>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-gray-500">Date de facture</dt>
                  <dd className="text-gray-900">{formatDate(invoice.date_facture)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Date d'échéance</dt>
                  <dd className={overdue ? 'text-red-600 font-medium' : 'text-gray-900'}>
                    {formatDate(invoice.date_echeance)}
                  </dd>
                </div>
                {invoice.status === 'paid' && invoice.paid_at && (
                  <div>
                    <dt className="text-sm text-gray-500">Payée le</dt>
                    <dd className="text-green-600 font-medium">{formatDate(invoice.paid_at)}</dd>
                  </div>
                )}
                {invoice.supplier_quote && (
                  <div className="col-span-2">
                    <dt className="text-sm text-gray-500">Devis associé</dt>
                    <dd>
                      <button
                        onClick={() => openTab({
                          type: 'supplier-quote',
                          path: `/suppliers/quotes/${invoice.supplier_quote!.id}`,
                          title: invoice.supplier_quote!.reference || 'Devis',
                          entityId: invoice.supplier_quote!.id,
                        }, false)}
                        className="text-blue-600 hover:underline"
                      >
                        {invoice.supplier_quote.reference || 'Voir le devis'}
                      </button>
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </Card>

          {/* Amounts */}
          <Card>
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">Montants</h2>
              {invoice.vat_enabled ? (
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Total HT</dt>
                    <dd className="font-medium">{formatAmount(invoice.total_ht)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">TVA</dt>
                    <dd className="font-medium">{formatAmount(invoice.total_tva)}</dd>
                  </div>
                  <div className="flex justify-between pt-3 border-t border-gray-200">
                    <dt className="font-semibold">Total TTC</dt>
                    <dd className="text-xl font-bold text-blue-600">{formatAmount(invoice.total_ttc)}</dd>
                  </div>
                </dl>
              ) : (
                <div className="flex justify-between">
                  <dt className="font-semibold">Total</dt>
                  <dd className="text-xl font-bold text-blue-600">{formatAmount(invoice.total_ttc)}</dd>
                </div>
              )}
            </div>
          </Card>

          {/* Notes */}
          {invoice.notes && (
            <Card>
              <div className="p-6">
                <h2 className="text-lg font-semibold mb-4">Notes</h2>
                <p className="text-gray-700 whitespace-pre-line">{invoice.notes}</p>
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Supplier Card */}
          <Card>
            <div className="p-4">
              <h3 className="font-medium text-gray-900 mb-3">Fournisseur</h3>
              {invoice.supplier ? (
                <button
                  onClick={() => openTab({
                    type: 'supplier',
                    path: `/suppliers/${invoice.supplier!.id}`,
                    title: invoice.supplier!.nom,
                    entityId: invoice.supplier!.id,
                  }, false)}
                  className="text-blue-600 hover:underline"
                >
                  {invoice.supplier.nom}
                </button>
              ) : (
                <span className="text-gray-500">Non défini</span>
              )}
            </div>
          </Card>

          {/* Document */}
          {invoice.document_url && (
            <Card>
              <div className="p-4">
                <h3 className="font-medium text-gray-900 mb-3">Document</h3>
                <a
                  href={invoice.document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:underline"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Voir le document
                </a>
              </div>
            </Card>
          )}

          {/* Actions */}
          {invoice.status === 'pending' && (
            <Card>
              <div className="p-4">
                <h3 className="font-medium text-gray-900 mb-3">Actions rapides</h3>
                <div className="space-y-2">
                  <Button
                    className="w-full"
                    variant="outline"
                    size="sm"
                    onClick={handleCreateExpense}
                  >
                    Créer une dépense
                  </Button>
                  <Button
                    className="w-full"
                    size="sm"
                    onClick={handleMarkPaid}
                  >
                    Marquer comme payée
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Metadata */}
          <Card>
            <div className="p-4">
              <h3 className="font-medium text-gray-900 mb-3">Informations</h3>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-gray-500">Créée le</dt>
                  <dd className="text-gray-900">{formatDate(invoice.created_at)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">TVA</dt>
                  <dd className="text-gray-900">{invoice.vat_enabled ? 'Appliquée' : 'Non appliquée'}</dd>
                </div>
              </dl>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
