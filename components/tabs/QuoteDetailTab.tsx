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
import type { QuoteStatus, QuoteWithClientAndItems, Company } from '@/lib/supabase/types';

interface QuoteDetailTabProps {
  quoteId: string;
}

const statusConfig: Record<QuoteStatus, { label: string; variant: 'gray' | 'blue' }> = {
  brouillon: { label: 'Brouillon', variant: 'gray' },
  envoye: { label: 'Envoyé', variant: 'blue' },
};

export function QuoteDetailTab({ quoteId }: QuoteDetailTabProps) {
  const { openTab, updateTabTitle, closeTab, tabs, activeTabId } = useTabsStore();
  const [quote, setQuote] = useState<QuoteWithClientAndItems | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function fetchQuote() {
      const supabase = createClient();

      const { data: quoteData, error } = await supabase
        .from('quotes')
        .select(`
          *,
          client:clients(*),
          items:quote_line_items(*)
        `)
        .eq('id', quoteId)
        .single();

      if (error || !quoteData) {
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

      setQuote(quoteData as QuoteWithClientAndItems);
      setCompany(companyData);

      // Mettre à jour le titre de l'onglet
      updateTabTitle(
        useTabsStore.getState().tabs.find(t => t.entityId === quoteId)?.id || '',
        quoteData.numero
      );

      setLoading(false);
    }

    fetchQuote();
  }, [quoteId, updateTabTitle]);

  const handleBackToQuotes = () => {
    openTab({ type: 'quotes', path: '/quotes', title: 'Devis' }, true);
  };

  const handleEdit = () => {
    openTab(
      {
        type: 'edit-quote',
        path: `/quotes/${quoteId}/edit`,
        title: `Modifier ${quote?.numero}`,
        entityId: quoteId,
      },
      true
    );
  };

  const handleDelete = async () => {
    setDeleting(true);
    const supabase = createClient();

    // Soft delete - set deleted_at timestamp (keeps in trash for 30 days)
    const { error } = await supabase
      .from('quotes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', quoteId);

    if (error) {
      console.error('Error deleting quote:', error);
      setDeleting(false);
      setDeleteDialogOpen(false);
      return;
    }

    // Close current tab and go back to quotes list
    const currentTab = tabs.find(t => t.id === activeTabId);
    if (currentTab) closeTab(currentTab.id);
    openTab({ type: 'quotes', path: '/quotes', title: 'Devis' }, true);
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
        <p className="text-lg mb-4">Devis non trouvé</p>
        <button
          onClick={handleBackToQuotes}
          className="text-blue-600 hover:text-blue-700"
        >
          Retour aux devis
        </button>
      </div>
    );
  }

  const config = statusConfig[quote?.status as QuoteStatus] || statusConfig.brouillon;

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={handleBackToQuotes}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Retour aux devis
          </button>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{quote?.numero}</h1>
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
              type="quote"
              id={quoteId}
              status={quote?.status || 'brouillon'}
              clientEmail={quote?.client?.email}
              clientId={quote?.client_id}
              documentTitle={quote?.numero || 'Devis'}
            />
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Envois</h3>
            <SendHistory resourceType="quote" resourceId={quoteId} />
          </div>
        </div>

        {/* Preview */}
        {quote && (
          <DocumentPreview
            type="quote"
            document={quote}
            company={company}
          />
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Supprimer le devis"
        description={`Le devis ${quote?.numero} sera déplacé dans la corbeille. Vous pourrez le restaurer pendant 30 jours.`}
        confirmLabel="Mettre à la corbeille"
        cancelLabel="Annuler"
        variant="destructive"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
