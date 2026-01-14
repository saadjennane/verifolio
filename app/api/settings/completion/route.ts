import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/supabase/auth-helper';

/**
 * GET /api/settings/completion
 * Returns completion status for the 4 required settings sections
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const userId = await getUserId(supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // 1. Profile check: nom OR prenom filled
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('nom, prenom')
      .eq('user_id', userId)
      .single();

    const profileComplete = !!(profile?.nom?.trim() || profile?.prenom?.trim());

    // 2. Company check: display_name filled
    const { data: company } = await supabase
      .from('companies')
      .select('display_name')
      .eq('user_id', userId)
      .single();

    const companyComplete = !!company?.display_name?.trim();

    // 3. Templates check: at least one template exists
    const { count: templateCount } = await supabase
      .from('templates')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    const templatesComplete = (templateCount || 0) > 0;

    // 4. Emails check: company settings exist (uses defaults from company)
    const emailsComplete = companyComplete;

    // Calculate percentage (each section = 25%)
    const completedSections = [profileComplete, companyComplete, templatesComplete, emailsComplete]
      .filter(Boolean).length;
    const percentage = Math.round((completedSections / 4) * 100);

    return NextResponse.json({
      data: {
        sections: {
          profile: { complete: profileComplete, label: 'Profil' },
          company: { complete: companyComplete, label: 'Entreprise' },
          templates: { complete: templatesComplete, label: 'Templates' },
          emails: { complete: emailsComplete, label: 'Emails' },
        },
        percentage,
        allComplete: percentage === 100,
      },
    });
  } catch (error) {
    console.error('GET /api/settings/completion error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
