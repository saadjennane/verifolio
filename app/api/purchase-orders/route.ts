import { NextResponse, NextRequest } from 'next/server';
import { createPurchaseOrder, listPurchaseOrders } from '@/lib/purchase-orders';

/**
 * GET /api/purchase-orders
 * List all purchase orders with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const filter: { supplier_id?: string; status?: string } = {};

    const supplierId = searchParams.get('supplier_id');
    if (supplierId) filter.supplier_id = supplierId;

    const status = searchParams.get('status');
    if (status) filter.status = status;

    const result = await listPurchaseOrders(filter);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    console.error('GET /api/purchase-orders error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * POST /api/purchase-orders
 * Create a new purchase order
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.supplier_id) {
      return NextResponse.json({ error: 'Fournisseur requis' }, { status: 400 });
    }

    const result = await createPurchaseOrder({
      supplier_id: body.supplier_id,
      supplier_quote_id: body.supplier_quote_id,
      date_emission: body.date_emission,
      date_livraison_prevue: body.date_livraison_prevue,
      total_ht: body.total_ht,
      total_tva: body.total_tva,
      total_ttc: body.total_ttc,
      vat_enabled: body.vat_enabled,
      notes: body.notes,
      line_items: body.line_items,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: result.data }, { status: 201 });
  } catch (error) {
    console.error('POST /api/purchase-orders error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
