import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DocumentPreview } from '@/components/documents/DocumentPreview';
import { DocumentActions } from '@/components/documents/DocumentActions';
import { InvoicePaymentsSection } from '@/components/invoices/InvoicePaymentsSection';
import { Badge, Button } from '@/components/ui';
import type { InvoiceStatus, InvoiceWithClientAndItems } from '@/lib/supabase/types';

const statusConfig: Record<InvoiceStatus, { label: string; variant: 'gray' | 'blue' | 'green' | 'yellow' | 'red' }> = {
  brouillon: { label: 'Brouillon', variant: 'gray' },
  envoyee: { label: 'Envoyée', variant: 'blue' },
  partielle: { label: 'Paiement partiel', variant: 'yellow' },
  payee: { label: 'Payée', variant: 'green' },
  annulee: { label: 'Annulée', variant: 'red' },
};

interface InvoicePageProps {
  params: Promise<{ id: string }>;
}

export default async function InvoicePage({ params }: InvoicePageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: invoice, error } = await supabase
    .from('invoices')
    .select(`
      *,
      client:clients(*),
      items:invoice_line_items(*)
    `)
    .eq('id', id)
    .single();

  if (error || !invoice) {
    notFound();
  }

  // Récupérer la company pour l'en-tête
  const { data: { user } } = await supabase.auth.getUser();
  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('user_id', user?.id)
    .single();

  const config = statusConfig[invoice.status as InvoiceStatus];

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href="/invoices" className="text-sm text-gray-500 hover:text-gray-700">
            ← Retour aux factures
          </Link>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{invoice.numero}</h1>
              <Badge variant={config.variant}>{config.label}</Badge>
            </div>
            <Link href={`/invoices/${id}/edit`}>
              <Button variant="secondary">Modifier</Button>
            </Link>
          </div>
        </div>

        {/* Actions */}
        <div className="mb-6">
          <DocumentActions
            type="invoice"
            id={id}
            status={invoice.status}
            clientEmail={invoice.client?.email}
          />
        </div>

        {/* Paiements */}
        <div className="mb-6">
          <InvoicePaymentsSection
            invoiceId={id}
            clientId={invoice.client_id || undefined}
            currency={company?.default_currency || 'EUR'}
          />
        </div>

        {/* Preview */}
        <DocumentPreview
          type="invoice"
          document={invoice as InvoiceWithClientAndItems}
          company={company}
        />
      </div>
    </div>
  );
}
