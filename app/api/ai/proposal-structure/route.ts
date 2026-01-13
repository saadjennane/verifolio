import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/supabase/auth-helper';
import Anthropic from '@anthropic-ai/sdk';

// Liste des pages disponibles dans le catalogue
const AVAILABLE_PAGES = [
  'Couverture',
  'Contexte / Compréhension du besoin',
  'Rappel du brief',
  'Notre solution',
  'Périmètre de la mission',
  'Livrables',
  'Planning',
  'Budget / Tarifs',
  'Méthodologie',
  'À propos',
  'Nos références',
  'Concept',
  'Moodboard',
  'Détails techniques',
  'Prochaines étapes',
  'Contact',
  'Page libre',
];

const SYSTEM_PROMPT = `Tu es un assistant expert en structuration de documents commerciaux pour freelances.

Contexte :
L'utilisateur est en train de CRÉER UNE TEMPLATE DE PROPOSITION (réutilisable).
Il ne crée pas une proposition client finale, mais une structure de document.

Objectif :
À partir d'un court texte descriptif (mini-prompt),
tu dois proposer une STRUCTURE DE PAGES logique et professionnelle.

RÈGLES IMPORTANTES

- Tu NE rédiges PAS le contenu des pages
- Tu NE génères PAS de texte marketing
- Tu NE fais QUE :
  - proposer des pages
  - leur ordre
  - une courte justification si nécessaire

- La structure doit être :
  - claire
  - réutilisable
  - adaptée à un freelance
- Le nombre de pages doit rester raisonnable (5 à 8 max)
- La page "Couverture" est TOUJOURS incluse en premier

LISTE DES PAGES DISPONIBLES (UTILISABLES)

Tu dois uniquement choisir parmi ces pages :

${AVAILABLE_PAGES.map(p => `- ${p}`).join('\n')}

FORMAT DE SORTIE OBLIGATOIRE

Retourne UNIQUEMENT un JSON strict, sans texte autour :

{
  "pages": [
    {
      "name": "Couverture",
      "reason": "Présentation claire et professionnelle"
    },
    {
      "name": "Contexte / Compréhension du besoin",
      "reason": "Montrer que le besoin client est compris"
    }
  ]
}

NE FAIS PAS :
- de phrases longues
- de conseils UX
- de rédaction de contenu
- d'explication hors JSON

Tu es un architecte de structure, pas un rédacteur.`;

interface PageSuggestion {
  name: string;
  reason: string;
}

interface StructureResponse {
  pages: PageSuggestion[];
}

/**
 * POST /api/ai/proposal-structure
 * Generate a proposal structure based on a mini-prompt
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const userId = await getUserId(supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 5) {
      return NextResponse.json(
        { error: 'Le prompt doit contenir au moins 5 caractères' },
        { status: 400 }
      );
    }

    // Check for API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY not configured');
      return NextResponse.json(
        { error: 'Service IA non configuré' },
        { status: 503 }
      );
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey,
    });

    // Call Claude API
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt.trim(),
        },
      ],
      system: SYSTEM_PROMPT,
    });

    // Extract text content
    const textContent = message.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json(
        { error: 'Réponse IA invalide' },
        { status: 500 }
      );
    }

    // Parse JSON response
    let structure: StructureResponse;
    try {
      // Clean up the response (remove markdown code blocks if present)
      let jsonText = textContent.text.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.slice(7);
      }
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.slice(3);
      }
      if (jsonText.endsWith('```')) {
        jsonText = jsonText.slice(0, -3);
      }
      jsonText = jsonText.trim();

      structure = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', textContent.text);
      return NextResponse.json(
        { error: 'Impossible de parser la réponse IA' },
        { status: 500 }
      );
    }

    // Validate structure
    if (!structure.pages || !Array.isArray(structure.pages)) {
      return NextResponse.json(
        { error: 'Structure de réponse invalide' },
        { status: 500 }
      );
    }

    // Filter to only include valid pages
    const validPages = structure.pages.filter(page =>
      AVAILABLE_PAGES.includes(page.name)
    );

    // Ensure Couverture is first
    const hasCover = validPages.some(p => p.name === 'Couverture');
    if (!hasCover) {
      validPages.unshift({
        name: 'Couverture',
        reason: 'Page de présentation obligatoire',
      });
    } else {
      // Move Couverture to first position if not already
      const coverIndex = validPages.findIndex(p => p.name === 'Couverture');
      if (coverIndex > 0) {
        const [cover] = validPages.splice(coverIndex, 1);
        validPages.unshift(cover);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        pages: validPages,
        availablePages: AVAILABLE_PAGES,
      },
    });
  } catch (error) {
    console.error('POST /api/ai/proposal-structure error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération de la structure' },
      { status: 500 }
    );
  }
}
