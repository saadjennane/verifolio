/**
 * Page publique de visualisation d'une facture
 * /i/[token]
 */

import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getPublicLinkByToken } from '@/lib/tracking/public-links';
import { logEventIfFirst } from '@/lib/tracking/events';
import { InvoicePublicViewer } from '@/components/documents/InvoicePublicViewer';

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function InvoicePublicPage({ params }: PageProps) {
  const { token } = await params;
  const supabase = await createClient();
  const headersList = await headers();

  // Récupérer le lien public
  const { link, error } = await getPublicLinkByToken(token);

  if (error || !link || link.resource_type !== 'invoice') {
    notFound();
  }

  // Récupérer la facture avec client
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select(`
      *,
      client:clients(*)
    `)
    .eq('id', link.resource_id)
    .single();

  if (invoiceError || !invoice) {
    notFound();
  }

  // Récupérer les items séparément
  const { data: items } = await supabase
    .from('invoice_line_items')
    .select('*')
    .eq('invoice_id', invoice.id)
    .order('ordre', { ascending: true });

  // Récupérer les infos de l'entreprise
  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('user_id', link.user_id)
    .single();

  // Tracker la première visite
  const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0] || headersList.get('x-real-ip');
  const userAgent = headersList.get('user-agent');

  await logEventIfFirst({
    userId: link.user_id,
    resourceType: 'invoice',
    resourceId: link.resource_id,
    eventType: 'viewer_opened',
    publicLinkId: link.id,
    metadata: { token },
    ipAddress: ipAddress || undefined,
    userAgent: userAgent || undefined,
  });

  return (
    <InvoicePublicViewer
      invoice={{ ...invoice, items: items || [] }}
      company={company}
      token={token}
    />
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { token } = await params;
  const supabase = await createClient();

  const { link } = await getPublicLinkByToken(token);
  if (!link || link.resource_type !== 'invoice') {
    return { title: 'Facture non trouvée' };
  }

  const { data: invoice } = await supabase
    .from('invoices')
    .select('numero')
    .eq('id', link.resource_id)
    .single();

  const { data: company } = await supabase
    .from('companies')
    .select('nom')
    .eq('user_id', link.user_id)
    .single();

  return {
    title: `Facture ${invoice?.numero || ''} - ${company?.nom || 'Verifolio'}`,
    description: `Consultez votre facture ${invoice?.numero}`,
    robots: 'noindex, nofollow',
  };
}
