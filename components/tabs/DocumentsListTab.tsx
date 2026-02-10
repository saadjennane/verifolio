'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useTabsStore } from '@/lib/stores/tabs-store';
import { EntitySelectionModal } from '@/components/documents/EntitySelectionModal';
import { useBulkSelection } from '@/lib/hooks/useBulkSelection';
import { BulkActionBar } from '@/components/ui/BulkActionBar';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Upload, Building2, Users } from 'lucide-react';
import { getCurrencySymbol } from '@/lib/utils/currency';

// ================== TYPES ==================

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

interface DeliveryNote {
  id: string;
  numero: string;
  date_emission: string;
  status: string;
  client: { id: string; nom: string } | null;
  mission: { id: string; title: string } | null;
}

// Supplier document types
interface SupplierQuote {
  id: string;
  reference: string | null;
  date_devis: string | null;
  status: string;
  total_ttc: number | null;
  supplier: { id: string; nom: string } | null;
}

interface SupplierInvoice {
  id: string;
  numero: string | null;
  date_facture: string | null;
  status: string;
  total_ttc: number | null;
  supplier: { id: string; nom: string } | null;
}

interface SupplierDeliveryNote {
  id: string;
  reference: string | null;
  date_reception: string;
  supplier: { id: string; nom: string } | null;
}

interface PurchaseOrder {
  id: string;
  numero: string;
  date_emission: string;
  status: string;
  total_ttc: number | null;
  supplier: { id: string; nom: string } | null;
}

// ================== STATUS CONFIG ==================

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
  annulee: 'red',
  DRAFT: 'gray',
  SENT: 'blue',
  RESPONDED: 'green',
  signe: 'green',
  pending: 'yellow',
  overdue: 'red',
  cancelled: 'red',
  confirme: 'yellow',
  livre: 'green',
  annule: 'red',
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
  annulee: 'Annulée',
  DRAFT: 'Brouillon',
  SENT: 'Envoyé',
  RESPONDED: 'Répondu',
  signe: 'Signé',
  pending: 'En attente',
  overdue: 'En retard',
  cancelled: 'Annulé',
  confirme: 'Confirmé',
  livre: 'Livré',
  annule: 'Annulé',
};

// ================== PROPS ==================

interface DocumentsListTabProps {
  initialTab?: string;
  initialFamily?: 'clients' | 'suppliers';
}

type DocumentFamily = 'clients' | 'suppliers';
type ClientDocumentTab = 'proposals' | 'briefs' | 'quotes' | 'invoices' | 'delivery-notes';
type SupplierDocumentTab = 'supplier-quotes' | 'supplier-invoices' | 'supplier-delivery-notes' | 'purchase-orders';

// ================== COMPONENT ==================

export function DocumentsListTab({ initialTab, initialFamily = 'clients' }: DocumentsListTabProps) {
  const { openTab } = useTabsStore();

  // Family level state
  const [family, setFamily] = useState<DocumentFamily>(initialFamily);

  // Client documents
  const [clientTab, setClientTab] = useState<ClientDocumentTab>('quotes');
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);

  // Supplier documents
  const [supplierTab, setSupplierTab] = useState<SupplierDocumentTab>('supplier-invoices');
  const [supplierQuotes, setSupplierQuotes] = useState<SupplierQuote[]>([]);
  const [supplierInvoices, setSupplierInvoices] = useState<SupplierInvoice[]>([]);
  const [supplierDeliveryNotes, setSupplierDeliveryNotes] = useState<SupplierDeliveryNote[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);

  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState<string>('EUR');

  // Modal state
  const [showMissionModal, setShowMissionModal] = useState(false);
  const [showDealModal, setShowDealModal] = useState(false);
  const [showMissionModalForBL, setShowMissionModalForBL] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [supplierModalType, setSupplierModalType] = useState<'quote' | 'invoice' | 'delivery-note' | 'po'>('invoice');

  // Bulk selection for each document type
  const quotesBulk = useBulkSelection({ items: quotes, getItemId: (q) => q.id });
  const invoicesBulk = useBulkSelection({ items: invoices, getItemId: (i) => i.id });
  const proposalsBulk = useBulkSelection({ items: proposals, getItemId: (p) => p.id });
  const briefsBulk = useBulkSelection({ items: briefs, getItemId: (b) => b.id });
  const deliveryNotesBulk = useBulkSelection({ items: deliveryNotes, getItemId: (d) => d.id });

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Get current bulk selection based on active tab
  const getCurrentBulk = () => {
    if (family === 'clients') {
      switch (clientTab) {
        case 'quotes': return quotesBulk;
        case 'invoices': return invoicesBulk;
        case 'proposals': return proposalsBulk;
        case 'briefs': return briefsBulk;
        case 'delivery-notes': return deliveryNotesBulk;
      }
    }
    // For supplier docs, no bulk selection for now
    return quotesBulk;
  };

  const currentBulk = getCurrentBulk();

  const handleFamilyChange = (value: string) => {
    setFamily(value as DocumentFamily);
    // Exit selection mode when changing families
    quotesBulk.exitSelectionMode();
    invoicesBulk.exitSelectionMode();
    proposalsBulk.exitSelectionMode();
    briefsBulk.exitSelectionMode();
    deliveryNotesBulk.exitSelectionMode();
  };

  const handleClientTabChange = (value: string) => {
    quotesBulk.exitSelectionMode();
    invoicesBulk.exitSelectionMode();
    proposalsBulk.exitSelectionMode();
    briefsBulk.exitSelectionMode();
    deliveryNotesBulk.exitSelectionMode();
    setClientTab(value as ClientDocumentTab);
  };

  const handleSupplierTabChange = (value: string) => {
    setSupplierTab(value as SupplierDocumentTab);
  };

  useEffect(() => {
    loadDocuments();
    // Fetch currency setting
    fetch('/api/settings/currency')
      .then((res) => res.json())
      .then((response) => {
        if (response.data?.currency) setCurrency(response.data.currency);
      })
      .catch(console.error);
  }, []);

  async function loadDocuments() {
    setLoading(true);
    try {
      const supabase = createClient();

      // Load client documents
      const [quotesRes, invoicesRes, proposalsRes, briefsRes, deliveryNotesRes] = await Promise.all([
        supabase.from('quotes').select('*, client:clients(nom)').is('deleted_at', null).order('date_emission', { ascending: false }),
        supabase.from('invoices').select('*, client:clients(nom), mission_invoices(mission_id)').is('deleted_at', null).order('date_emission', { ascending: false }),
        supabase.from('proposals').select('*, client:clients(nom)').is('deleted_at', null).order('created_at', { ascending: false }),
        supabase.from('briefs').select('*, client:clients(nom), deal:deals(title)').is('deleted_at', null).order('created_at', { ascending: false }),
        supabase.from('delivery_notes').select('*, client:clients(id, nom), mission:missions(id, title)').is('deleted_at', null).order('date_emission', { ascending: false }),
      ]);

      if (!quotesRes.error) setQuotes(quotesRes.data as Quote[] || []);
      if (!invoicesRes.error) {
        const transformedInvoices = (invoicesRes.data || []).map(inv => ({
          ...inv,
          mission_id: inv.mission_invoices?.[0]?.mission_id || null,
        }));
        setInvoices(transformedInvoices as Invoice[]);
      }
      if (!proposalsRes.error) setProposals(proposalsRes.data as Proposal[] || []);
      if (!briefsRes.error) setBriefs(briefsRes.data as Brief[] || []);
      if (!deliveryNotesRes.error) setDeliveryNotes(deliveryNotesRes.data as DeliveryNote[] || []);

      // Load supplier documents
      const [sQuotesRes, sInvoicesRes, sDeliveryNotesRes, poRes] = await Promise.all([
        supabase.from('supplier_quotes').select('*, supplier:clients(id, nom)').is('deleted_at', null).order('created_at', { ascending: false }),
        supabase.from('supplier_invoices').select('*, supplier:clients(id, nom)').is('deleted_at', null).order('created_at', { ascending: false }),
        supabase.from('supplier_delivery_notes').select('*, supplier:clients(id, nom)').is('deleted_at', null).order('date_reception', { ascending: false }),
        supabase.from('purchase_orders').select('*, supplier:clients(id, nom)').is('deleted_at', null).order('date_emission', { ascending: false }),
      ]);

      if (!sQuotesRes.error) setSupplierQuotes(sQuotesRes.data as SupplierQuote[] || []);
      if (!sInvoicesRes.error) setSupplierInvoices(sInvoicesRes.data as SupplierInvoice[] || []);
      if (!sDeliveryNotesRes.error) setSupplierDeliveryNotes(sDeliveryNotesRes.data as SupplierDeliveryNote[] || []);
      if (!poRes.error) setPurchaseOrders(poRes.data as PurchaseOrder[] || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString: string | null) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  function formatAmount(amount: number | null | undefined) {
    if (!amount) return '-';
    const symbol = getCurrencySymbol(currency);
    return `${new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)} ${symbol}`;
  }

  // ================== CLIENT DOC HANDLERS ==================

  function handleNewQuote() {
    setShowDealModal(true);
  }

  function handleNewInvoice() {
    setShowMissionModal(true);
  }

  function handleNewDeliveryNote() {
    setShowMissionModalForBL(true);
  }

  function handleDealSelected(dealId: string) {
    openTab({
      type: 'new-quote-for-deal',
      path: `#new-quote-for-deal-${dealId}`,
      title: 'Nouveau Devis',
      entityId: dealId,
    });
  }

  function handleMissionSelected(missionId: string) {
    openTab({
      type: 'new-invoice-for-mission',
      path: `#new-invoice-for-mission-${missionId}`,
      title: 'Nouvelle Facture',
      entityId: missionId,
    });
  }

  function handleMissionSelectedForBL(missionId: string) {
    openTab({
      type: 'new-delivery-note-for-mission',
      path: `#new-delivery-note-for-mission-${missionId}`,
      title: 'Nouveau BL',
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

  // ================== SUPPLIER DOC HANDLERS ==================

  function handleNewPurchaseOrder() {
    setSupplierModalType('po');
    setShowSupplierModal(true);
  }

  function handleImportSupplierInvoice() {
    setSupplierModalType('invoice');
    setShowSupplierModal(true);
  }

  function handleImportSupplierQuote() {
    setSupplierModalType('quote');
    setShowSupplierModal(true);
  }

  function handleImportSupplierDeliveryNote() {
    setSupplierModalType('delivery-note');
    setShowSupplierModal(true);
  }

  function handleSupplierSelected(supplierId: string) {
    if (supplierModalType === 'po') {
      openTab({
        type: 'new-purchase-order',
        path: `#new-purchase-order-${supplierId}`,
        title: 'Nouveau Bon de Commande',
        entityId: supplierId,
      });
    } else if (supplierModalType === 'invoice') {
      openTab({
        type: 'new-supplier-invoice',
        path: `#new-supplier-invoice-${supplierId}`,
        title: 'Nouvelle Facture Fournisseur',
        entityId: supplierId,
      });
    } else if (supplierModalType === 'quote') {
      openTab({
        type: 'new-supplier-quote',
        path: `#new-supplier-quote-${supplierId}`,
        title: 'Nouveau Devis Fournisseur',
        entityId: supplierId,
      });
    } else if (supplierModalType === 'delivery-note') {
      openTab({
        type: 'new-supplier-delivery-note',
        path: `#new-supplier-delivery-note-${supplierId}`,
        title: 'Nouveau BL Fournisseur',
        entityId: supplierId,
      });
    }
    setShowSupplierModal(false);
  }

  // ================== BULK ACTIONS ==================

  async function handleBulkDelete() {
    setIsDeleting(true);
    try {
      const ids = currentBulk.selectedIds;
      const endpoint = family === 'clients' ? clientTab : supplierTab;
      const response = await fetch(`/api/${endpoint}/bulk`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(ids) }),
      });

      if (response.ok) {
        currentBulk.exitSelectionMode();
        loadDocuments();
      }
    } catch (error) {
      console.error('Bulk delete error:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  async function handleBulkStatusChange(newStatus: string) {
    try {
      const ids = currentBulk.selectedIds;
      const endpoint = family === 'clients' ? clientTab : supplierTab;
      const response = await fetch(`/api/${endpoint}/bulk`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(ids), updates: { status: newStatus } }),
      });

      if (response.ok) {
        currentBulk.exitSelectionMode();
        loadDocuments();
      }
    } catch (error) {
      console.error('Bulk status change error:', error);
    }
  }

  // Change status of a single document
  async function handleSingleStatusChange(
    docType: 'quotes' | 'invoices' | 'proposals' | 'briefs' | 'delivery-notes',
    docId: string,
    newStatus: string
  ) {
    try {
      const response = await fetch(`/api/${docType}/bulk`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [docId], updates: { status: newStatus } }),
      });

      if (response.ok) {
        loadDocuments();
      }
    } catch (error) {
      console.error('Status change error:', error);
    }
  }

  // Get status options based on document type
  function getStatusOptionsForDocType(docType: 'quotes' | 'invoices' | 'proposals' | 'briefs' | 'delivery-notes') {
    switch (docType) {
      case 'quotes':
        return [
          { value: 'brouillon', label: 'Brouillon' },
          { value: 'envoye', label: 'Envoyé' },
          { value: 'accepted', label: 'Accepté' },
          { value: 'refused', label: 'Refusé' },
        ];
      case 'invoices':
        return [
          { value: 'brouillon', label: 'Brouillon' },
          { value: 'envoyee', label: 'Envoyée' },
          { value: 'payee', label: 'Payée' },
          { value: 'annulee', label: 'Annulée' },
        ];
      case 'proposals':
      case 'briefs':
        return [
          { value: 'DRAFT', label: 'Brouillon' },
          { value: 'SENT', label: 'Envoyé' },
          { value: 'RESPONDED', label: 'Répondu' },
        ];
      case 'delivery-notes':
        return [
          { value: 'brouillon', label: 'Brouillon' },
          { value: 'envoye', label: 'Envoyé' },
          { value: 'signe', label: 'Signé' },
        ];
      default:
        return [];
    }
  }

  // Render a clickable status badge with dropdown
  function renderStatusBadge(
    docType: 'quotes' | 'invoices' | 'proposals' | 'briefs' | 'delivery-notes',
    docId: string,
    currentStatus: string
  ) {
    const options = getStatusOptionsForDocType(docType);
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <button className="focus:outline-none">
            <Badge
              variant={statusVariants[currentStatus] || 'gray'}
              className="cursor-pointer hover:opacity-80 transition-opacity"
            >
              {statusLabels[currentStatus] || currentStatus}
            </Badge>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
          {options.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => handleSingleStatusChange(docType, docId, option.value)}
              className={option.value === currentStatus ? 'bg-muted' : ''}
            >
              <Badge variant={statusVariants[option.value] || 'gray'} className="mr-2">
                {option.label}
              </Badge>
              {option.value === currentStatus && <span className="ml-auto text-xs">✓</span>}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const getStatusOptions = (): { value: string; label: string }[] => {
    if (family === 'clients') {
      switch (clientTab) {
        case 'quotes':
          return [
            { value: 'brouillon', label: 'Brouillon' },
            { value: 'envoye', label: 'Envoyé' },
          ];
        case 'invoices':
          return [
            { value: 'brouillon', label: 'Brouillon' },
            { value: 'envoyee', label: 'Envoyée' },
            { value: 'payee', label: 'Payée' },
            { value: 'annulee', label: 'Annulée' },
          ];
        case 'proposals':
        case 'briefs':
          return [
            { value: 'DRAFT', label: 'Brouillon' },
            { value: 'SENT', label: 'Envoyé' },
          ];
        case 'delivery-notes':
          return [
            { value: 'brouillon', label: 'Brouillon' },
            { value: 'envoye', label: 'Envoyé' },
            { value: 'signe', label: 'Signé' },
          ];
      }
    }
    return [];
  };

  const getDocumentTypeLabel = (): string => {
    if (family === 'clients') {
      switch (clientTab) {
        case 'quotes': return 'devis';
        case 'invoices': return 'factures';
        case 'proposals': return 'propositions';
        case 'briefs': return 'briefs';
        case 'delivery-notes': return 'bons de livraison';
      }
    }
    switch (supplierTab) {
      case 'supplier-quotes': return 'devis fournisseur';
      case 'supplier-invoices': return 'factures fournisseur';
      case 'supplier-delivery-notes': return 'BL fournisseur';
      case 'purchase-orders': return 'bons de commande';
    }
    return 'documents';
  };

  const getBulkActions = () => [
    {
      label: 'Supprimer',
      onClick: () => setShowDeleteConfirm(true),
      variant: 'destructive' as const,
    },
  ];

  // ================== RENDER HELPERS ==================

  const renderEmptyState = (message: string, onAction: () => void, actionLabel: string) => (
    <div className="p-8 text-center">
      <p className="text-gray-500 mb-4">{message}</p>
      <Button onClick={onAction}>{actionLabel}</Button>
    </div>
  );

  const renderClientDocuments = () => (
    <Tabs value={clientTab} onValueChange={handleClientTabChange}>
      <TabsList className="mb-4">
        <TabsTrigger value="proposals">Propositions ({proposals.length})</TabsTrigger>
        <TabsTrigger value="briefs">Briefs ({briefs.length})</TabsTrigger>
        <TabsTrigger value="quotes">Devis ({quotes.length})</TabsTrigger>
        <TabsTrigger value="invoices">Factures ({invoices.length})</TabsTrigger>
        <TabsTrigger value="delivery-notes">Bons de livraison ({deliveryNotes.length})</TabsTrigger>
      </TabsList>

      {/* Quotes */}
      <TabsContent value="quotes">
        <Card>
          {loading ? (
            <div className="p-8 text-center text-gray-500">Chargement...</div>
          ) : quotes.length === 0 ? (
            renderEmptyState('Aucun devis', handleNewQuote, 'Créer un devis')
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {quotesBulk.isSelectionMode && <TableHead className="w-10"></TableHead>}
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
                    onClick={() => {
                      if (quotesBulk.isSelectionMode) {
                        quotesBulk.toggleItem(quote.id);
                      } else {
                        openTab({
                          type: 'quote',
                          path: `/quotes/${quote.id}`,
                          title: quote.numero,
                          entityId: quote.id,
                        });
                      }
                    }}
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    {quotesBulk.isSelectionMode && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={quotesBulk.isSelected(quote.id)}
                          onCheckedChange={() => quotesBulk.toggleItem(quote.id)}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-medium">{quote.numero}</TableCell>
                    <TableCell>{quote.client?.nom || '-'}</TableCell>
                    <TableCell>{formatDate(quote.date_emission)}</TableCell>
                    <TableCell>
                      {renderStatusBadge('quotes', quote.id, quote.status)}
                    </TableCell>
                    <TableCell>{formatAmount(quote.total_ttc)}</TableCell>
                    <TableCell>
                      <Badge variant={quote.deal_id ? 'blue' : 'gray'}>
                        {quote.deal_id ? 'Lié' : 'Non lié'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </TabsContent>

      {/* Invoices */}
      <TabsContent value="invoices">
        <Card>
          {loading ? (
            <div className="p-8 text-center text-gray-500">Chargement...</div>
          ) : invoices.length === 0 ? (
            renderEmptyState('Aucune facture', handleNewInvoice, 'Créer une facture')
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {invoicesBulk.isSelectionMode && <TableHead className="w-10"></TableHead>}
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
                    onClick={() => {
                      if (invoicesBulk.isSelectionMode) {
                        invoicesBulk.toggleItem(invoice.id);
                      } else {
                        openTab({
                          type: 'invoice',
                          path: `/invoices/${invoice.id}`,
                          title: invoice.numero,
                          entityId: invoice.id,
                        });
                      }
                    }}
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    {invoicesBulk.isSelectionMode && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={invoicesBulk.isSelected(invoice.id)}
                          onCheckedChange={() => invoicesBulk.toggleItem(invoice.id)}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-medium">{invoice.numero}</TableCell>
                    <TableCell>{invoice.client?.nom || '-'}</TableCell>
                    <TableCell>{formatDate(invoice.date_emission)}</TableCell>
                    <TableCell>
                      {renderStatusBadge('invoices', invoice.id, invoice.status)}
                    </TableCell>
                    <TableCell>{formatAmount(invoice.total_ttc)}</TableCell>
                    <TableCell>
                      <Badge variant={invoice.mission_id ? 'blue' : 'gray'}>
                        {invoice.mission_id ? 'Liée' : 'Non liée'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </TabsContent>

      {/* Proposals */}
      <TabsContent value="proposals">
        <div className="flex justify-end mb-4">
          {!proposalsBulk.isSelectionMode && (
            <Button variant="outline" size="sm" onClick={handleProposalTemplates}>
              Gérer les templates
            </Button>
          )}
        </div>
        <Card>
          {loading ? (
            <div className="p-8 text-center text-gray-500">Chargement...</div>
          ) : proposals.length === 0 ? (
            renderEmptyState('Aucune proposition', handleNewProposal, 'Créer une proposition')
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {proposalsBulk.isSelectionMode && <TableHead className="w-10"></TableHead>}
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
                    onClick={() => {
                      if (proposalsBulk.isSelectionMode) {
                        proposalsBulk.toggleItem(proposal.id);
                      } else {
                        openTab({
                          type: 'proposal',
                          path: `/proposals/${proposal.id}`,
                          title: proposal.titre,
                          entityId: proposal.id,
                        });
                      }
                    }}
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    {proposalsBulk.isSelectionMode && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={proposalsBulk.isSelected(proposal.id)}
                          onCheckedChange={() => proposalsBulk.toggleItem(proposal.id)}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-medium">{proposal.titre}</TableCell>
                    <TableCell>{proposal.client?.nom || '-'}</TableCell>
                    <TableCell>{formatDate(proposal.created_at)}</TableCell>
                    <TableCell>
                      {renderStatusBadge('proposals', proposal.id, proposal.status)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </TabsContent>

      {/* Briefs */}
      <TabsContent value="briefs">
        <div className="flex justify-end mb-4">
          {!briefsBulk.isSelectionMode && (
            <Button variant="outline" size="sm" onClick={handleBriefTemplates}>
              Gérer les templates
            </Button>
          )}
        </div>
        <Card>
          {loading ? (
            <div className="p-8 text-center text-gray-500">Chargement...</div>
          ) : briefs.length === 0 ? (
            renderEmptyState('Aucun brief', handleNewBrief, 'Créer un brief')
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {briefsBulk.isSelectionMode && <TableHead className="w-10"></TableHead>}
                  <TableHead>Titre</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Deal</TableHead>
                  <TableHead>Date création</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {briefs.map((brief) => (
                  <TableRow
                    key={brief.id}
                    onClick={() => {
                      if (briefsBulk.isSelectionMode) {
                        briefsBulk.toggleItem(brief.id);
                      } else {
                        openTab({
                          type: 'brief',
                          path: `/briefs/${brief.id}`,
                          title: brief.title,
                          entityId: brief.id,
                        });
                      }
                    }}
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    {briefsBulk.isSelectionMode && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={briefsBulk.isSelected(brief.id)}
                          onCheckedChange={() => briefsBulk.toggleItem(brief.id)}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-medium">{brief.title}</TableCell>
                    <TableCell>{brief.client?.nom || '-'}</TableCell>
                    <TableCell>{brief.deal?.title || '-'}</TableCell>
                    <TableCell>{formatDate(brief.created_at)}</TableCell>
                    <TableCell>
                      {renderStatusBadge('briefs', brief.id, brief.status)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </TabsContent>

      {/* Delivery Notes */}
      <TabsContent value="delivery-notes">
        <Card>
          {loading ? (
            <div className="p-8 text-center text-gray-500">Chargement...</div>
          ) : deliveryNotes.length === 0 ? (
            renderEmptyState('Aucun bon de livraison', handleNewDeliveryNote, 'Créer un bon de livraison')
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {deliveryNotesBulk.isSelectionMode && <TableHead className="w-10"></TableHead>}
                  <TableHead>Numéro</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Mission</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveryNotes.map((dn) => (
                  <TableRow
                    key={dn.id}
                    onClick={() => {
                      if (deliveryNotesBulk.isSelectionMode) {
                        deliveryNotesBulk.toggleItem(dn.id);
                      } else {
                        openTab({
                          type: 'delivery-note',
                          path: `/delivery-notes/${dn.id}`,
                          title: dn.numero,
                          entityId: dn.id,
                        });
                      }
                    }}
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    {deliveryNotesBulk.isSelectionMode && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={deliveryNotesBulk.isSelected(dn.id)}
                          onCheckedChange={() => deliveryNotesBulk.toggleItem(dn.id)}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-medium">{dn.numero}</TableCell>
                    <TableCell>{dn.client?.nom || '-'}</TableCell>
                    <TableCell>{dn.mission?.title || '-'}</TableCell>
                    <TableCell>{formatDate(dn.date_emission)}</TableCell>
                    <TableCell>
                      {renderStatusBadge('delivery-notes', dn.id, dn.status)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </TabsContent>
    </Tabs>
  );

  const renderSupplierDocuments = () => (
    <Tabs value={supplierTab} onValueChange={handleSupplierTabChange}>
      <TabsList className="mb-4">
        <TabsTrigger value="supplier-invoices">Factures reçues ({supplierInvoices.length})</TabsTrigger>
        <TabsTrigger value="supplier-quotes">Devis reçus ({supplierQuotes.length})</TabsTrigger>
        <TabsTrigger value="supplier-delivery-notes">BL reçus ({supplierDeliveryNotes.length})</TabsTrigger>
        <TabsTrigger value="purchase-orders">Bons de commande ({purchaseOrders.length})</TabsTrigger>
      </TabsList>

      {/* Supplier Invoices */}
      <TabsContent value="supplier-invoices">
        <Card>
          {loading ? (
            <div className="p-8 text-center text-gray-500">Chargement...</div>
          ) : supplierInvoices.length === 0 ? (
            renderEmptyState('Aucune facture fournisseur', handleImportSupplierInvoice, 'Importer une facture')
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numéro</TableHead>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Montant TTC</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supplierInvoices.map((inv) => (
                  <TableRow
                    key={inv.id}
                    onClick={() => {
                      openTab({
                        type: 'supplier-invoice',
                        path: `/suppliers/invoices/${inv.id}`,
                        title: inv.numero || 'Facture fournisseur',
                        entityId: inv.id,
                      });
                    }}
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    <TableCell className="font-medium">{inv.numero || '-'}</TableCell>
                    <TableCell>{inv.supplier?.nom || '-'}</TableCell>
                    <TableCell>{formatDate(inv.date_facture)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariants[inv.status] || 'gray'}>
                        {statusLabels[inv.status] || inv.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatAmount(inv.total_ttc)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </TabsContent>

      {/* Supplier Quotes */}
      <TabsContent value="supplier-quotes">
        <Card>
          {loading ? (
            <div className="p-8 text-center text-gray-500">Chargement...</div>
          ) : supplierQuotes.length === 0 ? (
            renderEmptyState('Aucun devis fournisseur', handleImportSupplierQuote, 'Importer un devis')
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Référence</TableHead>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Montant TTC</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supplierQuotes.map((quote) => (
                  <TableRow
                    key={quote.id}
                    onClick={() => {
                      openTab({
                        type: 'supplier-quote',
                        path: `/suppliers/quotes/${quote.id}`,
                        title: quote.reference || 'Devis fournisseur',
                        entityId: quote.id,
                      });
                    }}
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    <TableCell className="font-medium">{quote.reference || '-'}</TableCell>
                    <TableCell>{quote.supplier?.nom || '-'}</TableCell>
                    <TableCell>{formatDate(quote.date_devis)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariants[quote.status] || 'gray'}>
                        {statusLabels[quote.status] || quote.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatAmount(quote.total_ttc)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </TabsContent>

      {/* Supplier Delivery Notes */}
      <TabsContent value="supplier-delivery-notes">
        <Card>
          {loading ? (
            <div className="p-8 text-center text-gray-500">Chargement...</div>
          ) : supplierDeliveryNotes.length === 0 ? (
            renderEmptyState('Aucun BL fournisseur', handleImportSupplierDeliveryNote, 'Importer un BL')
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Référence</TableHead>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead>Date réception</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supplierDeliveryNotes.map((dn) => (
                  <TableRow
                    key={dn.id}
                    onClick={() => {
                      openTab({
                        type: 'supplier-delivery-note',
                        path: `/suppliers/delivery-notes/${dn.id}`,
                        title: dn.reference || 'BL fournisseur',
                        entityId: dn.id,
                      });
                    }}
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    <TableCell className="font-medium">{dn.reference || '-'}</TableCell>
                    <TableCell>{dn.supplier?.nom || '-'}</TableCell>
                    <TableCell>{formatDate(dn.date_reception)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </TabsContent>

      {/* Purchase Orders */}
      <TabsContent value="purchase-orders">
        <Card>
          {loading ? (
            <div className="p-8 text-center text-gray-500">Chargement...</div>
          ) : purchaseOrders.length === 0 ? (
            renderEmptyState('Aucun bon de commande', handleNewPurchaseOrder, 'Créer un bon de commande')
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numéro</TableHead>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Montant TTC</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseOrders.map((po) => (
                  <TableRow
                    key={po.id}
                    onClick={() => {
                      openTab({
                        type: 'purchase-order',
                        path: `/purchase-orders/${po.id}`,
                        title: po.numero,
                        entityId: po.id,
                      });
                    }}
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    <TableCell className="font-medium">{po.numero}</TableCell>
                    <TableCell>{po.supplier?.nom || '-'}</TableCell>
                    <TableCell>{formatDate(po.date_emission)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariants[po.status] || 'gray'}>
                        {statusLabels[po.status] || po.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatAmount(po.total_ttc)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </TabsContent>
    </Tabs>
  );

  // ================== MAIN RENDER ==================

  return (
    <div className="p-6 h-full overflow-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
        <div className="flex gap-2">
          {family === 'clients' && !currentBulk.isSelectionMode && (
            <>
              {clientTab === 'quotes' && (
                <Button variant="outline" onClick={handleNewQuote}>Nouveau Devis</Button>
              )}
              {clientTab === 'invoices' && (
                <Button variant="outline" onClick={handleNewInvoice}>Nouvelle Facture</Button>
              )}
              {clientTab === 'proposals' && (
                <Button variant="outline" onClick={handleNewProposal}>Nouvelle Proposition</Button>
              )}
              {clientTab === 'briefs' && (
                <Button variant="outline" onClick={handleNewBrief}>Nouveau Brief</Button>
              )}
              {clientTab === 'delivery-notes' && (
                <Button variant="outline" onClick={handleNewDeliveryNote}>Nouveau BL</Button>
              )}
            </>
          )}
          {family === 'suppliers' && (
            <>
              {supplierTab === 'supplier-invoices' && (
                <Button variant="outline" onClick={handleImportSupplierInvoice}>
                  <Upload className="w-4 h-4 mr-2" />
                  Importer
                </Button>
              )}
              {supplierTab === 'supplier-quotes' && (
                <Button variant="outline" onClick={handleImportSupplierQuote}>
                  <Upload className="w-4 h-4 mr-2" />
                  Importer
                </Button>
              )}
              {supplierTab === 'supplier-delivery-notes' && (
                <Button variant="outline" onClick={handleImportSupplierDeliveryNote}>
                  <Upload className="w-4 h-4 mr-2" />
                  Importer
                </Button>
              )}
              {supplierTab === 'purchase-orders' && (
                <Button variant="outline" onClick={handleNewPurchaseOrder}>
                  Nouveau Bon de Commande
                </Button>
              )}
            </>
          )}
          {family === 'clients' && (
            <Button
              variant={currentBulk.isSelectionMode ? 'ghost' : 'outline'}
              onClick={currentBulk.isSelectionMode ? currentBulk.exitSelectionMode : currentBulk.enterSelectionMode}
            >
              {currentBulk.isSelectionMode ? 'Annuler' : 'Modifier'}
            </Button>
          )}
        </div>
      </div>

      {/* Family Tabs */}
      <Tabs value={family} onValueChange={handleFamilyChange} className="mb-6">
        <TabsList>
          <TabsTrigger value="clients" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Clients
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Fournisseurs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clients" className="mt-4">
          {renderClientDocuments()}
        </TabsContent>

        <TabsContent value="suppliers" className="mt-4">
          {renderSupplierDocuments()}
        </TabsContent>
      </Tabs>

      {/* Bulk Action Bar */}
      {family === 'clients' && currentBulk.hasSelection && (
        <BulkActionBar
          selectedCount={currentBulk.selectedCount}
          totalCount={currentBulk.totalCount}
          onSelectAll={currentBulk.selectAll}
          onDeselectAll={currentBulk.deselectAll}
          actions={getBulkActions()}
          onExit={currentBulk.exitSelectionMode}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Changer statut <ChevronDown className="ml-1 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {getStatusOptions().map((option) => (
                <DropdownMenuItem key={option.value} onClick={() => handleBulkStatusChange(option.value)}>
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </BulkActionBar>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title={`Supprimer les ${getDocumentTypeLabel()}`}
        description={`${currentBulk.selectedCount} ${getDocumentTypeLabel()} seront supprimés. Cette action est réversible.`}
        confirmLabel="Supprimer"
        variant="destructive"
        loading={isDeleting}
        onConfirm={handleBulkDelete}
      />

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

      {/* Mission Selection Modal for Delivery Note */}
      <EntitySelectionModal
        isOpen={showMissionModalForBL}
        onClose={() => setShowMissionModalForBL(false)}
        entityType="mission"
        onSelect={handleMissionSelectedForBL}
      />

      {/* Supplier Selection Modal */}
      <EntitySelectionModal
        isOpen={showSupplierModal}
        onClose={() => setShowSupplierModal(false)}
        entityType="supplier"
        onSelect={handleSupplierSelected}
      />
    </div>
  );
}
