'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useTabsStore } from '@/lib/stores/tabs-store';

interface Supplier {
  id: string;
  nom: string;
  vat_enabled: boolean;
}

interface SupplierQuote {
  id: string;
  reference: string | null;
  total_ht: number | null;
  total_tva: number | null;
  total_ttc: number | null;
  vat_enabled: boolean;
  supplier_id: string;
  supplier: { nom: string } | null;
}

interface OcrData {
  supplier_name?: string;
  numero?: string;
  date_facture?: string;
  date_echeance?: string;
  total_ht?: number;
  total_tva?: number;
  total_ttc?: number;
}

function NewSupplierInvoiceContent() {
  const searchParams = useSearchParams();
  const supplierId = searchParams.get('supplier_id');
  const quoteId = searchParams.get('quote_id');

  const { openTab, closeTab, activeTabId } = useTabsStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [ocrData, setOcrData] = useState<OcrData | null>(null);

  const [form, setForm] = useState({
    supplier_id: supplierId || '',
    supplier_quote_id: quoteId || '',
    numero: '',
    date_facture: new Date().toISOString().split('T')[0],
    date_echeance: '',
    total_ht: '',
    total_tva: '',
    total_ttc: '',
    vat_enabled: true,
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

      // If we have a quote_id, load the quote to pre-fill
      if (quoteId) {
        const quoteRes = await fetch(`/api/suppliers/quotes/${quoteId}`);
        if (quoteRes.ok) {
          const quoteData = await quoteRes.json();
          const quote: SupplierQuote = quoteData.data;

          setForm(prev => ({
            ...prev,
            supplier_id: quote.supplier_id,
            supplier_quote_id: quote.id,
            total_ht: quote.total_ht?.toString() || '',
            total_tva: quote.total_tva?.toString() || '',
            total_ttc: quote.total_ttc?.toString() || '',
            vat_enabled: quote.vat_enabled,
          }));
        }
      } else if (supplierId) {
        // Set VAT from pre-selected supplier
        const suppliersData = await (await fetch('/api/suppliers')).json();
        const supplier = (suppliersData.data || []).find((s: Supplier) => s.id === supplierId);
        if (supplier) {
          setForm(prev => ({ ...prev, vat_enabled: supplier.vat_enabled }));
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', 'invoice');
      formData.append('folder', 'supplier-invoices');

      const res = await fetch('/api/ocr/extract', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur OCR');
      }

      setDocumentUrl(data.document_url);
      setOcrData(data.data);

      // Pre-fill form with OCR data
      if (data.data) {
        const ocr = data.data;

        // Try to match supplier
        if (ocr.supplier_name) {
          const matchedSupplier = suppliers.find(
            s => s.nom.toLowerCase().includes(ocr.supplier_name.toLowerCase()) ||
                 ocr.supplier_name.toLowerCase().includes(s.nom.toLowerCase())
          );
          if (matchedSupplier) {
            setForm(prev => ({
              ...prev,
              supplier_id: matchedSupplier.id,
              vat_enabled: matchedSupplier.vat_enabled,
            }));
          }
        }

        setForm(prev => ({
          ...prev,
          numero: ocr.numero || prev.numero,
          date_facture: ocr.date_facture || prev.date_facture,
          date_echeance: ocr.date_echeance || prev.date_echeance,
          total_ht: ocr.total_ht?.toString() || prev.total_ht,
          total_tva: ocr.total_tva?.toString() || prev.total_tva,
          total_ttc: ocr.total_ttc?.toString() || prev.total_ttc,
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du traitement');
    } finally {
      setUploading(false);
    }
  }

  function handleSupplierChange(supplierId: string) {
    const supplier = suppliers.find(s => s.id === supplierId);
    setForm(prev => ({
      ...prev,
      supplier_id: supplierId,
      vat_enabled: supplier?.vat_enabled ?? true,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = {
        supplier_id: form.supplier_id,
        supplier_quote_id: form.supplier_quote_id || null,
        numero: form.numero || null,
        date_facture: form.date_facture || null,
        date_echeance: form.date_echeance || null,
        total_ht: form.total_ht ? parseFloat(form.total_ht) : null,
        total_tva: form.total_tva ? parseFloat(form.total_tva) : null,
        total_ttc: form.total_ttc ? parseFloat(form.total_ttc) : null,
        vat_enabled: form.vat_enabled,
        notes: form.notes || null,
        document_url: documentUrl,
        ocr_data: ocrData,
      };

      const res = await fetch('/api/suppliers/invoices', {
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
        type: 'supplier-invoice',
        path: `/suppliers/invoices/${data.data.id}`,
        title: data.data.numero || 'Facture',
        entityId: data.data.id,
      }, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Nouvelle facture fournisseur</h1>

      {/* OCR Upload */}
      <Card className="mb-6">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Scanner un document</h2>
          <p className="text-sm text-gray-500 mb-4">
            Uploadez une image ou un PDF de la facture pour extraction automatique.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileUpload}
            className="hidden"
          />

          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? 'Analyse en cours...' : 'Uploader un document'}
            </Button>

            {documentUrl && (
              <a
                href={documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                Voir le document
              </a>
            )}
          </div>

          {ocrData && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700">
                Données extraites avec succès. Vérifiez et corrigez si nécessaire.
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Form */}
      <Card>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fournisseur *
            </label>
            <select
              value={form.supplier_id}
              onChange={(e) => handleSupplierChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Sélectionner un fournisseur</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.nom}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Numéro de facture
              </label>
              <input
                type="text"
                value={form.numero}
                onChange={(e) => setForm({ ...form, numero: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="FA-2024-001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de facture
              </label>
              <input
                type="date"
                value={form.date_facture}
                onChange={(e) => setForm({ ...form, date_facture: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date d'échéance
            </label>
            <input
              type="date"
              value={form.date_echeance}
              onChange={(e) => setForm({ ...form, date_echeance: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
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
              TVA appliquée
            </label>
          </div>

          {form.vat_enabled ? (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total HT
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.total_ht}
                  onChange={(e) => setForm({ ...form, total_ht: e.target.value })}
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
                  value={form.total_tva}
                  onChange={(e) => setForm({ ...form, total_tva: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total TTC
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.total_ttc}
                  onChange={(e) => setForm({ ...form, total_ttc: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Montant total
              </label>
              <input
                type="number"
                step="0.01"
                value={form.total_ttc}
                onChange={(e) => setForm({ ...form, total_ttc: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Remarques..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => activeTabId && closeTab(activeTabId)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading || !form.supplier_id}>
              {loading ? 'Création...' : 'Créer la facture'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default function NewSupplierInvoicePage() {
  return (
    <Suspense fallback={
      <div className="p-6 max-w-3xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    }>
      <NewSupplierInvoiceContent />
    </Suspense>
  );
}
