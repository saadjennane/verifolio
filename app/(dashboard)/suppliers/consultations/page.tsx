'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useTabsStore } from '@/lib/stores/tabs-store';

interface Consultation {
  id: string;
  title: string;
  description: string | null;
  status: 'open' | 'closed' | 'cancelled';
  created_at: string;
  quotes_count?: number;
}

const statusVariants: Record<string, 'gray' | 'blue' | 'green' | 'yellow' | 'red'> = {
  open: 'blue',
  closed: 'green',
  cancelled: 'gray',
};

const statusLabels: Record<string, string> = {
  open: 'En cours',
  closed: 'Clôturée',
  cancelled: 'Annulée',
};

export default function ConsultationsPage() {
  const { openTab } = useTabsStore();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConsultations();
  }, []);

  async function loadConsultations() {
    setLoading(true);
    try {
      const res = await fetch('/api/suppliers/consultations');
      if (res.ok) {
        const data = await res.json();
        setConsultations(data.data || []);
      }
    } catch (error) {
      console.error('Error loading consultations:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Consultations fournisseurs</h1>
          <p className="text-sm text-gray-500 mt-1">
            Comparez les devis de plusieurs fournisseurs
          </p>
        </div>
        <Button
          onClick={() => openTab({
            type: 'new-supplier-consultation',
            path: '/suppliers/consultations/new',
            title: 'Nouvelle consultation',
          }, true)}
        >
          Nouvelle consultation
        </Button>
      </div>

      <Card>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Chargement...</div>
        ) : consultations.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 mb-4">Aucune consultation</p>
            <Button
              onClick={() => openTab({
                type: 'new-supplier-consultation',
                path: '/suppliers/consultations/new',
                title: 'Nouvelle consultation',
              }, true)}
            >
              Créer une consultation
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titre</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Devis reçus</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Créée le</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {consultations.map((consultation) => (
                <TableRow
                  key={consultation.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => openTab({
                    type: 'supplier-consultation',
                    path: `/suppliers/consultations/${consultation.id}`,
                    title: consultation.title,
                    entityId: consultation.id,
                  }, false)}
                >
                  <TableCell className="font-medium">{consultation.title}</TableCell>
                  <TableCell className="text-gray-500 max-w-xs truncate">
                    {consultation.description || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="gray">{consultation.quotes_count || 0}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariants[consultation.status]}>
                      {statusLabels[consultation.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(consultation.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
