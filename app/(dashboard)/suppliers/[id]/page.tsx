'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useTabsStore } from '@/lib/stores/tabs-store';

interface Supplier {
  id: string;
  nom: string;
  type: 'entreprise' | 'particulier';
  email: string | null;
  telephone: string | null;
  adresse: string | null;
  siret: string | null;
  tva_intracom: string | null;
  vat_enabled: boolean;
  notes: string | null;
  created_at: string;
}

interface SupplierQuote {
  id: string;
  reference: string | null;
  date_devis: string | null;
  total_ttc: number | null;
  status: string;
  consultation_id: string | null;
}

interface SupplierInvoice {
  id: string;
  numero: string | null;
  date_facture: string | null;
  total_ttc: number | null;
  status: string;
}

const statusVariants: Record<string, 'gray' | 'blue' | 'green' | 'yellow' | 'red'> = {
  pending: 'yellow',
  accepted: 'green',
  rejected: 'red',
  paid: 'green',
  overdue: 'red',
};

const statusLabels: Record<string, string> = {
  pending: 'En attente',
  accepted: 'Accepté',
  rejected: 'Refusé',
  paid: 'Payée',
  overdue: 'En retard',
};

export default function SupplierDetailPage() {
  const params = useParams();
  const supplierId = params.id as string;
  const { openTab, closeTab, updateTabTitle, activeTabId } = useTabsStore();

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [quotes, setQuotes] = useState<SupplierQuote[]>([]);
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Supplier>>({});
  const [activeDocTab, setActiveDocTab] = useState('quotes');

  useEffect(() => {
    loadSupplier();
  }, [supplierId]);

  async function loadSupplier() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/suppliers/${supplierId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors du chargement');
      }

      setSupplier(data.data);
      setForm(data.data);
      if (activeTabId) updateTabTitle(activeTabId, data.data.nom);

      // Load quotes
      const quotesRes = await fetch(`/api/suppliers/quotes?supplier_id=${supplierId}`);
      if (quotesRes.ok) {
        const quotesData = await quotesRes.json();
        setQuotes(quotesData.data || []);
      }

      // Load invoices
      const invoicesRes = await fetch(`/api/suppliers/invoices?supplier_id=${supplierId}`);
      if (invoicesRes.ok) {
        const invoicesData = await invoicesRes.json();
        setInvoices(invoicesData.data || []);
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
      const res = await fetch(`/api/suppliers/${supplierId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la sauvegarde');
      }

      setSupplier(data.data);
      setEditing(false);
      if (activeTabId) updateTabTitle(activeTabId, data.data.nom);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Supprimer ce fournisseur ?')) return;

    try {
      const res = await fetch(`/api/suppliers/${supplierId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur lors de la suppression');
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
    if (!amount) return '-';
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

  if (error && !supplier) {
    return (
      <div className="p-6">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!supplier) return null;

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{supplier.nom}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {supplier.type === 'entreprise' ? 'Entreprise' : 'Particulier'}
            {!supplier.vat_enabled && ' • Non assujetti TVA'}
          </p>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button variant="outline" onClick={() => { setEditing(false); setForm(supplier); }}>
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

      <div className="space-y-6">
        {/* Info Card */}
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Informations</h2>

            {editing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                  <input
                    type="text"
                    value={form.nom || ''}
                    onChange={(e) => setForm({ ...form, nom: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={form.type || 'entreprise'}
                    onChange={(e) => setForm({ ...form, type: e.target.value as 'entreprise' | 'particulier' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="entreprise">Entreprise</option>
                    <option value="particulier">Particulier</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={form.email || ''}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                    <input
                      type="tel"
                      value={form.telephone || ''}
                      onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                  <textarea
                    value={form.adresse || ''}
                    onChange={(e) => setForm({ ...form, adresse: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {form.type === 'entreprise' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">SIRET</label>
                      <input
                        type="text"
                        value={form.siret || ''}
                        onChange={(e) => setForm({ ...form, siret: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">TVA Intracommunautaire</label>
                      <input
                        type="text"
                        value={form.tva_intracom || ''}
                        onChange={(e) => setForm({ ...form, tva_intracom: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="vat_enabled"
                    checked={form.vat_enabled ?? true}
                    onChange={(e) => setForm({ ...form, vat_enabled: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="vat_enabled" className="text-sm text-gray-700">
                    Entité soumise à la TVA
                  </label>
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
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-gray-500">Email</dt>
                  <dd className="text-gray-900">{supplier.email || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Téléphone</dt>
                  <dd className="text-gray-900">{supplier.telephone || '-'}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-sm text-gray-500">Adresse</dt>
                  <dd className="text-gray-900 whitespace-pre-line">{supplier.adresse || '-'}</dd>
                </div>
                {supplier.type === 'entreprise' && (
                  <>
                    <div>
                      <dt className="text-sm text-gray-500">SIRET</dt>
                      <dd className="text-gray-900">{supplier.siret || '-'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">TVA Intracommunautaire</dt>
                      <dd className="text-gray-900">{supplier.tva_intracom || '-'}</dd>
                    </div>
                  </>
                )}
                <div className="col-span-2">
                  <dt className="text-sm text-gray-500">Notes</dt>
                  <dd className="text-gray-900 whitespace-pre-line">{supplier.notes || '-'}</dd>
                </div>
              </dl>
            )}
          </div>
        </Card>

        {/* Documents */}
        <Tabs value={activeDocTab} onValueChange={setActiveDocTab}>
          <TabsList>
            <TabsTrigger value="quotes">Devis ({quotes.length})</TabsTrigger>
            <TabsTrigger value="invoices">Factures ({invoices.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="quotes">
            <Card>
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="font-medium">Devis fournisseur</h3>
                <Button
                  size="sm"
                  onClick={() => openTab({
                    type: 'new-supplier-quote',
                    path: `/suppliers/quotes/new?supplier_id=${supplierId}`,
                    title: 'Nouveau devis',
                  }, true)}
                >
                  Ajouter un devis
                </Button>
              </div>
              {quotes.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  Aucun devis
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Référence</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Montant TTC</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quotes.map((quote) => (
                      <TableRow
                        key={quote.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => openTab({
                          type: 'supplier-quote',
                          path: `/suppliers/quotes/${quote.id}`,
                          title: quote.reference || 'Devis',
                          entityId: quote.id,
                        }, false)}
                      >
                        <TableCell className="font-medium">{quote.reference || '-'}</TableCell>
                        <TableCell>{formatDate(quote.date_devis)}</TableCell>
                        <TableCell>{formatAmount(quote.total_ttc)}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariants[quote.status] || 'gray'}>
                            {statusLabels[quote.status] || quote.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="invoices">
            <Card>
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="font-medium">Factures fournisseur</h3>
                <Button
                  size="sm"
                  onClick={() => openTab({
                    type: 'new-supplier-invoice',
                    path: `/suppliers/invoices/new?supplier_id=${supplierId}`,
                    title: 'Nouvelle facture',
                  }, true)}
                >
                  Ajouter une facture
                </Button>
              </div>
              {invoices.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  Aucune facture
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Numéro</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Montant TTC</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow
                        key={invoice.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => openTab({
                          type: 'supplier-invoice',
                          path: `/suppliers/invoices/${invoice.id}`,
                          title: invoice.numero || 'Facture',
                          entityId: invoice.id,
                        }, false)}
                      >
                        <TableCell className="font-medium">{invoice.numero || '-'}</TableCell>
                        <TableCell>{formatDate(invoice.date_facture)}</TableCell>
                        <TableCell>{formatAmount(invoice.total_ttc)}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariants[invoice.status] || 'gray'}>
                            {statusLabels[invoice.status] || invoice.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
