/**
 * Page publique de visualisation d'un devis
 * /q/[token]
 */

import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getPublicLinkByToken } from '@/lib/tracking/public-links';
import { logEventIfFirst } from '@/lib/tracking/events';
import { QuotePublicViewer } from '@/components/documents/QuotePublicViewer';

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function QuotePublicPage({ params }: PageProps) {
  const { token } = await params;
  const supabase = await createClient();
  const headersList = await headers();

  // Récupérer le lien public
  const { link, error } = await getPublicLinkByToken(token);

  if (error || !link || link.resource_type !== 'quote') {
    notFound();
  }

  // Récupérer le devis avec client et items
  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .select(`
      *,
      client:clients(*)
    `)
    .eq('id', link.resource_id)
    .single();

  if (quoteError || !quote) {
    notFound();
  }

  // Récupérer les items séparément (pour éviter les problèmes de types)
  const { data: items } = await supabase
    .from('quote_line_items')
    .select('*')
    .eq('quote_id', quote.id)
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
    resourceType: 'quote',
    resourceId: link.resource_id,
    eventType: 'viewer_opened',
    publicLinkId: link.id,
    metadata: { token },
    ipAddress: ipAddress || undefined,
    userAgent: userAgent || undefined,
  });

  return (
    <QuotePublicViewer
      quote={{ ...quote, items: items || [] }}
      company={company}
      token={token}
    />
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { token } = await params;
  const supabase = await createClient();

  const { link } = await getPublicLinkByToken(token);
  if (!link || link.resource_type !== 'quote') {
    return { title: 'Devis non trouvé' };
  }

  const { data: quote } = await supabase
    .from('quotes')
    .select('numero')
    .eq('id', link.resource_id)
    .single();

  const { data: company } = await supabase
    .from('companies')
    .select('nom')
    .eq('user_id', link.user_id)
    .single();

  return {
    title: `Devis ${quote?.numero || ''} - ${company?.nom || 'Verifolio'}`,
    description: `Consultez votre devis ${quote?.numero}`,
    robots: 'noindex, nofollow',
  };
}
