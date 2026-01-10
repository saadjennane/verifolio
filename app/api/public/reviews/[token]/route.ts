import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { listPublicMissionMedia } from '@/lib/reviews';

/**
 * GET /api/public/reviews/:token
 * Récupère les informations d'une demande d'avis pour le formulaire public
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    const supabase = await createClient();

    // Récupérer la review request avec les infos liées
    const { data: reviewRequest, error: requestError } = await supabase
      .from('review_requests')
      .select(
        `
        id,
        title,
        context_text,
        status,
        invoice_id,
        client_id,
        invoice:invoices(id, numero, status),
        client:clients(id, nom, type)
      `
      )
      .eq('public_token', token)
      .single();

    if (requestError || !reviewRequest) {
      return NextResponse.json(
        { error: 'Demande d\'avis introuvable ou lien invalide' },
        { status: 404 }
      );
    }

    // Vérifier que la facture est toujours au statut 'sent'
    const invoiceData = Array.isArray(reviewRequest.invoice)
      ? reviewRequest.invoice[0]
      : reviewRequest.invoice;

    if (!invoiceData || invoiceData.status !== 'sent') {
      return NextResponse.json(
        { error: 'Cette demande d\'avis n\'est plus valide' },
        { status: 400 }
      );
    }

    // Récupérer les médias publics de la mission
    const mediaResult = await listPublicMissionMedia(reviewRequest.invoice_id);
    const missionMedia = mediaResult.success ? mediaResult.data || [] : [];

    // Récupérer le nom du client
    const clientData = Array.isArray(reviewRequest.client)
      ? reviewRequest.client[0]
      : reviewRequest.client;

    // Critères de notation (fixes v1)
    const ratingCriteria = [
      {
        key: 'rating_responsiveness',
        label: 'Réactivité',
        description: 'Rapidité de réponse et disponibilité',
      },
      {
        key: 'rating_quality',
        label: 'Qualité du travail',
        description: 'Qualité des livrables et du résultat',
      },
      {
        key: 'rating_requirements',
        label: 'Respect du cahier des charges',
        description: 'Compréhension et respect des besoins',
      },
      {
        key: 'rating_communication',
        label: 'Communication',
        description: 'Clarté et qualité des échanges',
      },
      {
        key: 'rating_recommendation',
        label: 'Recommandation',
        description: 'Probabilité de recommander ce prestataire',
      },
    ];

    // Vérifier si cet email a déjà répondu (via query param optionnel)
    const url = new URL(request.url);
    const checkEmail = url.searchParams.get('email');
    let alreadyResponded = false;

    if (checkEmail) {
      const { data: existingReview } = await supabase
        .from('reviews')
        .select('id')
        .eq('review_request_id', reviewRequest.id)
        .eq('reviewer_email', checkEmail)
        .maybeSingle();

      alreadyResponded = !!existingReview;
    }

    return NextResponse.json({
      request: {
        id: reviewRequest.id,
        title: reviewRequest.title,
        context_text: reviewRequest.context_text,
        status: reviewRequest.status,
      },
      client: {
        name: clientData?.nom || 'Client',
        type: clientData?.type,
      },
      invoice: {
        numero: invoiceData.numero,
      },
      mission_media: missionMedia,
      rating_criteria: ratingCriteria,
      already_responded: alreadyResponded,
    });
  } catch (error) {
    console.error('Error fetching review request:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des données' },
      { status: 500 }
    );
  }
}
