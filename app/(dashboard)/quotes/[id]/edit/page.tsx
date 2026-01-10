import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { QuoteForm } from '@/components/forms/QuoteForm';

interface EditQuotePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditQuotePage({ params }: EditQuotePageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: quote, error } = await supabase
    .from('quotes')
    .select(`
      *,
      items:quote_line_items(*)
    `)
    .eq('id', id)
    .single();

  if (error || !quote) {
    notFound();
  }

  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .order('nom');

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link href={`/quotes/${id}`} className="text-sm text-gray-500 hover:text-gray-700">
            ← Retour au devis
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">
            Modifier {quote.numero}
          </h1>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <QuoteForm quote={quote} clients={clients || []} />
        </div>
      </div>
    </div>
  );
}
