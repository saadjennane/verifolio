import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { InvoiceForm } from '@/components/forms/InvoiceForm';

interface EditInvoicePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditInvoicePage({ params }: EditInvoicePageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: invoice, error } = await supabase
    .from('invoices')
    .select(`
      *,
      items:invoice_line_items(*)
    `)
    .eq('id', id)
    .single();

  if (error || !invoice) {
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
          <Link href={`/invoices/${id}`} className="text-sm text-gray-500 hover:text-gray-700">
            ← Retour à la facture
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">
            Modifier {invoice.numero}
          </h1>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <InvoiceForm invoice={invoice} clients={clients || []} />
        </div>
      </div>
    </div>
  );
}
