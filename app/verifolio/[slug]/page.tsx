import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getPublicProfile } from '@/lib/verifolio';
import { VerifolioPublicView } from '@/components/verifolio';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const profile = await getPublicProfile(supabase, slug);

  if (!profile) {
    return {
      title: 'Profil non trouvé',
    };
  }

  return {
    title: `${profile.display_name} - Verifolio`,
    description: profile.title || profile.bio || `Découvrez le profil de ${profile.display_name}`,
    robots: { index: false, follow: false },
    openGraph: {
      title: `${profile.display_name} - Verifolio`,
      description: profile.title || profile.bio || undefined,
      type: 'profile',
      images: profile.photo_url ? [profile.photo_url] : undefined,
    },
  };
}

export default async function VerifolioPublicPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const profile = await getPublicProfile(supabase, slug);

  if (!profile) {
    notFound();
  }

  return <VerifolioPublicView profile={profile} />;
}
