'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface Quote {
  id: string;
  numero: string;
  date_emission: string;
  status: string;
  total_ttc: number;
  client: { nom: string } | null;
  deal_id: string | null;
}

interface Invoice {
  id: string;
  numero: string;
  date_emission: string;
  status: string;
  total_ttc: number;
  client: { nom: string } | null;
  mission_id: string | null;
}

interface Proposal {
  id: string;
  titre: string;
  created_at: string;
  status: string;
  client: { nom: string } | null;
}

const statusVariants: Record<string, 'gray' | 'blue' | 'green' | 'yellow' | 'red'> = {
  brouillon: 'gray',
  draft: 'gray',
  envoye: 'blue',
  sent: 'blue',
  envoyee: 'blue',
  accepted: 'green',
  refused: 'red',
  payee: 'green',
  paid: 'green',
  pending: 'yellow',
  rejected: 'red',
  overdue: 'red',
  cancelled: 'gray',
  open: 'blue',
  closed: 'green',
};

const statusLabels: Record<string, string> = {
  brouillon: 'Brouillon',
  draft: 'Brouillon',
  envoye: 'Envoyé',
  sent: 'Envoyé',
  envoyee: 'Envoyée',
  accepted: 'Accepté',
  refused: 'Refusée',
  payee: 'Payée',
  paid: 'Payée',
  pending: 'En attente',
  rejected: 'Rejeté',
  overdue: 'En retard',
  cancelled: 'Annulé',
  open: 'En cours',
  closed: 'Clôturée',
};

function DocumentsContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(
    tabParam && ['quotes', 'invoices', 'proposals'].includes(tabParam) ? tabParam : 'quotes'
  );

  useEffect(() => {
    loadDocuments();
  }, []);

  // Mettre à jour l'onglet actif si le paramètre URL change
  useEffect(() => {
    if (tabParam && ['quotes', 'invoices', 'proposals'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  async function loadDocuments() {
    setLoading(true);
    try {
      // Charger les devis
      const quotesRes = await fetch('/api/quotes');
      if (quotesRes.ok) {
        const quotesData = await quotesRes.json();
        setQuotes(quotesData.data || []);
      }

      // Charger les factures
      const invoicesRes = await fetch('/api/invoices');
      if (invoicesRes.ok) {
        const invoicesData = await invoicesRes.json();
        setInvoices(invoicesData.data || []);
      }

      // Charger les propositions
      const proposalsRes = await fetch('/api/proposals');
      if (proposalsRes.ok) {
        const proposalsData = await proposalsRes.json();
        setProposals(proposalsData.proposals || []);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
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

  function formatAmount(amount: number | null | undefined) {
    if (!amount) return '-';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Documents</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.location.href = '/quotes/new'}>
            Nouveau Devis
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/invoices/new'}>
            Nouvelle Facture
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/proposals/new'}>
            Nouvelle Proposition
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="quotes">Devis ({quotes.length})</TabsTrigger>
          <TabsTrigger value="invoices">Factures ({invoices.length})</TabsTrigger>
          <TabsTrigger value="proposals">Propositions ({proposals.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="quotes">
          <Card>
            {loading ? (
              <div className="p-8 text-center text-gray-500">Chargement...</div>
            ) : quotes.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500 mb-4">Aucun devis</p>
                <Button onClick={() => window.location.href = '/quotes/new'}>
                  Créer un devis
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Numéro</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Montant TTC</TableHead>
                    <TableHead>Deal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotes.map((quote) => (
                    <TableRow
                      key={quote.id}
                      onClick={() => window.location.href = `/quotes/${quote.id}`}
                      className="cursor-pointer hover:bg-gray-50"
                    >
                      <TableCell className="font-medium">{quote.numero}</TableCell>
                      <TableCell>{quote.client?.nom || '-'}</TableCell>
                      <TableCell>{formatDate(quote.date_emission)}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariants[quote.status] || 'gray'}>
                          {statusLabels[quote.status] || quote.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatAmount(quote.total_ttc)}</TableCell>
                      <TableCell>
                        {quote.deal_id ? (
                          <Badge variant="blue">Lié</Badge>
                        ) : (
                          <Badge variant="gray">Non lié</Badge>
                        )}
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
            {loading ? (
              <div className="p-8 text-center text-gray-500">Chargement...</div>
            ) : invoices.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500 mb-4">Aucune facture</p>
                <Button onClick={() => window.location.href = '/invoices/new'}>
                  Créer une facture
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Numéro</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Montant TTC</TableHead>
                    <TableHead>Mission</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow
                      key={invoice.id}
                      onClick={() => window.location.href = `/invoices/${invoice.id}`}
                      className="cursor-pointer hover:bg-gray-50"
                    >
                      <TableCell className="font-medium">{invoice.numero}</TableCell>
                      <TableCell>{invoice.client?.nom || '-'}</TableCell>
                      <TableCell>{formatDate(invoice.date_emission)}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariants[invoice.status] || 'gray'}>
                          {statusLabels[invoice.status] || invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatAmount(invoice.total_ttc)}</TableCell>
                      <TableCell>
                        {invoice.mission_id ? (
                          <Badge variant="blue">Liée</Badge>
                        ) : (
                          <Badge variant="gray">Non liée</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="proposals">
          <Card>
            {loading ? (
              <div className="p-8 text-center text-gray-500">Chargement...</div>
            ) : proposals.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500 mb-4">Aucune proposition</p>
                <Button onClick={() => window.location.href = '/proposals/new'}>
                  Créer une proposition
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titre</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Date création</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {proposals.map((proposal) => (
                    <TableRow
                      key={proposal.id}
                      onClick={() => window.location.href = `/proposals/${proposal.id}`}
                      className="cursor-pointer hover:bg-gray-50"
                    >
                      <TableCell className="font-medium">{proposal.titre}</TableCell>
                      <TableCell>{proposal.client?.nom || '-'}</TableCell>
                      <TableCell>{formatDate(proposal.created_at)}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariants[proposal.status] || 'gray'}>
                          {statusLabels[proposal.status] || proposal.status}
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

      {/* Separator */}
      <div className="mt-8 mb-4 border-t border-gray-200 pt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Fournisseurs & Dépenses</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => window.location.href = '/suppliers'}
          >
            <div className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Fournisseurs</h3>
                  <p className="text-sm text-gray-500">Gérer vos fournisseurs</p>
                </div>
              </div>
            </div>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => window.location.href = '/suppliers/consultations'}
          >
            <div className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Consultations</h3>
                  <p className="text-sm text-gray-500">Comparer les devis</p>
                </div>
              </div>
            </div>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => window.location.href = '/suppliers/invoices'}
          >
            <div className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Factures fournisseurs</h3>
                  <p className="text-sm text-gray-500">Factures reçues</p>
                </div>
              </div>
            </div>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => window.location.href = '/expenses'}
          >
            <div className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Dépenses</h3>
                  <p className="text-sm text-gray-500">Suivre vos dépenses</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Card className="mt-6">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-2">À propos des documents</h2>
          <div className="text-sm text-gray-600 space-y-2">
            <p><strong>Devis:</strong> Liés aux Deals. Un devis est obligatoire pour passer un deal en statut SENT.</p>
            <p><strong>Propositions:</strong> Documents commerciaux avec templates personnalisables.</p>
            <p><strong>Factures:</strong> Liées aux Missions. Gèrent automatiquement les statuts de mission (INVOICED, PAID).</p>
            <p><strong>Fournisseurs:</strong> Gérez vos fournisseurs, devis et factures reçus avec extraction OCR.</p>
            <p><strong>Dépenses:</strong> Suivez vos dépenses par catégorie, liées ou non à des factures fournisseurs.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function DocumentsPage() {
  return (
    <Suspense fallback={
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    }>
      <DocumentsContent />
    </Suspense>
  );
}
