import { NextResponse, NextRequest } from 'next/server';
import { createSupplierQuote, listSupplierQuotes } from '@/lib/suppliers';
import type { ListSupplierQuotesFilter } from '@/lib/suppliers/types';

/**
 * GET /api/suppliers/quotes
 * List all supplier quotes with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const filter: ListSupplierQuotesFilter = {};

    const consultationId = searchParams.get('consultation_id');
    if (consultationId) filter.consultation_id = consultationId;

    const supplierId = searchParams.get('supplier_id');
    if (supplierId) filter.supplier_id = supplierId;

    const status = searchParams.get('status');
    if (status && ['pending', 'accepted', 'rejected'].includes(status)) {
      filter.status = status as ListSupplierQuotesFilter['status'];
    }

    const result = await listSupplierQuotes(filter);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    console.error('GET /api/suppliers/quotes error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * POST /api/suppliers/quotes
 * Create a new supplier quote
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.supplier_id) {
      return NextResponse.json({ error: 'Fournisseur requis' }, { status: 400 });
    }

    const result = await createSupplierQuote({
      consultation_id: body.consultation_id,
      supplier_id: body.supplier_id,
      reference: body.reference,
      date_devis: body.date_devis,
      date_validite: body.date_validite,
      total_ht: body.total_ht,
      total_tva: body.total_tva,
      total_ttc: body.total_ttc,
      vat_enabled: body.vat_enabled,
      notes: body.notes,
      document_url: body.document_url,
      ocr_data: body.ocr_data,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: result.data }, { status: 201 });
  } catch (error) {
    console.error('POST /api/suppliers/quotes error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
