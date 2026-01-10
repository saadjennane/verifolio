import { NextResponse } from 'next/server';
import { listMissionSuppliers, addMissionSupplier } from '@/lib/tasks';

/**
 * GET /api/missions/[id]/suppliers
 * Liste les fournisseurs d'une mission
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: missionId } = await params;

    const result = await listMissionSuppliers(missionId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ suppliers: result.data });
  } catch (error) {
    console.error('Error listing mission suppliers:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des fournisseurs' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/missions/[id]/suppliers
 * Ajouter un fournisseur à une mission
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: missionId } = await params;
    const body = await request.json();

    const result = await addMissionSupplier({
      mission_id: missionId,
      supplier_id: body.supplier_id,
      notes: body.notes,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ supplier: result.data }, { status: 201 });
  } catch (error) {
    console.error('Error adding mission supplier:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'ajout du fournisseur' },
      { status: 500 }
    );
  }
}
