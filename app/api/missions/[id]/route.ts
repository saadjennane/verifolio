import { NextResponse } from 'next/server';
import { getMission, updateMission, deleteMission } from '@/lib/missions';

/**
 * GET /api/missions/:id
 * Récupère une mission par ID
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const result = await getMission(id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json({ mission: result.data });
  } catch (error) {
    console.error('Error getting mission:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de la mission' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/missions/:id
 * Met à jour une mission
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();

    const result = await updateMission(id, body);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ mission: result.data });
  } catch (error) {
    console.error('Error updating mission:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la mission' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/missions/:id
 * Supprime une mission
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const result = await deleteMission(id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting mission:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la mission' },
      { status: 500 }
    );
  }
}
