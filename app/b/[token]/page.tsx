import { notFound } from 'next/navigation';
import { BriefPublicView } from './BriefPublicView';

interface PageProps {
  params: Promise<{ token: string }>;
}

async function getBriefByToken(token: string) {
  // Fetch brief data from public API endpoint
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://verifolio.pro';
  const res = await fetch(`${baseUrl}/api/public/briefs/${token}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    return null;
  }

  const data = await res.json();
  return data.data;
}

export default async function BriefPublicPage({ params }: PageProps) {
  const { token } = await params;
  const brief = await getBriefByToken(token);

  if (!brief) {
    notFound();
  }

  return <BriefPublicView brief={brief} token={token} />;
}

export async function generateMetadata({ params }: PageProps) {
  const { token } = await params;
  const brief = await getBriefByToken(token);

  if (!brief) {
    return { title: 'Brief non trouve' };
  }

  return {
    title: `Brief - ${brief.title}`,
    description: `Brief pour ${brief.client?.nom || 'client'}`,
    robots: 'noindex, nofollow',
  };
}
