'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useTabsStore } from '@/lib/stores/tabs-store';

interface SupplierQuote {
  id: string;
  reference: string | null;
  date_devis: string | null;
  total_ttc: number | null;
  status: string;
  is_selected: boolean;
  supplier: {
    id: string;
    nom: string;
  } | null;
  consultation: {
    id: string;
    title: string;
  } | null;
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

export default function SupplierQuotesPage() {
  const { openTab } = useTabsStore();
  const [quotes, setQuotes] = useState<SupplierQuote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuotes();
  }, []);

  async function loadQuotes() {
    setLoading(true);
    try {
      const res = await fetch('/api/suppliers/quotes');
      if (res.ok) {
        const data = await res.json();
        setQuotes(data.data || []);
      }
    } catch (error) {
      console.error('Error loading quotes:', error);
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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Devis fournisseurs</h1>
          <p className="text-sm text-gray-500 mt-1">
            Tous les devis reçus de vos fournisseurs
          </p>
        </div>
        <Button
          onClick={() => openTab({
            type: 'new-supplier-quote',
            path: '/suppliers/quotes/new',
            title: 'Nouveau devis',
          }, true)}
        >
          Ajouter un devis
        </Button>
      </div>

      <Card>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Chargement...</div>
        ) : quotes.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 mb-4">Aucun devis fournisseur</p>
            <Button
              onClick={() => openTab({
                type: 'new-supplier-quote',
                path: '/suppliers/quotes/new',
                title: 'Nouveau devis',
              }, true)}
            >
              Ajouter le premier devis
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Référence</TableHead>
                <TableHead>Fournisseur</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Montant TTC</TableHead>
                <TableHead>Consultation</TableHead>
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
                  <TableCell>{quote.supplier?.nom || '-'}</TableCell>
                  <TableCell>{formatDate(quote.date_devis)}</TableCell>
                  <TableCell>{formatAmount(quote.total_ttc)}</TableCell>
                  <TableCell>
                    {quote.consultation ? (
                      <Badge variant="blue">{quote.consultation.title}</Badge>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant={statusVariants[quote.status] || 'gray'}>
                        {statusLabels[quote.status] || quote.status}
                      </Badge>
                      {quote.is_selected && (
                        <Badge variant="green">Retenu</Badge>
                      )}
                    </div>
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
