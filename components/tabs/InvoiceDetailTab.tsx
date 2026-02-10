'use client';

import { useState, useEffect, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useTabsStore } from '@/lib/stores/tabs-store';
import { DocumentPreview } from '@/components/documents/DocumentPreview';
import { DocumentActions } from '@/components/documents/DocumentActions';
import { SendHistory } from '@/components/documents/SendHistory';
import { Badge, Button } from '@/components/ui';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { formatCurrency } from '@/lib/utils/currency';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { InvoiceStatus, InvoiceWithClientAndItems, Company } from '@/lib/supabase/types';

interface InvoiceDetailTabProps {
  invoiceId: string;
}

const statusConfig: Record<InvoiceStatus, { label: string; variant: 'gray' | 'blue' | 'green' | 'red' | 'yellow' }> = {
  brouillon: { label: 'Brouillon', variant: 'gray' },
  envoyee: { label: 'Envoyee', variant: 'blue' },
  partielle: { label: 'Paiement partiel', variant: 'yellow' },
  payee: { label: 'Payee', variant: 'green' },
  annulee: { label: 'Annulee', variant: 'red' },
};

const statusOptions: { value: InvoiceStatus; label: string }[] = [
  { value: 'brouillon', label: 'Brouillon' },
  { value: 'envoyee', label: 'Envoyee' },
  { value: 'partielle', label: 'Paiement partiel' },
  { value: 'payee', label: 'Payee' },
  { value: 'annulee', label: 'Annulee' },
];

interface PaymentSummary {
  total_ttc: number;
  total_paid: number;
  remaining: number;
  payment_status: string;
}

export function InvoiceDetailTab({ invoiceId }: InvoiceDetailTabProps) {
  const { openTab, updateTabTitle, closeTab, tabs, activeTabId } = useTabsStore();
  const [invoice, setInvoice] = useState<InvoiceWithClientAndItems | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchPaymentSummary = useCallback(async () => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/payments`);
      if (res.ok) {
        const json = await res.json();
        setPaymentSummary(json.data.summary);
      }
    } catch (err) {
      console.error('Error fetching payment summary:', err);
    }
  }, [invoiceId]);

  useEffect(() => {
    async function fetchInvoice() {
      const supabase = createClient();

      const { data: invoiceData, error } = await supabase
        .from('invoices')
        .select(`
          *,
          client:clients(*),
          items:invoice_line_items(*)
        `)
        .eq('id', invoiceId)
        .single();

      if (error || !invoiceData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      // Recuperer la company
      const { data: { user } } = await supabase.auth.getUser();
      const { data: companyData } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      setInvoice(invoiceData as InvoiceWithClientAndItems);
      setCompany(companyData);

      // Mettre a jour le titre de l'onglet
      updateTabTitle(
        useTabsStore.getState().tabs.find(t => t.entityId === invoiceId)?.id || '',
        invoiceData.numero
      );

      setLoading(false);
    }

    fetchInvoice();
    fetchPaymentSummary();
  }, [invoiceId, updateTabTitle, fetchPaymentSummary]);

  const handleBackToDocuments = () => {
    openTab({ type: 'documents', path: '/documents', title: 'Documents' }, true);
  };

  const handleEdit = () => {
    openTab(
      {
        type: 'edit-invoice',
        path: `/invoices/${invoiceId}/edit`,
        title: `Modifier ${invoice?.numero}`,
        entityId: invoiceId,
      },
      true
    );
  };

  const handleDelete = async () => {
    setDeleting(true);
    const supabase = createClient();

    // Soft delete - set deleted_at timestamp (keeps in trash for 30 days)
    const { error } = await supabase
      .from('invoices')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', invoiceId);

    if (error) {
      console.error('Error deleting invoice:', error);
      setDeleting(false);
      setDeleteDialogOpen(false);
      return;
    }

    // Close current tab and go back to documents list
    const currentTab = tabs.find(t => t.id === activeTabId);
    if (currentTab) closeTab(currentTab.id);
    openTab({ type: 'documents', path: '/documents', title: 'Documents' }, true);
  };

  const handleStatusChange = async (newStatus: InvoiceStatus) => {
    if (!invoice || invoice.status === newStatus) return;

    try {
      const response = await fetch('/api/invoices/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [invoiceId], updates: { status: newStatus } }),
      });

      if (response.ok) {
        setInvoice({ ...invoice, status: newStatus });
      }
    } catch (error) {
      console.error('Status change error:', error);
    }
  };

  const handlePaymentAdded = () => {
    // Refresh payment summary
    fetchPaymentSummary();
    // Refresh invoice to get updated status
    const supabase = createClient();
    supabase
      .from('invoices')
      .select('status')
      .eq('id', invoiceId)
      .single()
      .then(({ data }) => {
        if (data && invoice) {
          setInvoice({ ...invoice, status: data.status });
        }
      });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <p className="text-lg mb-4">Facture non trouvee</p>
        <button
          onClick={handleBackToDocuments}
          className="text-blue-600 hover:text-blue-700"
        >
          Retour aux factures
        </button>
      </div>
    );
  }

  const config = statusConfig[invoice?.status as InvoiceStatus] || statusConfig.brouillon;
  const currency = company?.default_currency || 'MAD';
  const remaining = paymentSummary?.remaining ?? invoice?.total_ttc ?? 0;
  const totalPaid = paymentSummary?.total_paid ?? 0;

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={handleBackToDocuments}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Retour aux factures
          </button>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{invoice?.numero}</h1>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="focus:outline-none">
                    <Badge
                      variant={config.variant}
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      {config.label}
                    </Badge>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {statusOptions.map((option) => {
                    const optionConfig = statusConfig[option.value];
                    return (
                      <DropdownMenuItem
                        key={option.value}
                        onClick={() => handleStatusChange(option.value)}
                        className={option.value === invoice?.status ? 'bg-muted' : ''}
                      >
                        <Badge variant={optionConfig.variant} className="mr-2">
                          {option.label}
                        </Badge>
                        {option.value === invoice?.status && <span className="ml-auto text-xs">✓</span>}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={handleEdit}>
                Modifier
              </Button>
              <Button
                variant="ghost"
                onClick={() => setDeleteDialogOpen(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Payment Summary Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total TTC</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatCurrency(invoice?.total_ttc || 0, currency)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Encaisse</p>
              <p className="text-lg font-semibold text-green-600">
                {formatCurrency(totalPaid, currency)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Restant du</p>
              <p className={`text-xl font-bold ${remaining > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                {formatCurrency(remaining, currency)}
              </p>
            </div>
          </div>
        </div>

        {/* Actions + Send History */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <DocumentActions
              type="invoice"
              id={invoiceId}
              status={invoice?.status || 'brouillon'}
              clientEmail={invoice?.client?.email}
              clientId={invoice?.client_id}
              documentTitle={invoice?.numero || 'Facture'}
              remainingAmount={remaining}
              currency={currency}
              onPaymentAdded={handlePaymentAdded}
            />
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Envois</h3>
            <SendHistory resourceType="invoice" resourceId={invoiceId} />
          </div>
        </div>

        {/* Preview */}
        <DocumentPreview
          type="invoice"
          documentId={invoiceId}
        />
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Supprimer la facture"
        description={`La facture ${invoice?.numero} sera deplacee dans la corbeille. Vous pourrez la restaurer pendant 30 jours.`}
        confirmLabel="Mettre a la corbeille"
        cancelLabel="Annuler"
        variant="destructive"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
