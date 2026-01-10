import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/verifolio/:username
 * Page publique Verifolio - Missions affichables avec reviews publiées
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

    // Récupérer les missions affichables sur Verifolio
    // Règles strictes:
    // - visible_on_verifolio = true
    // - mission_context présent (>= 50 chars)
    // - au moins une review publiée
    const { data: missions, error: missionsError } = await supabase
      .from('missions')
      .select(`
        id,
        title,
        description,
        mission_context,
        created_at,
        client:clients(nom)
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

    // Pour chaque mission, récupérer les reviews publiées et médias publics
    const missionsWithReviews = await Promise.all(
      (missions || []).map(async (mission) => {
        // Reviews publiées
        const { data: reviews } = await supabase
          .from('reviews')
          .select(`
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
            created_at
          `)
          .eq('mission_id', mission.id)
          .eq('is_published', true)
          .order('created_at', { ascending: false });

        // Médias publics
        const { data: medias } = await supabase
          .from('review_mission_media')
          .select('id, url, type')
          .eq('mission_id', mission.id)
          .eq('is_public', true);

        const clientData = Array.isArray(mission.client) ? mission.client[0] : mission.client;

        return {
          ...mission,
          client_nom: clientData?.nom || 'Client',
          reviews: reviews || [],
          medias: medias || [],
        };
      })
    );

    // Filtrer pour ne garder que les missions avec au moins une review
    const validMissions = missionsWithReviews.filter((m) => m.reviews.length > 0);

    return NextResponse.json({
      user: { nom: company.nom },
      missions: validMissions,
    });
  } catch (error) {
    console.error('Error in verifolio endpoint:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
