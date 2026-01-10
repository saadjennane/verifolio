import { NextResponse } from 'next/server';
import { listReviewRequests } from '@/lib/reviews';

/**
 * GET /api/reviews/requests
 * Liste les demandes d'avis de l'utilisateur
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status') as 'sent' | 'pending' | 'responded' | null;
    const clientId = url.searchParams.get('client_id');
    const invoiceId = url.searchParams.get('invoice_id');

    const filter = {
      ...(status && { status }),
      ...(clientId && { client_id: clientId }),
      ...(invoiceId && { invoice_id: invoiceId }),
    };

    const result = await listReviewRequests(filter);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ requests: result.data });
  } catch (error) {
    console.error('Error listing review requests:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des demandes' },
      { status: 500 }
    );
  }
}
