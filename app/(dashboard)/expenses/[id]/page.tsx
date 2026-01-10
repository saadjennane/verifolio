'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useTabsStore } from '@/lib/stores/tabs-store';

interface Expense {
  id: string;
  description: string;
  category: string | null;
  date_expense: string;
  amount_ht: number | null;
  amount_tva: number | null;
  amount_ttc: number;
  payment_method: string | null;
  receipt_url: string | null;
  notes: string | null;
  supplier: {
    id: string;
    nom: string;
  } | null;
  supplier_invoice: {
    id: string;
    numero: string | null;
  } | null;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

const paymentMethodLabels: Record<string, string> = {
  card: 'Carte bancaire',
  bank_transfer: 'Virement bancaire',
  cash: 'Espèces',
  check: 'Chèque',
  other: 'Autre',
};

export default function ExpenseDetailPage() {
  const params = useParams();
  const expenseId = params.id as string;
  const { openTab, closeTab, updateTabTitle, activeTabId } = useTabsStore();

  const [expense, setExpense] = useState<Expense | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Expense>>({});

  useEffect(() => {
    loadExpense();
  }, [expenseId]);

  async function loadExpense() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/expenses/${expenseId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors du chargement');
      }

      setExpense(data.data);
      setForm(data.data);
      if (activeTabId) {
        updateTabTitle(activeTabId, data.data.description.substring(0, 20));
      }

      // Load categories
      const categoriesRes = await fetch('/api/expenses/categories');
      if (categoriesRes.ok) {
        const catData = await categoriesRes.json();
        setCategories(catData.data || []);
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
      const res = await fetch(`/api/expenses/${expenseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: form.description,
          category: form.category,
          date_expense: form.date_expense,
          amount_ht: form.amount_ht,
          amount_tva: form.amount_tva,
          amount_ttc: form.amount_ttc,
          payment_method: form.payment_method,
          notes: form.notes,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la sauvegarde');
      }

      setExpense(data.data);
      setEditing(false);
      if (activeTabId) {
        updateTabTitle(activeTabId, data.data.description.substring(0, 20));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Supprimer cette dépense ?')) return;

    try {
      const res = await fetch(`/api/expenses/${expenseId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur lors de la suppression');
      }

      if (activeTabId) {
        closeTab(activeTabId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
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

  if (error && !expense) {
    return (
      <div className="p-6">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!expense) return null;

  const categoryColor = categories.find(c => c.name === expense.category)?.color || '#6B7280';

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{expense.description}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {formatDate(expense.date_expense)}
            {expense.category && (
              <>
                {' • '}
                <span
                  className="inline-flex items-center gap-1"
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: categoryColor }}
                  />
                  {expense.category}
                </span>
              </>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button variant="outline" onClick={() => { setEditing(false); setForm(expense); }}>
                Annuler
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleDelete}>
                Supprimer
              </Button>
              <Button onClick={() => setEditing(true)}>
                Modifier
              </Button>
            </>
          )}
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
              <h2 className="text-lg font-semibold mb-4">Détails</h2>

              {editing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <input
                      type="text"
                      value={form.description || ''}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                      <input
                        type="date"
                        value={form.date_expense || ''}
                        onChange={(e) => setForm({ ...form, date_expense: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                      <select
                        value={form.category || ''}
                        onChange={(e) => setForm({ ...form, category: e.target.value || null })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Aucune</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.name}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      value={form.notes || ''}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ) : (
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm text-gray-500">Mode de paiement</dt>
                    <dd className="text-gray-900">
                      {expense.payment_method ? paymentMethodLabels[expense.payment_method] : '-'}
                    </dd>
                  </div>
                  {expense.notes && (
                    <div>
                      <dt className="text-sm text-gray-500">Notes</dt>
                      <dd className="text-gray-900 whitespace-pre-line">{expense.notes}</dd>
                    </div>
                  )}
                </dl>
              )}
            </div>
          </Card>

          {/* Amounts */}
          <Card>
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">Montants</h2>

              {editing ? (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Montant HT</label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.amount_ht || ''}
                      onChange={(e) => setForm({ ...form, amount_ht: e.target.value ? parseFloat(e.target.value) : null })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">TVA</label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.amount_tva || ''}
                      onChange={(e) => setForm({ ...form, amount_tva: e.target.value ? parseFloat(e.target.value) : null })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Montant TTC</label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.amount_ttc || ''}
                      onChange={(e) => setForm({ ...form, amount_ttc: e.target.value ? parseFloat(e.target.value) : 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ) : (
                <dl className="space-y-3">
                  {expense.amount_ht !== null && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Montant HT</dt>
                      <dd className="font-medium">{formatAmount(expense.amount_ht)}</dd>
                    </div>
                  )}
                  {expense.amount_tva !== null && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">TVA</dt>
                      <dd className="font-medium">{formatAmount(expense.amount_tva)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between pt-3 border-t border-gray-200">
                    <dt className="font-semibold">Total TTC</dt>
                    <dd className="text-xl font-bold text-blue-600">{formatAmount(expense.amount_ttc)}</dd>
                  </div>
                </dl>
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Supplier */}
          {expense.supplier && (
            <Card>
              <div className="p-4">
                <h3 className="font-medium text-gray-900 mb-3">Fournisseur</h3>
                <button
                  onClick={() => openTab({
                    type: 'supplier',
                    path: `/suppliers/${expense.supplier!.id}`,
                    title: expense.supplier!.nom,
                    entityId: expense.supplier!.id,
                  }, false)}
                  className="text-blue-600 hover:underline"
                >
                  {expense.supplier.nom}
                </button>
              </div>
            </Card>
          )}

          {/* Invoice */}
          {expense.supplier_invoice && (
            <Card>
              <div className="p-4">
                <h3 className="font-medium text-gray-900 mb-3">Facture liée</h3>
                <button
                  onClick={() => openTab({
                    type: 'supplier-invoice',
                    path: `/suppliers/invoices/${expense.supplier_invoice!.id}`,
                    title: expense.supplier_invoice!.numero || 'Facture',
                    entityId: expense.supplier_invoice!.id,
                  }, false)}
                  className="text-blue-600 hover:underline"
                >
                  {expense.supplier_invoice.numero || 'Voir la facture'}
                </button>
              </div>
            </Card>
          )}

          {/* Receipt */}
          {expense.receipt_url && (
            <Card>
              <div className="p-4">
                <h3 className="font-medium text-gray-900 mb-3">Justificatif</h3>
                <a
                  href={expense.receipt_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:underline"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Voir le justificatif
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
                  <dt className="text-gray-500">Créée le</dt>
                  <dd className="text-gray-900">{formatDate(expense.created_at)}</dd>
                </div>
              </dl>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
