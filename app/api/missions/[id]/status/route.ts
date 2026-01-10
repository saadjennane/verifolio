import { NextResponse } from 'next/server';
import { updateMissionStatus } from '@/lib/missions';
import type { MissionStatus } from '@/lib/missions';

/**
 * PATCH /api/missions/:id/status
 * Change le statut d'une mission
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json(
        { error: 'Le statut est requis' },
        { status: 400 }
      );
    }

    const result = await updateMissionStatus(id, status as MissionStatus);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ mission: result.data });
  } catch (error) {
    console.error('Error updating mission status:', error);
    return NextResponse.json(
      { error: 'Erreur lors du changement de statut' },
      { status: 500 }
    );
  }
}
