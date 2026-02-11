import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';

// ============================================================================
// Types
// ============================================================================

type AIAction = 'summarize' | 'structure' | 'extract_actions' | 'to_email' | 'to_proposal' | 'to_quote';

// ============================================================================
// Prompts
// ============================================================================

const ACTION_PROMPTS: Record<AIAction, string> = {
  summarize: `Tu es un assistant expert en synthèse. Résume le texte suivant de manière concise et claire, en conservant les informations clés. Limite-toi à 3-5 phrases maximum.`,

  structure: `Tu es un assistant expert en organisation. Restructure le texte suivant en utilisant:
- Des titres clairs (##)
- Des listes à puces pour les éléments
- Des paragraphes bien délimités
Conserve toutes les informations mais améliore leur lisibilité.`,

  extract_actions: `Tu es un assistant expert en gestion de projet. Analyse le texte suivant et extrais toutes les actions à réaliser sous forme de liste de tâches. Format:
- [ ] Tâche 1
- [ ] Tâche 2
Identifie également les responsables et délais si mentionnés.`,

  to_email: `Tu es un assistant expert en communication professionnelle. Transforme le texte suivant en email professionnel avec:
- Un objet clair
- Une salutation appropriée
- Un corps de message structuré
- Une formule de politesse
Garde un ton professionnel mais cordial.`,

  to_proposal: `Tu es un assistant expert en rédaction commerciale. Transforme le texte suivant en proposition commerciale structurée avec:
- Un titre accrocheur
- Une description du contexte
- Les objectifs
- La méthodologie proposée
- Les livrables attendus
- (Laisser les tarifs à compléter)`,

  to_quote: `Tu es un assistant expert en devis. Analyse le texte suivant et crée une structure de devis avec:
- Identification des prestations/produits
- Description de chaque ligne
- (Laisser les prix à compléter: XXX €)
- Conditions générales suggérées`,
};

// ============================================================================
// Route Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const { action, content } = body as { action: AIAction; content: string };

    if (!action || !content) {
      return NextResponse.json(
        { error: 'Action et contenu requis' },
        { status: 400 }
      );
    }

    if (!ACTION_PROMPTS[action]) {
      return NextResponse.json(
        { error: 'Action non reconnue' },
        { status: 400 }
      );
    }

    // Get OpenAI API key from settings
    const { data: settings } = await supabase
      .from('user_settings')
      .select('openai_api_key')
      .eq('user_id', user.id)
      .single();

    const apiKey = settings?.openai_api_key || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Clé API OpenAI non configurée' },
        { status: 400 }
      );
    }

    const openai = new OpenAI({ apiKey });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: ACTION_PROMPTS[action],
        },
        {
          role: 'user',
          content,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const result = response.choices[0]?.message?.content || '';

    return NextResponse.json({ result });
  } catch (error) {
    console.error('Error in POST /api/notes/ai:', error);
    return NextResponse.json(
      { error: 'Erreur lors du traitement IA' },
      { status: 500 }
    );
  }
}
