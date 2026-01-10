import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  uploadAndSaveEntityDocument,
  listEntityDocuments,
} from '@/lib/documents/entity-documents';
import type { DocumentEntityType, DocumentKind } from '@/lib/supabase/types';

const VALID_ENTITY_TYPES: DocumentEntityType[] = ['DEAL', 'MISSION'];
const VALID_DOC_KINDS: DocumentKind[] = ['PO', 'DELIVERY_NOTE'];

/**
 * POST /api/entity-documents
 * Upload a document and attach it to an entity
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const entityType = formData.get('entityType') as string | null;
    const entityId = formData.get('entityId') as string | null;
    const docKind = formData.get('docKind') as string | null;

    // Validation
    if (!file) {
      return NextResponse.json({ error: 'Fichier requis' }, { status: 400 });
    }

    if (!entityType || !VALID_ENTITY_TYPES.includes(entityType as DocumentEntityType)) {
      return NextResponse.json(
        { error: 'entityType invalide (DEAL ou MISSION)' },
        { status: 400 }
      );
    }

    if (!entityId) {
      return NextResponse.json({ error: 'entityId requis' }, { status: 400 });
    }

    if (!docKind || !VALID_DOC_KINDS.includes(docKind as DocumentKind)) {
      return NextResponse.json(
        { error: 'docKind invalide (PO ou DELIVERY_NOTE)' },
        { status: 400 }
      );
    }

    // Upload and save
    const result = await uploadAndSaveEntityDocument(supabase, user.id, file, {
      entityType: entityType as DocumentEntityType,
      entityId,
      docKind: docKind as DocumentKind,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: result.data }, { status: 201 });
  } catch (error) {
    console.error('POST /api/entity-documents error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/entity-documents?entityType=DEAL&entityId=xxx
 * List documents for an entity
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');

    if (!entityType || !VALID_ENTITY_TYPES.includes(entityType as DocumentEntityType)) {
      return NextResponse.json(
        { error: 'entityType invalide (DEAL ou MISSION)' },
        { status: 400 }
      );
    }

    if (!entityId) {
      return NextResponse.json({ error: 'entityId requis' }, { status: 400 });
    }

    const result = await listEntityDocuments(
      supabase,
      user.id,
      entityType as DocumentEntityType,
      entityId
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    console.error('GET /api/entity-documents error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
