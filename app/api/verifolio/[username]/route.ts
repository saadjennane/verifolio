import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Cache: 1 hour, stale-while-revalidate 24 hours
const CACHE_CONTROL = 'public, s-maxage=3600, stale-while-revalidate=86400';

/**
 * GET /api/verifolio/:username
 * Page publique Verifolio - Missions affichables avec reviews publiées
 *
 * OPTIMIZED: Uses single query with joins instead of N+1 pattern
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  try {
    const supabase = await createClient();

    // Récupérer l'utilisateur par email ou username (pour v1, on utilise email)
    // TODO: Ajouter un champ username dans la table users ou companies
    const { data: company } = await supabase
      .from('companies')
      .select('user_id, nom, email')
      .eq('email', `${username}@example.com`) // Placeholder logic
      .single();

    if (!company) {
      return NextResponse.json(
        { error: 'Verifolio introuvable' },
        { status: 404 }
      );
    }

    // OPTIMIZED: Single query with joins for missions, reviews, and medias
    // Replaces N+1 pattern (was: 1 + N*2 queries, now: 1 query)
    const { data: missions, error: missionsError } = await supabase
      .from('missions')
      .select(`
        id,
        title,
        description,
        mission_context,
        created_at,
        client:clients(nom),
        reviews:reviews(
          id,
          reviewer_name,
          reviewer_function,
          company_name,
          comment,
          rating_quality,
          rating_communication,
          rating_deadlines,
          rating_value,
          consent_display_identity,
          created_at,
          is_published
        ),
        medias:review_mission_media(
          id,
          url,
          type,
          is_public
        )
      `)
      .eq('user_id', company.user_id)
      .eq('visible_on_verifolio', true)
      .not('mission_context', 'is', null);

    if (missionsError) {
      console.error('Error fetching missions:', missionsError);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des missions' },
        { status: 500 }
      );
    }

    // Process results: filter reviews/medias and format
    const validMissions = (missions || [])
      .map((mission) => {
        const clientData = Array.isArray(mission.client) ? mission.client[0] : mission.client;

        // Filter published reviews only
        const publishedReviews = (mission.reviews || [])
          .filter((r: { is_published: boolean }) => r.is_published)
          .sort((a: { created_at: string }, b: { created_at: string }) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
          .map(({ is_published, ...review }: { is_published: boolean; [key: string]: unknown }) => review);

        // Filter public medias only
        const publicMedias = (mission.medias || [])
          .filter((m: { is_public: boolean }) => m.is_public)
          .map(({ is_public, ...media }: { is_public: boolean; [key: string]: unknown }) => media);

        return {
          id: mission.id,
          title: mission.title,
          description: mission.description,
          mission_context: mission.mission_context,
          created_at: mission.created_at,
          client_nom: clientData?.nom || 'Client',
          reviews: publishedReviews,
          medias: publicMedias,
        };
      })
      // Keep only missions with at least one published review
      .filter((m) => m.reviews.length > 0);

    return NextResponse.json(
      {
        user: { nom: company.nom },
        missions: validMissions,
      },
      {
        headers: {
          'Cache-Control': CACHE_CONTROL,
        },
      }
    );
  } catch (error) {
    console.error('Error in verifolio endpoint:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
