import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/supabase/auth-helper';

// Image constraints
const MAX_SIZE_MB = 5;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/proposals/:id/images
 * Upload an image for a proposal block
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: proposalId } = await context.params;
    const supabase = await createClient();
    const userId = await getUserId(supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    // Verify proposal ownership
    const { data: proposal } = await supabase
      .from('proposals')
      .select('id')
      .eq('id', proposalId)
      .eq('user_id', userId)
      .single();

    if (!proposal) {
      return NextResponse.json({ error: 'Proposition non trouvee' }, { status: 404 });
    }

    // Get file from form data
    const formData = await request.formData();
    const file = formData.get('image') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Format non supporte. Formats acceptes: PNG, JPG, WebP, GIF' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: `Fichier trop volumineux. Maximum: ${MAX_SIZE_MB} Mo` },
        { status: 400 }
      );
    }

    // Generate unique filename
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const filename = `proposal-${proposalId}-${Date.now()}.${ext}`;
    const filePath = `proposal-images/${filename}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('company-assets')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Erreur lors de l\'upload' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('company-assets')
      .getPublicUrl(filePath);

    return NextResponse.json({
      data: { url: urlData.publicUrl },
      message: 'Image uploadee avec succes'
    });

  } catch (error) {
    console.error('POST /api/proposals/:id/images error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
