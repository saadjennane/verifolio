import { NextResponse } from 'next/server';
import { createReviewFromPublicToken } from '@/lib/reviews';
import type { CreateReviewPayload } from '@/lib/reviews';

/**
 * POST /api/public/reviews/:token/submit
 * Soumet un avis client via le formulaire public
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    const body = await request.json();

    // Validation des champs requis
    if (!body.reviewer_email) {
      return NextResponse.json(
        { error: 'L\'adresse email est requise' },
        { status: 400 }
      );
    }

    if (!body.comment || body.comment.trim().length === 0) {
      return NextResponse.json(
        { error: 'Le commentaire est requis' },
        { status: 400 }
      );
    }

    if (!body.confirm_collaboration) {
      return NextResponse.json(
        {
          error:
            'Vous devez confirmer avoir collaboré avec ce prestataire pour soumettre un avis',
        },
        { status: 400 }
      );
    }

    // Validation des ratings (s'ils sont fournis, doivent être entre 1 et 5)
    const ratingFields = [
      'rating_overall',
      'rating_responsiveness',
      'rating_quality',
      'rating_requirements',
      'rating_communication',
      'rating_recommendation',
    ];

    for (const field of ratingFields) {
      if (body[field] !== undefined && body[field] !== null) {
        const value = parseInt(body[field], 10);
        if (isNaN(value) || value < 1 || value > 5) {
          return NextResponse.json(
            { error: `${field} doit être une note entre 1 et 5` },
            { status: 400 }
          );
        }
      }
    }

    // Préparer le payload
    const reviewPayload: CreateReviewPayload = {
      reviewer_name: body.reviewer_name || undefined,
      reviewer_role: body.reviewer_role || undefined,
      reviewer_email: body.reviewer_email,
      reviewer_company: body.reviewer_company || undefined,
      confirm_collaboration: body.confirm_collaboration,
      consent_display_identity: body.consent_display_identity || false,
      rating_overall: body.rating_overall
        ? parseInt(body.rating_overall, 10)
        : undefined,
      rating_responsiveness: body.rating_responsiveness
        ? parseInt(body.rating_responsiveness, 10)
        : undefined,
      rating_quality: body.rating_quality
        ? parseInt(body.rating_quality, 10)
        : undefined,
      rating_requirements: body.rating_requirements
        ? parseInt(body.rating_requirements, 10)
        : undefined,
      rating_communication: body.rating_communication
        ? parseInt(body.rating_communication, 10)
        : undefined,
      rating_recommendation: body.rating_recommendation
        ? parseInt(body.rating_recommendation, 10)
        : undefined,
      comment: body.comment.trim(),
    };

    // Créer l'avis via le helper
    const result = await createReviewFromPublicToken(token, reviewPayload);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Retourner un message de remerciement
    return NextResponse.json({
      success: true,
      message:
        'Merci pour votre retour ! Votre avis a été transmis au prestataire.',
      review: {
        id: result.data?.id,
        reliability_score: result.data?.reliability_score,
        reliability_level: result.data?.reliability_level,
      },
    });
  } catch (error) {
    console.error('Error submitting review:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la soumission de l\'avis' },
      { status: 500 }
    );
  }
}
