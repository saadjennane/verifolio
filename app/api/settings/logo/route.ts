import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/supabase/auth-helper';

// Logo constraints
const MAX_SIZE_KB = 500;
const MAX_SIZE_BYTES = MAX_SIZE_KB * 1024;
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userId = await getUserId(supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('logo') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Format non supporté. Formats acceptés: PNG, JPG, SVG, WebP` },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: `Fichier trop volumineux. Maximum: ${MAX_SIZE_KB} Ko` },
        { status: 400 }
      );
    }

    // Generate unique filename
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const filename = `logo-${userId}-${Date.now()}.${ext}`;
    const filePath = `logos/${filename}`;

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

    const logoUrl = urlData.publicUrl;

    // Update company with new logo URL
    const { error: updateError } = await supabase
      .from('companies')
      .update({ logo_url: logoUrl, updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: { logo_url: logoUrl },
      message: 'Logo uploadé avec succès'
    });

  } catch (error) {
    console.error('POST /api/settings/logo error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient();
    const userId = await getUserId(supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Get current logo URL
    const { data: company } = await supabase
      .from('companies')
      .select('logo_url')
      .eq('user_id', userId)
      .single();

    if (company?.logo_url) {
      // Extract file path from URL and delete from storage
      const url = new URL(company.logo_url);
      const pathMatch = url.pathname.match(/\/company-assets\/(.+)$/);
      if (pathMatch) {
        await supabase.storage.from('company-assets').remove([pathMatch[1]]);
      }
    }

    // Clear logo URL in company
    const { error: updateError } = await supabase
      .from('companies')
      .update({ logo_url: null, updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (updateError) {
      return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Logo supprimé' });

  } catch (error) {
    console.error('DELETE /api/settings/logo error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
