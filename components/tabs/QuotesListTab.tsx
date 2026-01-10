'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTabsStore } from '@/lib/stores/tabs-store';
import { useRefreshTrigger } from '@/lib/hooks/useRefreshTrigger';
import { Button, Badge } from '@/components/ui';
import type { QuoteStatus } from '@/lib/supabase/types';

interface Quote {
  id: string;
  numero: string;
  status: QuoteStatus;
  date_emission: string;
  total_ttc: number;
  devise: string;
  client: { nom: string } | null;
}

const statusConfig: Record<QuoteStatus, { label: string; variant: 'gray' | 'blue' | 'green' }> = {
  brouillon: { label: 'Brouillon', variant: 'gray' },
  envoye: { label: 'Envoyé', variant: 'blue' },
};

export function QuotesListTab() {
  const { openTab } = useTabsStore();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQuotes = useCallback(async () => {
    const supabase = createClient();

    const { data } = await supabase
      .from('quotes')
      .select(`
        *,
        client:clients(nom)
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (data) {
      setQuotes(data);
    }
    setLoading(false);
  }, []);

  // Charger au montage
  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  // Écouter les triggers de refresh depuis le chat
  useRefreshTrigger('quotes', fetchQuotes);

  const handleQuoteClick = (e: React.MouseEvent, quote: Quote) => {
    const permanent = e.ctrlKey || e.metaKey;
    openTab(
      {
        type: 'quote',
        path: `/quotes/${quote.id}`,
        title: quote.numero,
        entityId: quote.id,
      },
      permanent
    );
  };

  const handleQuoteDoubleClick = (quote: Quote) => {
    openTab(
      {
        type: 'quote',
        path: `/quotes/${quote.id}`,
        title: quote.numero,
        entityId: quote.id,
      },
      true
    );
  };

  const handleNewQuote = () => {
    openTab(
      { type: 'new-quote', path: '/quotes/new', title: 'Nouveau devis' },
      true
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Devis</h1>
          <Button onClick={handleNewQuote}>Nouveau devis</Button>
        </div>

        {/* Liste */}
        {quotes.length > 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
            {quotes.map((quote) => {
              const config = statusConfig[quote.status] || statusConfig.brouillon;
              return (
                <button
                  key={quote.id}
                  onClick={(e) => handleQuoteClick(e, quote)}
                  onDoubleClick={() => handleQuoteDoubleClick(quote)}
                  className="w-full block p-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{quote.numero}</span>
                        <Badge variant={config.variant}>{config.label}</Badge>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {quote.client?.nom || 'Client inconnu'} — {quote.date_emission}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        {Number(quote.total_ttc).toFixed(2)} {quote.devise}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-500 mb-4">Aucun devis pour le moment</p>
            <Button variant="secondary" onClick={handleNewQuote}>
              Créer votre premier devis
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
