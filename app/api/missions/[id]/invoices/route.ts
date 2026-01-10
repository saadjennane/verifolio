import { NextResponse } from 'next/server';
import { linkInvoiceToMission, unlinkInvoiceFromMission } from '@/lib/missions';

/**
 * POST /api/missions/:id/invoices
 * Lie une facture à une mission
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { invoice_id } = body;

    if (!invoice_id) {
      return NextResponse.json(
        { error: 'L\'ID de la facture est requis' },
        { status: 400 }
      );
    }

    const result = await linkInvoiceToMission(id, invoice_id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Error linking invoice:', error);
    return NextResponse.json(
      { error: 'Erreur lors du lien de la facture' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/missions/:id/invoices
 * Délie une facture d'une mission
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const url = new URL(request.url);
    const invoice_id = url.searchParams.get('invoice_id');

    if (!invoice_id) {
      return NextResponse.json(
        { error: 'L\'ID de la facture est requis' },
        { status: 400 }
      );
    }

    const result = await unlinkInvoiceFromMission(id, invoice_id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error unlinking invoice:', error);
    return NextResponse.json(
      { error: 'Erreur lors du délien de la facture' },
      { status: 500 }
    );
  }
}
