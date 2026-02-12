import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/supabase/auth-helper';

// ============================================================================
// DELETE /api/clients/[id]/logo - Delete client logo
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const supabase = await createClient();
    const userId = await getUserId(supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Verify client ownership
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, logo_url, user_id')
      .eq('id', clientId)
      .eq('user_id', userId)
      .single();

    if (clientError || !client) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 });
    }

    // Delete from storage if it's an internal URL
    if (client.logo_url) {
      try {
        const url = new URL(client.logo_url);
        const pathMatch = url.pathname.match(/\/company-assets\/(.+)$/);
        if (pathMatch) {
          await supabase.storage.from('company-assets').remove([pathMatch[1]]);
        }
      } catch {
        // Ignore URL parsing errors for external URLs
      }
    }

    // Clear logo fields in database
    const { error: updateError } = await supabase
      .from('clients')
      .update({
        logo_url: null,
        logo_source: null,
        logo_updated_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', clientId)
      .eq('user_id', userId);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Logo supprimé' });
  } catch (error) {
    console.error('DELETE /api/clients/[id]/logo error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// ============================================================================
// POST /api/clients/[id]/logo - Upload client logo (multipart)
// ============================================================================

const MAX_SIZE_KB = 500;
const MAX_SIZE_BYTES = MAX_SIZE_KB * 1024;
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const supabase = await createClient();
    const userId = await getUserId(supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Verify client ownership
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, logo_url, user_id')
      .eq('id', clientId)
      .eq('user_id', userId)
      .single();

    if (clientError || !client) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('logo') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Format non supporté. Formats acceptés: PNG, JPG, SVG, WebP' },
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

    // Delete old logo from storage if exists
    if (client.logo_url) {
      try {
        const url = new URL(client.logo_url);
        const pathMatch = url.pathname.match(/\/company-assets\/(.+)$/);
        if (pathMatch) {
          await supabase.storage.from('company-assets').remove([pathMatch[1]]);
        }
      } catch {
        // Ignore URL parsing errors
      }
    }

    // Generate unique filename
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const filename = `client-logo-${userId}-${clientId}-${Date.now()}.${ext}`;
    const filePath = `client-logos/${filename}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('company-assets')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: "Erreur lors de l'upload" }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('company-assets')
      .getPublicUrl(filePath);

    const logoUrl = urlData.publicUrl;

    // Update client with new logo
    const { error: updateError } = await supabase
      .from('clients')
      .update({
        logo_url: logoUrl,
        logo_source: 'upload',
        logo_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', clientId)
      .eq('user_id', userId);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 });
    }

    return NextResponse.json({
      data: { logo_url: logoUrl, logo_source: 'upload' },
      message: 'Logo uploadé avec succès',
    });
  } catch (error) {
    console.error('POST /api/clients/[id]/logo error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// ============================================================================
// PATCH /api/clients/[id]/logo - Select logo from logo.dev results
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const supabase = await createClient();
    const userId = await getUserId(supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Verify client ownership
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, logo_url, user_id')
      .eq('id', clientId)
      .eq('user_id', userId)
      .single();

    if (clientError || !client) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 });
    }

    const body = await request.json();
    const { logoUrl } = body;

    if (!logoUrl || typeof logoUrl !== 'string') {
      return NextResponse.json({ error: 'URL du logo requise' }, { status: 400 });
    }

    // Validate URL format
    try {
      const url = new URL(logoUrl);
      // Only allow logo.dev URLs for security
      if (!url.hostname.endsWith('logo.dev') && !url.hostname.endsWith('img.logo.dev')) {
        return NextResponse.json(
          { error: 'URL non autorisée. Seules les URLs logo.dev sont acceptées.' },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json({ error: 'URL invalide' }, { status: 400 });
    }

    // Delete old logo from storage if it was uploaded
    if (client.logo_url) {
      try {
        const url = new URL(client.logo_url);
        const pathMatch = url.pathname.match(/\/company-assets\/(.+)$/);
        if (pathMatch) {
          await supabase.storage.from('company-assets').remove([pathMatch[1]]);
        }
      } catch {
        // Ignore
      }
    }

    // Update client with logo.dev URL
    const { error: updateError } = await supabase
      .from('clients')
      .update({
        logo_url: logoUrl,
        logo_source: 'logodev',
        logo_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', clientId)
      .eq('user_id', userId);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 });
    }

    return NextResponse.json({
      data: { logo_url: logoUrl, logo_source: 'logodev' },
      message: 'Logo sélectionné avec succès',
    });
  } catch (error) {
    console.error('PATCH /api/clients/[id]/logo error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
