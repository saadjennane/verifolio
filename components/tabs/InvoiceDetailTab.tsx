'use client';

import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useTabsStore } from '@/lib/stores/tabs-store';
import { DocumentPreview } from '@/components/documents/DocumentPreview';
import { DocumentActions } from '@/components/documents/DocumentActions';
import { SendHistory } from '@/components/documents/SendHistory';
import { Badge, Button } from '@/components/ui';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { InvoiceStatus, InvoiceWithClientAndItems, Company } from '@/lib/supabase/types';

interface InvoiceDetailTabProps {
  invoiceId: string;
}

const statusConfig: Record<InvoiceStatus, { label: string; variant: 'gray' | 'blue' | 'green' }> = {
  brouillon: { label: 'Brouillon', variant: 'gray' },
  envoyee: { label: 'Envoyée', variant: 'blue' },
  payee: { label: 'Payée', variant: 'green' },
  annulee: { label: 'Annulée', variant: 'gray' },
};

export function InvoiceDetailTab({ invoiceId }: InvoiceDetailTabProps) {
  const { openTab, updateTabTitle, closeTab, tabs, activeTabId } = useTabsStore();
  const [invoice, setInvoice] = useState<InvoiceWithClientAndItems | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

      // Récupérer la company
      const { data: { user } } = await supabase.auth.getUser();
      const { data: companyData } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      setInvoice(invoiceData as InvoiceWithClientAndItems);
      setCompany(companyData);

      // Mettre à jour le titre de l'onglet
      updateTabTitle(
        useTabsStore.getState().tabs.find(t => t.entityId === invoiceId)?.id || '',
        invoiceData.numero
      );

      setLoading(false);
    }

    fetchInvoice();
  }, [invoiceId, updateTabTitle]);

  const handleBackToInvoices = () => {
    openTab({ type: 'invoices', path: '/invoices', title: 'Factures' }, true);
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

    // Close current tab and go back to invoices list
    const currentTab = tabs.find(t => t.id === activeTabId);
    if (currentTab) closeTab(currentTab.id);
    openTab({ type: 'invoices', path: '/invoices', title: 'Factures' }, true);
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
        <p className="text-lg mb-4">Facture non trouvée</p>
        <button
          onClick={handleBackToInvoices}
          className="text-blue-600 hover:text-blue-700"
        >
          Retour aux factures
        </button>
      </div>
    );
  }

  const config = statusConfig[invoice?.status as InvoiceStatus] || statusConfig.brouillon;

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={handleBackToInvoices}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Retour aux factures
          </button>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{invoice?.numero}</h1>
              <Badge variant={config.variant}>{config.label}</Badge>
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
            />
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Envois</h3>
            <SendHistory resourceType="invoice" resourceId={invoiceId} />
          </div>
        </div>

        {/* Preview */}
        {invoice && (
          <DocumentPreview
            type="invoice"
            document={invoice}
            company={company}
          />
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Supprimer la facture"
        description={`La facture ${invoice?.numero} sera déplacée dans la corbeille. Vous pourrez la restaurer pendant 30 jours.`}
        confirmLabel="Mettre à la corbeille"
        cancelLabel="Annuler"
        variant="destructive"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
