import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/supabase/auth-helper';

// GET - Récupérer le profil de l'utilisateur connecté
export async function GET() {
  try {
    const supabase = await createClient();
    const userId = await getUserId(supabase);

    // Récupérer le profil
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned (profil pas encore créé)
      throw error;
    }

    // Récupérer aussi l'email depuis auth.users via la session
    const { data: { user } } = await supabase.auth.getUser();

    return NextResponse.json({
      ...profile,
      email: user?.email || null,
      user_id: userId,
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du profil' },
      { status: 500 }
    );
  }
}

// PUT - Mettre à jour le profil
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userId = await getUserId(supabase);
    const body = await request.json();

    const { prenom, nom, fonction, telephone, date_anniversaire, photo_url } = body;

    // Vérifier si le profil existe
    const { data: existing } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    let result;

    if (existing) {
      // Update
      result = await supabase
        .from('user_profiles')
        .update({
          prenom,
          nom,
          fonction,
          telephone,
          date_anniversaire,
          photo_url,
        })
        .eq('user_id', userId)
        .select()
        .single();
    } else {
      // Insert
      result = await supabase
        .from('user_profiles')
        .insert({
          user_id: userId,
          prenom,
          nom,
          fonction,
          telephone,
          date_anniversaire,
          photo_url,
        })
        .select()
        .single();
    }

    if (result.error) {
      throw result.error;
    }

    // Récupérer l'email
    const { data: { user } } = await supabase.auth.getUser();

    return NextResponse.json({
      ...result.data,
      email: user?.email || null,
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du profil' },
      { status: 500 }
    );
  }
}
