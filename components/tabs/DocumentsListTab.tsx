'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useTabsStore } from '@/lib/stores/tabs-store';
import { EntitySelectionModal } from '@/components/documents/EntitySelectionModal';

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

interface Brief {
  id: string;
  title: string;
  created_at: string;
  status: string;
  client: { nom: string } | null;
  deal: { title: string } | null;
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
};

const statusLabels: Record<string, string> = {
  brouillon: 'Brouillon',
  draft: 'Brouillon',
  envoye: 'Envoyé',
  sent: 'Envoyé',
  envoyee: 'Envoyée',
  accepted: 'Acceptée',
  refused: 'Refusée',
  payee: 'Payée',
  paid: 'Payée',
  DRAFT: 'Brouillon',
  SENT: 'Envoye',
  RESPONDED: 'Repondu',
};

interface DocumentsListTabProps {
  initialTab?: 'quotes' | 'invoices' | 'proposals' | 'briefs';
}

type DocumentTab = 'quotes' | 'invoices' | 'proposals' | 'briefs';

export function DocumentsListTab({ initialTab = 'quotes' }: DocumentsListTabProps) {
  const { openTab } = useTabsStore();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DocumentTab>(initialTab);

  // Modal state for entity selection
  const [showMissionModal, setShowMissionModal] = useState(false);
  const [showDealModal, setShowDealModal] = useState(false);

  const handleTabChange = (value: string) => {
    setActiveTab(value as DocumentTab);
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  async function loadDocuments() {
    setLoading(true);
    try {
      const supabase = createClient();

      // Charger les devis
      const { data: quotesData, error: quotesError } = await supabase
        .from('quotes')
        .select(`
          *,
          client:clients(nom)
        `)
        .is('deleted_at', null)
        .order('date_emission', { ascending: false });

      if (quotesError) {
        console.error('Error loading quotes:', quotesError);
      } else {
        setQuotes(quotesData as Quote[] || []);
      }

      // Charger les factures avec leur lien mission via la table de jonction
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select(`
          *,
          client:clients(nom),
          mission_invoices(mission_id)
        `)
        .is('deleted_at', null)
        .order('date_emission', { ascending: false });

      if (invoicesError) {
        console.error('Error loading invoices:', invoicesError);
      } else {
        // Transformer pour ajouter mission_id depuis la relation
        const transformedInvoices = (invoicesData || []).map(inv => ({
          ...inv,
          mission_id: inv.mission_invoices?.[0]?.mission_id || null,
        }));
        setInvoices(transformedInvoices as Invoice[]);
      }

      // Charger les propositions
      const { data: proposalsData, error: proposalsError } = await supabase
        .from('proposals')
        .select(`
          *,
          client:clients(nom)
        `)
        .order('created_at', { ascending: false });

      if (proposalsError) {
        console.error('Error loading proposals:', proposalsError);
      } else {
        setProposals(proposalsData as Proposal[] || []);
      }

      // Charger les briefs
      const { data: briefsData, error: briefsError } = await supabase
        .from('briefs')
        .select(`
          *,
          client:clients(nom),
          deal:deals(title)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (briefsError) {
        console.error('Error loading briefs:', briefsError);
      } else {
        setBriefs(briefsData as Brief[] || []);
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

  function handleNewQuote() {
    // Open deal selection modal
    setShowDealModal(true);
  }

  function handleNewInvoice() {
    // Open mission selection modal
    setShowMissionModal(true);
  }

  function handleDealSelected(dealId: string, dealTitle: string) {
    openTab({
      type: 'new-quote-for-deal',
      path: `#new-quote-for-deal-${dealId}`,
      title: 'Nouveau Devis',
      entityId: dealId,
    });
  }

  function handleMissionSelected(missionId: string, missionTitle: string) {
    openTab({
      type: 'new-invoice-for-mission',
      path: `#new-invoice-for-mission-${missionId}`,
      title: 'Nouvelle Facture',
      entityId: missionId,
    });
  }

  function handleNewProposal() {
    openTab({
      type: 'new-proposal',
      path: '/proposals/new',
      title: 'Nouvelle Proposition',
    });
  }

  function handleProposalTemplates() {
    openTab({
      type: 'proposal-templates',
      path: '/proposals/templates',
      title: 'Templates propositions',
    });
  }

  function handleNewBrief() {
    openTab({
      type: 'new-brief',
      path: '/briefs/new',
      title: 'Nouveau Brief',
    });
  }

  function handleBriefTemplates() {
    openTab({
      type: 'brief-templates',
      path: '/briefs/templates',
      title: 'Templates briefs',
    });
  }

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleNewQuote}>
            Nouveau Devis
          </Button>
          <Button variant="outline" onClick={handleNewInvoice}>
            Nouvelle Facture
          </Button>
          <Button variant="outline" onClick={handleNewProposal}>
            Nouvelle Proposition
          </Button>
          <Button variant="outline" onClick={handleNewBrief}>
            Nouveau Brief
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="quotes">Devis ({quotes.length})</TabsTrigger>
          <TabsTrigger value="invoices">Factures ({invoices.length})</TabsTrigger>
          <TabsTrigger value="proposals">Propositions ({proposals.length})</TabsTrigger>
          <TabsTrigger value="briefs">Briefs ({briefs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="quotes">
          <Card>
            {loading ? (
              <div className="p-8 text-center text-gray-500">Chargement...</div>
            ) : quotes.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500 mb-4">Aucun devis</p>
                <Button onClick={handleNewQuote}>
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
                      onClick={() => openTab({
                        type: 'quote',
                        path: `/quotes/${quote.id}`,
                        title: quote.numero,
                        entityId: quote.id,
                      })}
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
                <Button onClick={handleNewInvoice}>
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
                      onClick={() => openTab({
                        type: 'invoice',
                        path: `/invoices/${invoice.id}`,
                        title: invoice.numero,
                        entityId: invoice.id,
                      })}
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
          <div className="flex justify-end mb-4">
            <Button variant="outline" size="sm" onClick={handleProposalTemplates}>
              Gerer les templates
            </Button>
          </div>
          <Card>
            {loading ? (
              <div className="p-8 text-center text-gray-500">Chargement...</div>
            ) : proposals.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500 mb-4">Aucune proposition</p>
                <Button onClick={handleNewProposal}>
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
                      onClick={() => openTab({
                        type: 'proposal',
                        path: `/proposals/${proposal.id}`,
                        title: proposal.titre,
                        entityId: proposal.id,
                      })}
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

        <TabsContent value="briefs">
          <div className="flex justify-end mb-4">
            <Button variant="outline" size="sm" onClick={handleBriefTemplates}>
              Gerer les templates
            </Button>
          </div>
          <Card>
            {loading ? (
              <div className="p-8 text-center text-gray-500">Chargement...</div>
            ) : briefs.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500 mb-4">Aucun brief</p>
                <Button onClick={handleNewBrief}>
                  Creer un brief
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titre</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Deal</TableHead>
                    <TableHead>Date creation</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {briefs.map((brief) => (
                    <TableRow
                      key={brief.id}
                      onClick={() => openTab({
                        type: 'brief',
                        path: `/briefs/${brief.id}`,
                        title: brief.title,
                        entityId: brief.id,
                      })}
                      className="cursor-pointer hover:bg-gray-50"
                    >
                      <TableCell className="font-medium">{brief.title}</TableCell>
                      <TableCell>{brief.client?.nom || '-'}</TableCell>
                      <TableCell>{brief.deal?.title || '-'}</TableCell>
                      <TableCell>{formatDate(brief.created_at)}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariants[brief.status] || 'gray'}>
                          {statusLabels[brief.status] || brief.status}
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

      {/* Mission Selection Modal for Invoice */}
      <EntitySelectionModal
        isOpen={showMissionModal}
        onClose={() => setShowMissionModal(false)}
        entityType="mission"
        onSelect={handleMissionSelected}
      />

      {/* Deal Selection Modal for Quote */}
      <EntitySelectionModal
        isOpen={showDealModal}
        onClose={() => setShowDealModal(false)}
        entityType="deal"
        onSelect={handleDealSelected}
      />
    </div>
  );
}
