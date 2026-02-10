import { NextResponse, NextRequest } from 'next/server';
import {
  getSupplierDeliveryNote,
  updateSupplierDeliveryNote,
  deleteSupplierDeliveryNote,
} from '@/lib/suppliers';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/suppliers/delivery-notes/:id
 * Get a specific supplier delivery note
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const result = await getSupplierDeliveryNote(id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    console.error('GET /api/suppliers/delivery-notes/:id error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * PATCH /api/suppliers/delivery-notes/:id
 * Update a supplier delivery note
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    const result = await updateSupplierDeliveryNote(id, {
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

    return NextResponse.json({ data: result.data });
  } catch (error) {
    console.error('PATCH /api/suppliers/delivery-notes/:id error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * DELETE /api/suppliers/delivery-notes/:id
 * Delete a supplier delivery note
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const result = await deleteSupplierDeliveryNote(id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/suppliers/delivery-notes/:id error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
