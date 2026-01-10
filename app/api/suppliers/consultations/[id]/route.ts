import { NextResponse, NextRequest } from 'next/server';
import {
  getConsultation,
  updateConsultation,
  deleteConsultation,
  selectConsultationWinner,
} from '@/lib/suppliers';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/suppliers/consultations/[id]
 * Get a single consultation with all quotes
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const result = await getConsultation(id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    console.error('GET /api/suppliers/consultations/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * PATCH /api/suppliers/consultations/[id]
 * Update a consultation
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Handle winner selection
    if (body.select_winner && body.quote_id) {
      const result = await selectConsultationWinner(id, body.quote_id);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true });
    }

    // Regular update
    const result = await updateConsultation(id, {
      title: body.title,
      description: body.description,
      status: body.status,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    console.error('PATCH /api/suppliers/consultations/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * DELETE /api/suppliers/consultations/[id]
 * Soft delete a consultation
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const result = await deleteConsultation(id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/suppliers/consultations/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
