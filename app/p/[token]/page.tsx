import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getProposalPublicView } from '@/lib/proposals';
import { ProposalPublicView } from '@/components/proposals/ProposalPublicView';
import { logEventIfFirst } from '@/lib/tracking/events';

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function ProposalPublicPage({ params }: PageProps) {
  const { token } = await params;
  const supabase = await createClient();
  const headersList = await headers();

  const proposal = await getProposalPublicView(supabase, token);

  if (!proposal) {
    notFound();
  }

  // Récupérer l'ID et le user_id de la proposition pour le tracking
  const { data: proposalData } = await supabase
    .from('proposals')
    .select('id, owner_user_id')
    .eq('public_token', token)
    .single();

  // Tracker la première visite
  if (proposalData) {
    const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0] || headersList.get('x-real-ip');
    const userAgent = headersList.get('user-agent');

    await logEventIfFirst({
      userId: proposalData.owner_user_id,
      resourceType: 'proposal',
      resourceId: proposalData.id,
      eventType: 'viewer_opened',
      metadata: { token },
      ipAddress: ipAddress || undefined,
      userAgent: userAgent || undefined,
    });
  }

  return <ProposalPublicView proposal={proposal} />;
}

export async function generateMetadata({ params }: PageProps) {
  const { token } = await params;
  const supabase = await createClient();
  const proposal = await getProposalPublicView(supabase, token);

  if (!proposal) {
    return { title: 'Proposition non trouvée' };
  }

  const companyName = proposal.company?.name || 'Proposition commerciale';

  return {
    title: `Proposition - ${companyName}`,
    description: `Proposition commerciale pour ${proposal.client_name}`,
    robots: 'noindex, nofollow',
  };
}
