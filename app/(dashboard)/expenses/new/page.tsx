'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useTabsStore } from '@/lib/stores/tabs-store';

interface Supplier {
  id: string;
  nom: string;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

interface SupplierInvoice {
  id: string;
  numero: string | null;
  total_ht: number | null;
  total_tva: number | null;
  total_ttc: number | null;
  supplier_id: string;
  supplier: { nom: string } | null;
}

const PAYMENT_METHODS = [
  { value: 'card', label: 'Carte bancaire' },
  { value: 'bank_transfer', label: 'Virement bancaire' },
  { value: 'cash', label: 'Espèces' },
  { value: 'check', label: 'Chèque' },
  { value: 'other', label: 'Autre' },
];

function NewExpenseContent() {
  const searchParams = useSearchParams();
  const invoiceId = searchParams.get('invoice_id');

  const { openTab, closeTab, activeTabId } = useTabsStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  const [form, setForm] = useState({
    description: '',
    category: '',
    date_expense: new Date().toISOString().split('T')[0],
    amount_ht: '',
    amount_tva: '',
    amount_ttc: '',
    vat_enabled: true,
    payment_method: 'card',
    supplier_id: '',
    supplier_invoice_id: invoiceId || '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      // Load suppliers
      const suppliersRes = await fetch('/api/suppliers');
      if (suppliersRes.ok) {
        const data = await suppliersRes.json();
        setSuppliers(data.data || []);
      }

      // Load categories
      const categoriesRes = await fetch('/api/expenses/categories');
      if (categoriesRes.ok) {
        const data = await categoriesRes.json();
        setCategories(data.data || []);
      }

      // If we have an invoice_id, load the invoice to pre-fill
      if (invoiceId) {
        const invoiceRes = await fetch(`/api/suppliers/invoices/${invoiceId}`);
        if (invoiceRes.ok) {
          const invoiceData = await invoiceRes.json();
          const invoice: SupplierInvoice = invoiceData.data;

          setForm(prev => ({
            ...prev,
            supplier_id: invoice.supplier_id,
            supplier_invoice_id: invoice.id,
            description: `Facture ${invoice.numero || ''} - ${invoice.supplier?.nom || ''}`,
            amount_ht: invoice.total_ht?.toString() || '',
            amount_tva: invoice.total_tva?.toString() || '',
            amount_ttc: invoice.total_ttc?.toString() || '',
          }));
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  async function handleReceiptUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', 'invoice');
      formData.append('folder', 'receipts');

      const res = await fetch('/api/ocr/extract', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors du téléchargement');
      }

      setReceiptUrl(data.document_url);

      // Pre-fill form with OCR data if available
      if (data.data) {
        const ocr = data.data;
        setForm(prev => ({
          ...prev,
          description: ocr.description || prev.description,
          amount_ht: ocr.total_ht?.toString() || prev.amount_ht,
          amount_tva: ocr.total_tva?.toString() || prev.amount_tva,
          amount_ttc: ocr.total_ttc?.toString() || prev.amount_ttc,
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du téléchargement');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = {
        description: form.description,
        category: form.category || null,
        date_expense: form.date_expense,
        amount_ht: form.amount_ht ? parseFloat(form.amount_ht) : null,
        amount_tva: form.amount_tva ? parseFloat(form.amount_tva) : null,
        amount_ttc: form.amount_ttc ? parseFloat(form.amount_ttc) : 0,
        payment_method: form.payment_method || null,
        supplier_id: form.supplier_id || null,
        supplier_invoice_id: form.supplier_invoice_id || null,
        receipt_url: receiptUrl,
        notes: form.notes || null,
      };

      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la création');
      }

      if (activeTabId) closeTab(activeTabId);
      openTab({
        type: 'expense',
        path: `/expenses/${data.data.id}`,
        title: data.data.description.substring(0, 20),
        entityId: data.data.id,
      }, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Nouvelle dépense</h1>

      <Card>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Achat fournitures bureau"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Catégorie
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sélectionner...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date *
              </label>
              <input
                type="date"
                value={form.date_expense}
                onChange={(e) => setForm({ ...form, date_expense: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="flex items-center gap-2 py-2">
            <input
              type="checkbox"
              id="vat_enabled"
              checked={form.vat_enabled}
              onChange={(e) => setForm({ ...form, vat_enabled: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="vat_enabled" className="text-sm text-gray-700">
              TVA déductible
            </label>
          </div>

          {form.vat_enabled ? (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Montant HT
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.amount_ht}
                  onChange={(e) => setForm({ ...form, amount_ht: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  TVA
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.amount_tva}
                  onChange={(e) => setForm({ ...form, amount_tva: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Montant TTC *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.amount_ttc}
                  onChange={(e) => setForm({ ...form, amount_ttc: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Montant *
              </label>
              <input
                type="number"
                step="0.01"
                value={form.amount_ttc}
                onChange={(e) => setForm({ ...form, amount_ttc: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mode de paiement
              </label>
              <select
                value={form.payment_method}
                onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method.value} value={method.value}>{method.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fournisseur
              </label>
              <select
                value={form.supplier_id}
                onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Aucun</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>{supplier.nom}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Receipt upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Justificatif
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleReceiptUpload}
              className="hidden"
            />
            <div className="flex items-center gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? 'Téléchargement...' : 'Ajouter un justificatif'}
              </Button>
              {receiptUrl && (
                <a
                  href={receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  Voir le justificatif
                </a>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Remarques, détails..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => activeTabId && closeTab(activeTabId)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Création...' : 'Créer la dépense'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default function NewExpensePage() {
  return (
    <Suspense fallback={
      <div className="p-6 max-w-3xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    }>
      <NewExpenseContent />
    </Suspense>
  );
}
