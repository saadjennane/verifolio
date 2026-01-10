import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { QuoteForm } from '@/components/forms/QuoteForm';

export default async function NewQuotePage() {
  const supabase = await createClient();

  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .order('nom');

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link href="/documents" className="text-sm text-gray-500 hover:text-gray-700">
            ← Retour aux documents
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Nouveau devis</h1>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <QuoteForm clients={clients || []} />
        </div>
      </div>
    </div>
  );
}
