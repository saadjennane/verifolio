import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getProposal } from '@/lib/proposals';
import { ProposalViewRenderer } from '@/components/proposals/ProposalViewRenderer';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProposalViewPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Get proposal with all relations
  const proposal = await getProposal(supabase, user.id, id);

  if (!proposal) {
    notFound();
  }

  // Get company info for rendering
  const { data: company } = await supabase
    .from('companies')
    .select('name, logo_url, email, phone, address, city, postal_code, country, siret, vat_number')
    .eq('user_id', user.id)
    .single();

  return (
    <ProposalViewRenderer
      proposal={proposal}
      company={company}
      showActions={true}
    />
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { title: 'Non autorisé' };
  }

  const proposal = await getProposal(supabase, user.id, id);

  if (!proposal) {
    return { title: 'Proposition non trouvée' };
  }

  return {
    title: `${proposal.title} - Aperçu`,
    description: `Aperçu de la proposition pour ${proposal.client?.nom}`,
  };
}
