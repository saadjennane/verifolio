import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/supabase/auth-helper';

// ============================================================================
// POST /api/clients/[id]/logo/search - Search logos via logo.dev API
// ============================================================================

// Domain validation regex
const DOMAIN_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;

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
      .select('id, user_id')
      .eq('id', clientId)
      .eq('user_id', userId)
      .single();

    if (clientError || !client) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 });
    }

    const body = await request.json();
    const { domain } = body;

    if (!domain || typeof domain !== 'string') {
      return NextResponse.json({ error: 'Domaine requis' }, { status: 400 });
    }

    // Clean and validate domain
    const cleanDomain = domain.trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];

    if (!DOMAIN_REGEX.test(cleanDomain)) {
      return NextResponse.json(
        { error: 'Format de domaine invalide. Ex: acme.com' },
        { status: 400 }
      );
    }

    // Check if API key is configured
    const apiKey = process.env.LOGODEV_API_KEY;

    // Build logo.dev URL - their API is straightforward
    // https://img.logo.dev/{domain}?token={token}
    const logoUrl = `https://img.logo.dev/${cleanDomain}?token=${apiKey || 'demo'}&size=200`;

    // For logo.dev, we can also provide multiple format variants
    const variants = [
      {
        url: `https://img.logo.dev/${cleanDomain}?token=${apiKey || 'demo'}&size=200`,
        size: 200,
        format: 'default',
      },
      {
        url: `https://img.logo.dev/${cleanDomain}?token=${apiKey || 'demo'}&size=128`,
        size: 128,
        format: 'small',
      },
      {
        url: `https://img.logo.dev/${cleanDomain}?token=${apiKey || 'demo'}&size=64`,
        size: 64,
        format: 'icon',
      },
    ];

    // Verify the logo exists by making a HEAD request
    try {
      const checkResponse = await fetch(logoUrl, { method: 'HEAD' });
      if (!checkResponse.ok) {
        return NextResponse.json({
          data: {
            found: false,
            domain: cleanDomain,
            variants: [],
          },
          message: 'Aucun logo trouvé pour ce domaine',
        });
      }
    } catch {
      return NextResponse.json({
        data: {
          found: false,
          domain: cleanDomain,
          variants: [],
        },
        message: 'Impossible de vérifier le logo',
      });
    }

    return NextResponse.json({
      data: {
        found: true,
        domain: cleanDomain,
        variants,
      },
      message: 'Logo trouvé',
    });
  } catch (error) {
    console.error('POST /api/clients/[id]/logo/search error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
