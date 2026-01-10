import { NextResponse } from 'next/server';
import { removeMissionSupplier } from '@/lib/tasks';

/**
 * DELETE /api/missions/[id]/suppliers/[supplierId]
 * Retirer un fournisseur d'une mission
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; supplierId: string }> }
) {
  try {
    const { supplierId } = await params;

    const result = await removeMissionSupplier(supplierId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing mission supplier:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du fournisseur' },
      { status: 500 }
    );
  }
}
