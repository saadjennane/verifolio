'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useTabsStore } from '@/lib/stores/tabs-store';

interface SupplierQuote {
  id: string;
  reference: string | null;
  date_devis: string | null;
  date_validite: string | null;
  total_ht: number | null;
  total_tva: number | null;
  total_ttc: number | null;
  vat_enabled: boolean;
  status: string;
  is_selected: boolean;
  notes: string | null;
  document_url: string | null;
  supplier: {
    id: string;
    nom: string;
  } | null;
  consultation: {
    id: string;
    title: string;
  } | null;
  created_at: string;
}

const statusVariants: Record<string, 'gray' | 'blue' | 'green' | 'yellow' | 'red'> = {
  pending: 'yellow',
  accepted: 'green',
  rejected: 'red',
};

const statusLabels: Record<string, string> = {
  pending: 'En attente',
  accepted: 'Accepté',
  rejected: 'Refusé',
};

export default function SupplierQuoteDetailPage() {
  const params = useParams();
  const quoteId = params.id as string;
  const { openTab, closeTab, updateTabTitle, activeTabId } = useTabsStore();

  const [quote, setQuote] = useState<SupplierQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadQuote();
  }, [quoteId]);

  async function loadQuote() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/suppliers/quotes/${quoteId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors du chargement');
      }

      setQuote(data.data);
      if (activeTabId) updateTabTitle(activeTabId, data.data.reference || 'Devis');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(status: string) {
    try {
      const res = await fetch(`/api/suppliers/quotes/${quoteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur');
      }

      setQuote(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  }

  async function handleDelete() {
    if (!confirm('Supprimer ce devis ?')) return;

    try {
      const res = await fetch(`/api/suppliers/quotes/${quoteId}`, {
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

  if (error && !quote) {
    return (
      <div className="p-6">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!quote) return null;

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {quote.reference || 'Devis fournisseur'}
            </h1>
            <Badge variant={statusVariants[quote.status] || 'gray'}>
              {statusLabels[quote.status] || quote.status}
            </Badge>
            {quote.is_selected && (
              <Badge variant="green">Retenu</Badge>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {quote.supplier?.nom || 'Fournisseur inconnu'}
          </p>
        </div>
        <div className="flex gap-2">
          {quote.status === 'pending' && (
            <>
              <Button variant="outline" onClick={() => handleStatusChange('rejected')}>
                Refuser
              </Button>
              <Button onClick={() => handleStatusChange('accepted')}>
                Accepter
              </Button>
            </>
          )}
          {quote.status === 'accepted' && !quote.is_selected && (
            <Button
              onClick={() => openTab({
                type: 'new-supplier-invoice',
                path: `/suppliers/invoices/new?quote_id=${quote.id}`,
                title: 'Créer facture',
              }, true)}
            >
              Créer la facture
            </Button>
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

      <div className="grid grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="col-span-2 space-y-6">
          <Card>
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">Informations du devis</h2>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-gray-500">Date du devis</dt>
                  <dd className="text-gray-900">{formatDate(quote.date_devis)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Validité</dt>
                  <dd className="text-gray-900">{formatDate(quote.date_validite)}</dd>
                </div>
                {quote.consultation && (
                  <div className="col-span-2">
                    <dt className="text-sm text-gray-500">Consultation</dt>
                    <dd>
                      <button
                        onClick={() => openTab({
                          type: 'supplier-consultation',
                          path: `/suppliers/consultations/${quote.consultation!.id}`,
                          title: quote.consultation!.title,
                          entityId: quote.consultation!.id,
                        }, false)}
                        className="text-blue-600 hover:underline"
                      >
                        {quote.consultation.title}
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
              {quote.vat_enabled ? (
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Total HT</dt>
                    <dd className="font-medium">{formatAmount(quote.total_ht)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">TVA</dt>
                    <dd className="font-medium">{formatAmount(quote.total_tva)}</dd>
                  </div>
                  <div className="flex justify-between pt-3 border-t border-gray-200">
                    <dt className="font-semibold">Total TTC</dt>
                    <dd className="text-xl font-bold text-blue-600">{formatAmount(quote.total_ttc)}</dd>
                  </div>
                </dl>
              ) : (
                <div className="flex justify-between">
                  <dt className="font-semibold">Total</dt>
                  <dd className="text-xl font-bold text-blue-600">{formatAmount(quote.total_ttc)}</dd>
                </div>
              )}
            </div>
          </Card>

          {/* Notes */}
          {quote.notes && (
            <Card>
              <div className="p-6">
                <h2 className="text-lg font-semibold mb-4">Notes</h2>
                <p className="text-gray-700 whitespace-pre-line">{quote.notes}</p>
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
              {quote.supplier ? (
                <button
                  onClick={() => openTab({
                    type: 'supplier',
                    path: `/suppliers/${quote.supplier!.id}`,
                    title: quote.supplier!.nom,
                    entityId: quote.supplier!.id,
                  }, false)}
                  className="text-blue-600 hover:underline"
                >
                  {quote.supplier.nom}
                </button>
              ) : (
                <span className="text-gray-500">Non défini</span>
              )}
            </div>
          </Card>

          {/* Document */}
          {quote.document_url && (
            <Card>
              <div className="p-4">
                <h3 className="font-medium text-gray-900 mb-3">Document</h3>
                <a
                  href={quote.document_url}
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

          {/* Metadata */}
          <Card>
            <div className="p-4">
              <h3 className="font-medium text-gray-900 mb-3">Informations</h3>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-gray-500">Créé le</dt>
                  <dd className="text-gray-900">{formatDate(quote.created_at)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">TVA</dt>
                  <dd className="text-gray-900">{quote.vat_enabled ? 'Appliquée' : 'Non appliquée'}</dd>
                </div>
              </dl>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
