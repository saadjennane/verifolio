'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useTabsStore } from '@/lib/stores/tabs-store';

interface SupplierInvoice {
  id: string;
  numero: string | null;
  date_facture: string | null;
  date_echeance: string | null;
  total_ttc: number | null;
  status: string;
  supplier: {
    id: string;
    nom: string;
  } | null;
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

export default function SupplierInvoicesPage() {
  const { openTab } = useTabsStore();
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');

  useEffect(() => {
    loadInvoices();
  }, []);

  async function loadInvoices() {
    setLoading(true);
    try {
      const res = await fetch('/api/suppliers/invoices');
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.data || []);
      }
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoading(false);
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

  function isOverdue(invoice: SupplierInvoice): boolean {
    if (invoice.status === 'paid' || !invoice.date_echeance) return false;
    return new Date(invoice.date_echeance) < new Date();
  }

  const filteredInvoices = invoices.filter((invoice) => {
    if (filter === 'all') return true;
    if (filter === 'overdue') return isOverdue(invoice);
    return invoice.status === filter;
  });

  const stats = {
    pending: invoices.filter(i => i.status === 'pending').length,
    overdue: invoices.filter(i => isOverdue(i)).length,
    paid: invoices.filter(i => i.status === 'paid').length,
    totalPending: invoices
      .filter(i => i.status === 'pending')
      .reduce((sum, i) => sum + (i.total_ttc || 0), 0),
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Factures fournisseurs</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gérez les factures reçues de vos fournisseurs
          </p>
        </div>
        <Button
          onClick={() => openTab({
            type: 'new-supplier-invoice',
            path: '/suppliers/invoices/new',
            title: 'Nouvelle facture',
          }, true)}
        >
          Ajouter une facture
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <p className="text-sm text-gray-500">En attente</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">En retard</p>
          <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Payées</p>
          <p className="text-2xl font-bold text-green-600">{stats.paid}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Total à payer</p>
          <p className="text-2xl font-bold text-gray-900">{formatAmount(stats.totalPending)}</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <Button
          size="sm"
          variant={filter === 'all' ? 'primary' : 'outline'}
          onClick={() => setFilter('all')}
        >
          Toutes
        </Button>
        <Button
          size="sm"
          variant={filter === 'pending' ? 'primary' : 'outline'}
          onClick={() => setFilter('pending')}
        >
          En attente ({stats.pending})
        </Button>
        <Button
          size="sm"
          variant={filter === 'overdue' ? 'primary' : 'outline'}
          onClick={() => setFilter('overdue')}
        >
          En retard ({stats.overdue})
        </Button>
        <Button
          size="sm"
          variant={filter === 'paid' ? 'primary' : 'outline'}
          onClick={() => setFilter('paid')}
        >
          Payées ({stats.paid})
        </Button>
      </div>

      <Card>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Chargement...</div>
        ) : filteredInvoices.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 mb-4">
              {filter === 'all' ? 'Aucune facture fournisseur' : 'Aucune facture pour ce filtre'}
            </p>
            {filter === 'all' && (
              <Button
                onClick={() => openTab({
                  type: 'new-supplier-invoice',
                  path: '/suppliers/invoices/new',
                  title: 'Nouvelle facture',
                }, true)}
              >
                Ajouter la première facture
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numéro</TableHead>
                <TableHead>Fournisseur</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Échéance</TableHead>
                <TableHead>Montant TTC</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice) => (
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
                  <TableCell>{invoice.supplier?.nom || '-'}</TableCell>
                  <TableCell>{formatDate(invoice.date_facture)}</TableCell>
                  <TableCell>
                    <span className={isOverdue(invoice) ? 'text-red-600 font-medium' : ''}>
                      {formatDate(invoice.date_echeance)}
                    </span>
                  </TableCell>
                  <TableCell>{formatAmount(invoice.total_ttc)}</TableCell>
                  <TableCell>
                    <Badge variant={isOverdue(invoice) ? 'red' : statusVariants[invoice.status] || 'gray'}>
                      {isOverdue(invoice) ? 'En retard' : statusLabels[invoice.status] || invoice.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
