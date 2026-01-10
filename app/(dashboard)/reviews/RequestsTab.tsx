'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/Button';
import { Eye } from 'lucide-react';

interface ReviewRequest {
  id: string;
  title: string;
  status: 'sent' | 'pending' | 'responded';
  sent_at: string;
  client_id: string;
  invoice_id: string;
  created_at: string;
}

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' }> = {
  sent: { label: 'Envoyée', variant: 'default' },
  pending: { label: 'En attente', variant: 'secondary' },
  responded: { label: 'Répondue', variant: 'success' },
};

export default function RequestsTab() {
  const router = useRouter();
  const [requests, setRequests] = useState<ReviewRequest[]>([]);
  const [clients, setClients] = useState<Record<string, any>>({});
  const [invoices, setInvoices] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  async function fetchRequests() {
    try {
      setLoading(true);

      // Récupérer les demandes
      const resRequests = await fetch('/api/reviews/requests');
      const dataRequests = await resRequests.json();

      if (dataRequests.requests) {
        setRequests(dataRequests.requests);

        // Récupérer les clients
        const resClients = await fetch('/api/clients');
        const dataClients = await resClients.json();
        if (dataClients.clients) {
          const clientsMap: Record<string, any> = {};
          for (const client of dataClients.clients) {
            clientsMap[client.id] = client;
          }
          setClients(clientsMap);
        }

        // Récupérer les factures (via une requête simplifiée)
        // TODO: créer un endpoint pour récupérer les factures par IDs
        const invoiceIds = [...new Set(dataRequests.requests.map((r: any) => r.invoice_id))];
        const invoicesMap: Record<string, any> = {};

        // Pour l'instant, on stocke juste les IDs
        for (const id of invoiceIds) {
          if (typeof id === 'string') {
            invoicesMap[id] = { id, numero: `Facture ${id.slice(0, 8)}` };
          }
        }
        setInvoices(invoicesMap);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground">Chargement...</p>
      </Card>
    );
  }

  if (requests.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground">
          Aucune demande d'avis pour le moment.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Client</TableHead>
            <TableHead>Facture</TableHead>
            <TableHead>Titre</TableHead>
            <TableHead>Date envoi</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => {
            const client = clients[request.client_id];
            const invoice = invoices[request.invoice_id];
            const statusInfo = STATUS_LABELS[request.status] || STATUS_LABELS.sent;

            return (
              <TableRow key={request.id}>
                <TableCell className="font-medium">
                  {client?.nom || 'Client inconnu'}
                </TableCell>
                <TableCell>{invoice?.numero || '-'}</TableCell>
                <TableCell>{request.title}</TableCell>
                <TableCell>
                  {new Date(request.sent_at).toLocaleDateString('fr-FR')}
                </TableCell>
                <TableCell>
                  <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/reviews/requests/${request.id}`)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Détail
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
