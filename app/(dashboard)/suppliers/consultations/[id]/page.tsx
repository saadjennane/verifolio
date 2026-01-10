'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useTabsStore } from '@/lib/stores/tabs-store';

interface Consultation {
  id: string;
  title: string;
  description: string | null;
  status: 'open' | 'closed' | 'cancelled';
  created_at: string;
}

interface SupplierQuote {
  id: string;
  reference: string | null;
  date_devis: string | null;
  date_validite: string | null;
  total_ht: number | null;
  total_tva: number | null;
  total_ttc: number | null;
  status: string;
  is_selected: boolean;
  notes: string | null;
  supplier: {
    id: string;
    nom: string;
  } | null;
}

const statusVariants: Record<string, 'gray' | 'blue' | 'green' | 'yellow' | 'red'> = {
  open: 'blue',
  closed: 'green',
  cancelled: 'gray',
  pending: 'yellow',
  accepted: 'green',
  rejected: 'red',
};

const statusLabels: Record<string, string> = {
  open: 'En cours',
  closed: 'Clôturée',
  cancelled: 'Annulée',
  pending: 'En attente',
  accepted: 'Accepté',
  rejected: 'Refusé',
};

export default function ConsultationDetailPage() {
  const params = useParams();
  const consultationId = params.id as string;
  const { openTab, closeTab, updateTabTitle, activeTabId } = useTabsStore();

  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [quotes, setQuotes] = useState<SupplierQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '' });

  useEffect(() => {
    loadConsultation();
  }, [consultationId]);

  async function loadConsultation() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/suppliers/consultations/${consultationId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors du chargement');
      }

      setConsultation(data.data);
      setForm({ title: data.data.title, description: data.data.description || '' });
      if (activeTabId) updateTabTitle(activeTabId, data.data.title);

      // Load quotes for this consultation
      const quotesRes = await fetch(`/api/suppliers/quotes?consultation_id=${consultationId}`);
      if (quotesRes.ok) {
        const quotesData = await quotesRes.json();
        setQuotes(quotesData.data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/suppliers/consultations/${consultationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la sauvegarde');
      }

      setConsultation(data.data);
      setEditing(false);
      if (activeTabId) updateTabTitle(activeTabId, data.data.title);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(status: 'open' | 'closed' | 'cancelled') {
    try {
      const res = await fetch(`/api/suppliers/consultations/${consultationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur');
      }

      setConsultation(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  }

  async function handleSelectQuote(quoteId: string) {
    try {
      const res = await fetch(`/api/suppliers/quotes/${quoteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_selected: true, status: 'accepted' }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur');
      }

      // Update local state
      setQuotes(quotes.map(q => ({
        ...q,
        is_selected: q.id === quoteId,
        status: q.id === quoteId ? 'accepted' : (q.status === 'pending' ? 'rejected' : q.status),
      })));

      // Close consultation
      handleStatusChange('closed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  }

  async function handleDelete() {
    if (!confirm('Supprimer cette consultation ?')) return;

    try {
      const res = await fetch(`/api/suppliers/consultations/${consultationId}`, {
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

  if (error && !consultation) {
    return (
      <div className="p-6">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!consultation) return null;

  const selectedQuote = quotes.find(q => q.is_selected);

  return (
    <div className="p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{consultation.title}</h1>
            <Badge variant={statusVariants[consultation.status]}>
              {statusLabels[consultation.status]}
            </Badge>
          </div>
          {consultation.description && (
            <p className="text-gray-500 mt-1">{consultation.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          {consultation.status === 'open' && (
            <>
              <Button variant="outline" onClick={() => handleStatusChange('cancelled')}>
                Annuler
              </Button>
              <Button
                onClick={() => openTab({
                  type: 'new-supplier-quote',
                  path: `/suppliers/quotes/new?consultation_id=${consultationId}`,
                  title: 'Ajouter un devis',
                }, true)}
              >
                Ajouter un devis
              </Button>
            </>
          )}
          {consultation.status === 'closed' && (
            <Button variant="outline" onClick={() => handleStatusChange('open')}>
              Réouvrir
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

      {/* Winner */}
      {selectedQuote && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-semibold text-green-800">Fournisseur retenu</span>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-lg font-medium text-green-900">{selectedQuote.supplier?.nom}</p>
                <p className="text-sm text-green-700">
                  Devis {selectedQuote.reference} • {formatAmount(selectedQuote.total_ttc)} TTC
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => openTab({
                  type: 'new-supplier-invoice',
                  path: `/suppliers/invoices/new?quote_id=${selectedQuote.id}`,
                  title: 'Créer facture',
                }, true)}
              >
                Créer la facture
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Comparison Table */}
      <Card>
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold">Comparatif des devis</h2>
        </div>

        {quotes.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 mb-4">Aucun devis ajouté à cette consultation</p>
            {consultation.status === 'open' && (
              <Button
                onClick={() => openTab({
                  type: 'new-supplier-quote',
                  path: `/suppliers/quotes/new?consultation_id=${consultationId}`,
                  title: 'Ajouter un devis',
                }, true)}
              >
                Ajouter le premier devis
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Critère</th>
                  {quotes.map((quote) => (
                    <th key={quote.id} className="px-4 py-3 text-left text-sm font-medium text-gray-900 min-w-[200px]">
                      <div className="flex items-center gap-2">
                        {quote.supplier?.nom || 'Fournisseur inconnu'}
                        {quote.is_selected && (
                          <Badge variant="green">Retenu</Badge>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="px-4 py-3 text-sm text-gray-500">Référence</td>
                  {quotes.map((quote) => (
                    <td key={quote.id} className="px-4 py-3 text-sm">{quote.reference || '-'}</td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="px-4 py-3 text-sm text-gray-500">Date devis</td>
                  {quotes.map((quote) => (
                    <td key={quote.id} className="px-4 py-3 text-sm">{formatDate(quote.date_devis)}</td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="px-4 py-3 text-sm text-gray-500">Validité</td>
                  {quotes.map((quote) => (
                    <td key={quote.id} className="px-4 py-3 text-sm">{formatDate(quote.date_validite)}</td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-700">Total HT</td>
                  {quotes.map((quote) => (
                    <td key={quote.id} className="px-4 py-3 text-sm font-medium">{formatAmount(quote.total_ht)}</td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="px-4 py-3 text-sm text-gray-500">TVA</td>
                  {quotes.map((quote) => (
                    <td key={quote.id} className="px-4 py-3 text-sm">{formatAmount(quote.total_tva)}</td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100 bg-blue-50">
                  <td className="px-4 py-3 text-sm font-semibold text-blue-700">Total TTC</td>
                  {quotes.map((quote) => (
                    <td key={quote.id} className="px-4 py-3 text-sm font-semibold text-blue-700">{formatAmount(quote.total_ttc)}</td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="px-4 py-3 text-sm text-gray-500">Statut</td>
                  {quotes.map((quote) => (
                    <td key={quote.id} className="px-4 py-3">
                      <Badge variant={statusVariants[quote.status] || 'gray'}>
                        {statusLabels[quote.status] || quote.status}
                      </Badge>
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="px-4 py-3 text-sm text-gray-500">Notes</td>
                  {quotes.map((quote) => (
                    <td key={quote.id} className="px-4 py-3 text-sm text-gray-600">{quote.notes || '-'}</td>
                  ))}
                </tr>
                {consultation.status === 'open' && (
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-500">Actions</td>
                    {quotes.map((quote) => (
                      <td key={quote.id} className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openTab({
                              type: 'supplier-quote',
                              path: `/suppliers/quotes/${quote.id}`,
                              title: quote.reference || 'Devis',
                              entityId: quote.id,
                            }, false)}
                          >
                            Voir
                          </Button>
                          {!quote.is_selected && (
                            <Button
                              size="sm"
                              onClick={() => handleSelectQuote(quote.id)}
                            >
                              Sélectionner
                            </Button>
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
