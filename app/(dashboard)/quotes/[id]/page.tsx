import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DocumentPreview } from '@/components/documents/DocumentPreview';
import { DocumentActions } from '@/components/documents/DocumentActions';
import { Badge, Button } from '@/components/ui';
import type { QuoteStatus, QuoteWithClientAndItems } from '@/lib/supabase/types';

const statusConfig: Record<QuoteStatus, { label: string; variant: 'gray' | 'blue' }> = {
  brouillon: { label: 'Brouillon', variant: 'gray' },
  envoye: { label: 'Envoyé', variant: 'blue' },
};

interface QuotePageProps {
  params: Promise<{ id: string }>;
}

export default async function QuotePage({ params }: QuotePageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: quote, error } = await supabase
    .from('quotes')
    .select(`
      *,
      client:clients(*),
      items:quote_line_items(*)
    `)
    .eq('id', id)
    .single();

  if (error || !quote) {
    notFound();
  }

  // Récupérer la company pour l'en-tête
  const { data: { user } } = await supabase.auth.getUser();
  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('user_id', user?.id)
    .single();

  const config = statusConfig[quote.status as QuoteStatus];

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href="/quotes" className="text-sm text-gray-500 hover:text-gray-700">
            ← Retour aux devis
          </Link>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{quote.numero}</h1>
              <Badge variant={config.variant}>{config.label}</Badge>
            </div>
            <Link href={`/quotes/${id}/edit`}>
              <Button variant="secondary">Modifier</Button>
            </Link>
          </div>
        </div>

        {/* Actions */}
        <div className="mb-6">
          <DocumentActions
            type="quote"
            id={id}
            status={quote.status}
            clientEmail={quote.client?.email}
          />
        </div>

        {/* Preview */}
        <DocumentPreview
          type="quote"
          document={quote as QuoteWithClientAndItems}
          company={company}
        />
      </div>
    </div>
  );
}
