import { NextResponse, NextRequest } from 'next/server';
import { createConsultation, listConsultations } from '@/lib/suppliers';
import type { ListConsultationsFilter } from '@/lib/suppliers/types';

/**
 * GET /api/suppliers/consultations
 * List all supplier consultations with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const filter: ListConsultationsFilter = {};
    const status = searchParams.get('status');
    if (status && ['open', 'closed', 'cancelled'].includes(status)) {
      filter.status = status as ListConsultationsFilter['status'];
    }

    const result = await listConsultations(filter);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    console.error('GET /api/suppliers/consultations error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * POST /api/suppliers/consultations
 * Create a new supplier consultation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.title) {
      return NextResponse.json({ error: 'Titre requis' }, { status: 400 });
    }

    const result = await createConsultation({
      title: body.title,
      description: body.description,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: result.data }, { status: 201 });
  } catch (error) {
    console.error('POST /api/suppliers/consultations error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
