import { NextResponse, NextRequest } from 'next/server';
import { createSupplierDeliveryNote, listSupplierDeliveryNotes } from '@/lib/suppliers';
import type { ListSupplierDeliveryNotesFilter } from '@/lib/suppliers/types';

/**
 * GET /api/suppliers/delivery-notes
 * List all supplier delivery notes with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const filter: ListSupplierDeliveryNotesFilter = {};

    const supplierId = searchParams.get('supplier_id');
    if (supplierId) filter.supplier_id = supplierId;

    const result = await listSupplierDeliveryNotes(filter);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    console.error('GET /api/suppliers/delivery-notes error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * POST /api/suppliers/delivery-notes
 * Create a new supplier delivery note
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.supplier_id) {
      return NextResponse.json({ error: 'Fournisseur requis' }, { status: 400 });
    }

    const result = await createSupplierDeliveryNote({
      supplier_id: body.supplier_id,
      supplier_quote_id: body.supplier_quote_id,
      purchase_order_id: body.purchase_order_id,
      reference: body.reference,
      date_reception: body.date_reception,
      notes: body.notes,
      document_url: body.document_url,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: result.data }, { status: 201 });
  } catch (error) {
    console.error('POST /api/suppliers/delivery-notes error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
