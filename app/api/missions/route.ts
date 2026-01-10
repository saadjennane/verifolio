import { NextResponse } from 'next/server';
import { listMissions, createMission } from '@/lib/missions';
import type { MissionStatus, CreateMissionPayload } from '@/lib/missions';

/**
 * GET /api/missions
 * Liste les missions avec filtres
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as MissionStatus | null;
    const client_id = searchParams.get('client_id');
    const visible_on_verifolio = searchParams.get('visible_on_verifolio');

    const filter: any = {};
    if (status) filter.status = status;
    if (client_id) filter.client_id = client_id;
    if (visible_on_verifolio !== null) {
      filter.visible_on_verifolio = visible_on_verifolio === 'true';
    }

    const result = await listMissions(filter);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ missions: result.data });
  } catch (error) {
    console.error('Error listing missions:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des missions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/missions
 * Créer une nouvelle mission manuellement
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validation
    if (!body.title || !body.client_id) {
      return NextResponse.json(
        { error: 'Le titre et le client sont obligatoires' },
        { status: 400 }
      );
    }

    const payload: CreateMissionPayload = {
      title: body.title,
      client_id: body.client_id,
      deal_id: body.deal_id || undefined,
      description: body.description || undefined,
      estimated_amount: body.estimated_amount || undefined,
      started_at: body.started_at || undefined,
      visible_on_verifolio: body.visible_on_verifolio ?? true,
      contacts: body.contacts || undefined,
    };

    const result = await createMission(payload);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ mission: result.data }, { status: 201 });
  } catch (error) {
    console.error('Error creating mission:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de la mission' },
      { status: 500 }
    );
  }
}
