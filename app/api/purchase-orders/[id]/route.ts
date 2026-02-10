import { NextResponse, NextRequest } from 'next/server';
import {
  getPurchaseOrder,
  updatePurchaseOrder,
  deletePurchaseOrder,
} from '@/lib/purchase-orders';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/purchase-orders/:id
 * Get a specific purchase order
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const result = await getPurchaseOrder(id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    console.error('GET /api/purchase-orders/:id error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * PATCH /api/purchase-orders/:id
 * Update a purchase order
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    const result = await updatePurchaseOrder(id, {
      supplier_id: body.supplier_id,
      supplier_quote_id: body.supplier_quote_id,
      date_emission: body.date_emission,
      date_livraison_prevue: body.date_livraison_prevue,
      total_ht: body.total_ht,
      total_tva: body.total_tva,
      total_ttc: body.total_ttc,
      vat_enabled: body.vat_enabled,
      status: body.status,
      notes: body.notes,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    console.error('PATCH /api/purchase-orders/:id error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * DELETE /api/purchase-orders/:id
 * Delete a purchase order
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const result = await deletePurchaseOrder(id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/purchase-orders/:id error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
