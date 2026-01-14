import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/supabase/auth-helper';
import OpenAI from 'openai';
import type { BriefQuestionType, SelectionMode } from '@/lib/briefs/types';

// Types de blocs valides
const VALID_BLOCK_TYPES = [
  'title',
  'description',
  'separator',
  'media',
  'text_short',
  'text_long',
  'number',
  'address',
  'date',
  'time',
  'selection',
  'rating',
] as const;

const SYSTEM_PROMPT = `Tu es un assistant spécialisé dans la création de briefs clients sous forme de formulaires intelligents.

Ta mission est de générer une OSSATURE DE BRIEF (template), pas un brief final.

Le brief doit être conçu comme un formulaire type Google Forms :
- simple
- clair
- rapide à remplir
- réutilisable

⚠️ Contraintes strictes
Tu dois utiliser UNIQUEMENT les types de blocs suivants :

BLOCS STRUCTURELS :
- title (titre de section)
- description (texte explicatif)
- separator (séparateur visuel)

QUESTIONS (avec un seul type de réponse par question) :
- text_short (réponse courte, 1 ligne)
- text_long (réponse longue, paragraphe)
- number (nombre)
- address (adresse complète)
- date (date ou période)
- time (heure)

CHOIX (type: selection avec selection_type) :
- selection avec selection_type: "radio" (choix unique)
- selection avec selection_type: "multiple" (choix multiples)
- selection avec selection_type: "dropdown" (menu déroulant)

ÉVALUATION :
- rating (étoiles de 1 à 5)

❌ Tu ne dois inventer aucun autre type de champ.

---

🎯 Objectif du brief
Créer un brief client clair et structuré qui permet au freelance de :
- comprendre le contexte
- cadrer la mission
- identifier les attentes, contraintes et priorités

Le brief doit :
- être rempli en moins de 10 minutes
- éviter toute charge mentale inutile
- contenir uniquement les questions réellement utiles
- être facilement modifiable (questions supprimables ou ajustables)

---

🧠 Méthode attendue

1. Commence par un title et une description expliquant brièvement l'objectif du brief.
2. Structure le brief en sections logiques séparées par des separators.
3. Dans chaque section, propose :
   - des questions simples
   - avec le type de réponse le plus pertinent
4. Privilégie :
   - les choix (selection) quand possible
   - les textes courts pour les informations factuelles
   - les textes longs uniquement pour les points stratégiques
5. Ajoute, si pertinent, une question d'importance (rating) pour prioriser certains sujets.
6. Le contenu doit être neutre, professionnel et compréhensible par un client non expert.

---

📤 Format de sortie OBLIGATOIRE

Retourne UNIQUEMENT un JSON strict avec cette structure :

{
  "blocks": [
    {
      "type": "title",
      "label": "Informations générales"
    },
    {
      "type": "description",
      "label": "Merci de remplir ce formulaire pour nous aider à préparer votre événement."
    },
    {
      "type": "text_short",
      "label": "Nom de l'entreprise",
      "is_required": true
    },
    {
      "type": "selection",
      "label": "Type d'événement",
      "is_required": true,
      "config": {
        "selection_type": "radio",
        "options": ["Séminaire", "Team building", "Soirée gala", "Autre"]
      }
    },
    {
      "type": "date",
      "label": "Date souhaitée",
      "is_required": true,
      "config": {
        "mode": "single"
      }
    },
    {
      "type": "rating",
      "label": "Importance du budget"
    },
    {
      "type": "separator"
    }
  ]
}

RÈGLES JSON :
- Chaque bloc a obligatoirement "type" et "label" (sauf separator qui n'a pas de label)
- "is_required" est optionnel (défaut: false)
- "config" est requis uniquement pour: selection (avec selection_type et options), date (avec mode)
- Ne génère AUCUN texte en dehors du JSON`;

interface GeneratedBlock {
  type: string;
  label?: string;
  is_required?: boolean;
  config?: {
    selection_type?: SelectionMode;
    options?: string[];
    mode?: string;
  };
}

interface BriefStructureResponse {
  blocks: GeneratedBlock[];
}

/**
 * POST /api/ai/brief-structure
 * Generate a brief structure based on a mini-prompt
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
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OPENAI_API_KEY not configured');
      return NextResponse.json(
        { error: 'Service IA non configuré' },
        { status: 503 }
      );
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey,
    });

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 2048,
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: `Contexte métier et objectif du brief :\n\n${prompt.trim()}`,
        },
      ],
      response_format: { type: 'json_object' },
    });

    // Extract text content
    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      return NextResponse.json(
        { error: 'Réponse IA invalide' },
        { status: 500 }
      );
    }

    // Parse JSON response
    let structure: BriefStructureResponse;
    try {
      let jsonText = responseText.trim();
      // Clean up markdown code blocks if present
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
      console.error('Failed to parse AI response:', responseText);
      return NextResponse.json(
        { error: 'Impossible de parser la réponse IA' },
        { status: 500 }
      );
    }

    // Validate structure
    if (!structure.blocks || !Array.isArray(structure.blocks)) {
      return NextResponse.json(
        { error: 'Structure de réponse invalide' },
        { status: 500 }
      );
    }

    // Filter and validate blocks
    const validBlocks = structure.blocks
      .filter((block) => {
        // Check valid type
        if (!VALID_BLOCK_TYPES.includes(block.type as typeof VALID_BLOCK_TYPES[number])) {
          console.warn(`Invalid block type: ${block.type}`);
          return false;
        }
        // Separator doesn't need a label
        if (block.type === 'separator') {
          return true;
        }
        // All other blocks need a label
        if (!block.label || typeof block.label !== 'string') {
          console.warn(`Block missing label: ${block.type}`);
          return false;
        }
        return true;
      })
      .map((block, index) => {
        const validBlock: {
          type: BriefQuestionType;
          label: string;
          position: number;
          is_required: boolean;
          config: Record<string, unknown>;
        } = {
          type: block.type as BriefQuestionType,
          label: block.label || '',
          position: index,
          is_required: block.is_required ?? false,
          config: {},
        };

        // Add config for selection type
        if (block.type === 'selection' && block.config) {
          validBlock.config = {
            selection_type: block.config.selection_type || 'dropdown',
            options: block.config.options || ['Option 1', 'Option 2'],
            allow_other: false,
          };
        }

        // Add config for date type
        if (block.type === 'date' && block.config) {
          validBlock.config = {
            mode: block.config.mode || 'single',
          };
        }

        return validBlock;
      });

    return NextResponse.json({
      success: true,
      data: {
        blocks: validBlocks,
      },
    });
  } catch (error) {
    console.error('POST /api/ai/brief-structure error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération de la structure' },
      { status: 500 }
    );
  }
}
