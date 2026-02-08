import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/supabase/auth-helper';
import { getBrief } from '@/lib/briefs/briefs';
import { formatBriefForSummary, hasResponsesToSummarize } from '@/lib/briefs/format-responses';
import OpenAI from 'openai';

const SYSTEM_PROMPT = `Tu es un assistant qui analyse les réponses d'un brief client pour un freelance.

Ta mission est de générer un résumé concis et utile des réponses fournies par le client.

Le résumé doit :
- Être en français
- Mettre en avant les informations clés (dates, lieux, budget, quantités, etc.)
- Identifier les objectifs principaux du client
- Noter les contraintes ou points d'attention importants
- Rester concis (2-3 paragraphes maximum)

Format de sortie OBLIGATOIRE :
Retourne un JSON avec cette structure :
{
  "summary": "Le résumé en texte simple, avec des retours à la ligne pour séparer les paragraphes."
}

RÈGLES :
- Le résumé doit être directement exploitable par le freelance
- Pas de markdown, juste du texte simple avec des retours à la ligne
- Si certaines informations manquent, ne les mentionne pas
- Commence directement par les informations clés, pas de formule d'introduction`;

interface SummaryResponse {
  summary: string;
}

/**
 * POST /api/ai/brief-summary
 * Generate a summary of brief responses using AI
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const userId = await getUserId(supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { briefId } = body;

    if (!briefId || typeof briefId !== 'string') {
      return NextResponse.json(
        { error: 'briefId requis' },
        { status: 400 }
      );
    }

    // Fetch the brief with all details
    const { success, data: brief, error: briefError } = await getBrief(briefId);

    if (!success || !brief) {
      return NextResponse.json(
        { error: briefError || 'Brief introuvable' },
        { status: 404 }
      );
    }

    // Verify the brief has responses
    if (brief.status !== 'RESPONDED') {
      return NextResponse.json(
        { error: 'Le brief n\'a pas encore de réponses' },
        { status: 400 }
      );
    }

    if (!hasResponsesToSummarize(brief)) {
      return NextResponse.json(
        { error: 'Aucune réponse à résumer' },
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

    // Format the brief for the LLM
    const formattedBrief = formatBriefForSummary(brief);

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey,
    });

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 1024,
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: `Voici les réponses du brief à résumer :\n\n${formattedBrief}`,
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
    let result: SummaryResponse;
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

      result = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', responseText);
      return NextResponse.json(
        { error: 'Impossible de parser la réponse IA' },
        { status: 500 }
      );
    }

    // Validate response structure
    if (!result.summary || typeof result.summary !== 'string') {
      return NextResponse.json(
        { error: 'Structure de réponse invalide' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        summary: result.summary,
      },
    });
  } catch (error) {
    console.error('POST /api/ai/brief-summary error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération du résumé' },
      { status: 500 }
    );
  }
}
