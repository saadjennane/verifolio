import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/supabase/auth-helper';
import { getSystemPromptWithMode, enrichPromptWithContext } from '@/lib/llm/prompt';
import { toolDefinitions, ToolName } from '@/lib/llm/tools';
import { executeToolCall } from '@/lib/llm/router';
import { type ChatMode, getToolPermission, READ_ONLY_TOOLS } from '@/lib/chat/modes';
import { getStepLabelFromTool } from '@/lib/chat/working';
import {
  ChatRequestSchema,
  ContextIdSchema,
  ToolCallSchema,
  ToolResultSchema,
} from '@/lib/llm/schemas';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
}

// Timeout pour les appels OpenAI (60 secondes - GPT-4o-mini peut prendre du temps avec tools)
const OPENAI_TIMEOUT_MS = 60000;
const TOOL_TIMEOUT_MS = 30000;
const TOTAL_TIMEOUT_MS = 90000;

// Encoder pour SSE
const encoder = new TextEncoder();

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`${label} timeout`)), ms);
    promise
      .then((val) => {
        clearTimeout(timeout);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timeout);
        reject(err);
      });
  });
}

function ensureWithinBudget(start: number) {
  if (Date.now() - start > TOTAL_TIMEOUT_MS) {
    throw new Error('TIMEOUT: Request exceeded total budget');
  }
}

function parseContextIdString(contextId: string | null | undefined) {
  if (!contextId) return null;
  const [type, ...rest] = contextId.split(':');
  const id = rest.join(':') || undefined;
  const parsed = ContextIdSchema.safeParse({ type, id });
  if (!parsed.success) {
    return null;
  }
  return parsed.data;
}

// Fonction pour appeler OpenAI avec timeout
async function callOpenAI(
  apiKey: string,
  messages: ChatMessage[],
  toolChoice: 'auto' | 'required' | 'none' = 'auto',
  tools: typeof toolDefinitions = toolDefinitions
) {
  const body: Record<string, unknown> = {
    model: 'gpt-4o-mini',
    messages,
  };

  // N'inclure les tools que si toolChoice n'est pas 'none' et qu'il y a des tools
  if (toolChoice !== 'none' && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = toolChoice;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('TIMEOUT: La requête OpenAI a pris trop de temps');
    }
    throw error;
  }
}

// Fonction pour appeler OpenAI avec streaming
async function callOpenAIStream(
  apiKey: string,
  messages: ChatMessage[]
): Promise<Response> {
  const body = {
    model: 'gpt-4o-mini',
    messages,
    stream: true,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('TIMEOUT: La requête OpenAI a pris trop de temps');
    }
    throw error;
  }
}

// Créer une réponse SSE streamée
function createStreamResponse(
  openAIResponse: Response,
  metadata?: {
    workingSteps?: string[];
    entitiesCreated?: Array<{ type: string; id: string; title: string }>;
    tabsToOpen?: Array<{ type: string; path: string; title: string; entityId: string }>;
  }
): Response {
  const stream = new ReadableStream({
    async start(controller) {
      // Envoyer les métadonnées en premier
      if (metadata) {
        const metaEvent = `data: ${JSON.stringify({ type: 'metadata', ...metadata })}\n\n`;
        controller.enqueue(encoder.encode(metaEvent));
      }

      const reader = openAIResponse.body?.getReader();
      if (!reader) {
        controller.close();
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                continue;
              }

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  const textEvent = `data: ${JSON.stringify({ type: 'text', content })}\n\n`;
                  controller.enqueue(encoder.encode(textEvent));
                }
              } catch {
                // Ignorer les erreurs de parsing
              }
            }
          }
        }
      } catch (error) {
        console.error('Stream error:', error);
        const errorEvent = `data: ${JSON.stringify({ type: 'error', message: 'Erreur de streaming' })}\n\n`;
        controller.enqueue(encoder.encode(errorEvent));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// Détecter si la réponse suggère que le LLM aurait dû utiliser un tool
// OPTIMISÉ: Seuls les vrais échecs déclenchent un retry (pas les suggestions/questions)
function shouldRetryWithTools(content: string): boolean {
  const failurePatterns = [
    // Vrais échecs - le LLM dit qu'il ne peut pas faire quelque chose
    /je ne (peux|suis) pas/i,
    /pas accès aux/i,
    /pas d['']information/i,
    /impossible de/i,
    /aucune donnée/i,
    /je n['']ai pas/i,
    /pas de données/i,
    /ne dispose pas/i,
    /aucune facture.*enregistr/i,
    // Patterns retirés (faux positifs qui causaient des retries inutiles):
    // - /vous devez/i (conseil)
    // - /il faudrait/i (suggestion)
    // - /il semble qu/i (observation)
    // - /n'hésitez pas à créer/i (suggestion)
    // - /souhaitez.*(lister|vérifier|voir)/i (question)
    // - /je peux vérifier pour vous/i (offre)
    // - /voulez-vous que je/i (question)
    // - /je vais (procéder|créer|générer|préparer)/i (intention)
    // - /un instant/i (transition)
    // - /je (crée|génère|prépare) (la|le|une|un)/i (action en cours)
    // - /je m'en occupe/i (confirmation)
    // - /c'est parti/i (confirmation)
    // - /voici les détails.*créer/i (info)
  ];
  return failurePatterns.some(p => p.test(content));
}

// Interface pour les résultats d'exécution avec étapes
interface ToolExecutionResult {
  id: string;
  result: string;
  toolName: string;
  stepLabel: string;
  entityCreated?: {
    type: string;
    id: string;
    title: string;
  };
  tabToOpen?: {
    type: string;
    path: string;
    title: string;
    entityId: string;
  };
}

// Mapping des tools vers les types d'entité à rafraîchir
const TOOL_TO_ENTITY_TYPE: Record<string, string> = {
  create_client: 'clients',
  create_contact: 'contacts',
  create_deal: 'deals',
  update_deal_status: 'deals',
  create_mission: 'missions',
  update_mission_status: 'missions',
  create_quote: 'quotes',
  create_invoice: 'invoices',
  convert_quote_to_invoice: 'invoices',
  mark_invoice_paid: 'invoices',
  create_proposal: 'proposals',
  set_proposal_status: 'proposals',
  create_brief: 'briefs',
  send_brief: 'briefs',
  create_review_request: 'reviews',
};

// Extraire les infos de l'entité créée depuis le message de résultat
function extractEntityFromResult(toolName: string, resultMessage: string): { id: string; title: string } | null {
  // Les messages de création contiennent généralement l'ID et le titre
  // Format typique: "Client créé avec succès: Acme Corp (ID: abc-123)"
  // ou: "Facture FA-001-26 créée pour client Acme"
  // ou: "Devis DEV-003-26 créé pour client Acme"

  // Pattern pour extraire ID UUID
  const uuidMatch = resultMessage.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
  if (!uuidMatch) return null;

  // Pattern pour extraire le titre selon le tool
  let title = 'Sans titre';
  if (toolName === 'create_client') {
    // "Client "Nom" créé" ou "Client créé: Nom"
    const nameMatch = resultMessage.match(/Client\s+[""«]?([^""»\n]+)[""»]?\s+créé/i) ||
                      resultMessage.match(/créé.*:\s*([^(\n]+)/i);
    if (nameMatch) title = nameMatch[1].trim();
  } else if (toolName === 'create_quote') {
    // Nouveau format: "DEV-003-26" ou "Devis DEV-003-26"
    // Ancien format: "DEV-0001"
    const numMatch = resultMessage.match(/(?:Devis\s+)?([A-Z]{2,4}-\d{2,4}(?:-\d{2})?)/i);
    if (numMatch) title = numMatch[1];
  } else if (toolName === 'create_invoice' || toolName === 'convert_quote_to_invoice') {
    // Nouveau format: "FA-003-26" ou "Facture FA-003-26"
    // Ancien format: "FAC-0001"
    const numMatch = resultMessage.match(/(?:Facture\s+)?([A-Z]{2,4}-\d{2,4}(?:-\d{2})?)/i);
    if (numMatch) title = numMatch[1];
  } else if (toolName === 'create_deal' || toolName === 'create_mission' || toolName === 'create_proposal') {
    const titleMatch = resultMessage.match(/[""«]([^""»\n]+)[""»]/);
    if (titleMatch) title = titleMatch[1];
  }

  return { id: uuidMatch[0], title };
}

// Exécuter les tool calls et retourner les résultats avec leurs IDs
async function executeToolCalls(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string | null,
  toolCalls: Array<{ id: string; function: { name: string; arguments: string } }>
): Promise<ToolExecutionResult[]> {
  const results: ToolExecutionResult[] = [];

  for (const toolCall of toolCalls) {
    const toolName = toolCall.function.name as ToolName;
    let parsedArgs: Record<string, unknown>;
    try {
      parsedArgs = JSON.parse(toolCall.function.arguments);
    } catch {
      throw new Error(`Invalid tool arguments for ${toolName}`);
    }

    const callValidation = ToolCallSchema.safeParse({
      name: toolName,
      arguments: parsedArgs,
    });
    if (!callValidation.success) {
      throw new Error(`Tool call validation failed for ${toolName}`);
    }

    const args = callValidation.data.arguments;
    const stepLabel = getStepLabelFromTool(toolName, args);

    console.log(`Executing tool: ${toolName}`, args);

    const result = await withTimeout(
      executeToolCall(supabase, userId, toolName, args),
      TOOL_TIMEOUT_MS,
      `Tool ${toolName}`
    );

    const parsedResult = ToolResultSchema.safeParse(result);
    if (!parsedResult.success) {
      throw new Error(`Tool result validation failed for ${toolName}`);
    }

    // Extraire les informations d'entité si c'est un tool de création/modification
    const entityType = TOOL_TO_ENTITY_TYPE[toolName];
    let entityCreated: ToolExecutionResult['entityCreated'] = undefined;

    if (entityType && parsedResult.data.success) {
      const entityInfo = extractEntityFromResult(toolName, parsedResult.data.message);
      if (entityInfo) {
        entityCreated = {
          type: entityType,
          id: entityInfo.id,
          title: entityInfo.title,
        };
      }
    }

    // Extraire l'onglet à ouvrir si c'est un tool open_tab
    let tabToOpen: ToolExecutionResult['tabToOpen'] = undefined;
    const resultData = parsedResult.data.data as Record<string, unknown> | undefined;
    if (resultData?.action === 'open_tab' && resultData?.tab) {
      const tab = resultData.tab as Record<string, string>;
      tabToOpen = {
        type: tab.type,
        path: tab.path,
        title: tab.title,
        entityId: tab.entityId,
      };
    }

    results.push({
      id: toolCall.id,
      result: parsedResult.data.message,
      toolName,
      stepLabel,
      entityCreated,
      tabToOpen,
    });
  }

  return results;
}

// Filtrer les tools en fonction du mode
function getToolsForMode(mode: ChatMode) {
  if (mode === 'plan') {
    // En mode PLAN, seuls les outils de lecture sont disponibles
    return toolDefinitions.filter((tool) =>
      READ_ONLY_TOOLS.includes(tool.function.name)
    );
  }
  // En mode AUTO et DEMANDER, tous les outils sont disponibles
  // (la gestion de confirmation se fait côté prompt)
  return toolDefinitions;
}

export async function POST(request: Request) {
  const requestStart = Date.now();
  try {
    const body = await request.json();
    const parsedBody = ChatRequestSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: 'Requête invalide' },
        { status: 400 }
      );
    }
    const { message, history, mode = 'auto', contextId = null, confirmedAction, confirmedToolCallId, stream = false } = parsedBody.data;

    ensureWithinBudget(requestStart);

    const parsedContextId = parseContextIdString(contextId);
    if (contextId && !parsedContextId) {
      return NextResponse.json(
        { error: 'ContextId invalide' },
        { status: 400 }
      );
    }

    if (!message) {
      return NextResponse.json({ error: 'Message requis' }, { status: 400 });
    }

    const supabase = await createClient();

    // Récupérer l'utilisateur (utilise DEV_USER_ID en mode développement)
    const userId = await getUserId(supabase);

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        message: mockResponse(message),
      });
    }

    // Utiliser le prompt avec les instructions de mode
    const basePrompt = getSystemPromptWithMode(mode);
    const toolsForMode = getToolsForMode(mode);

    // Enrichir le prompt avec le contexte de l'entité ouverte
    const enrichedPrompt = await enrichPromptWithContext(supabase, basePrompt, contextId);

    console.log(`[Chat API] Context: ${contextId || 'global'}, Mode: ${mode}`);

    // Construire les messages
    const messages: ChatMessage[] = [
      { role: 'system', content: enrichedPrompt },
      ...(history || []).map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: message },
    ];

    // Premier appel avec tool_choice: 'auto'
    console.log(`Calling OpenAI with auto... (mode: ${mode})`);
    const response = await withTimeout(
      callOpenAI(apiKey, messages, 'auto', toolsForMode),
      OPENAI_TIMEOUT_MS,
      'OpenAI'
    );
    ensureWithinBudget(requestStart);

    if (!response.ok) {
      let errorMessage = 'Erreur de communication avec l\'assistant';
      try {
        const error = await response.json();
        console.error('OpenAI error:', error);
        if (error?.error?.message) {
          errorMessage = error.error.message;
        }
        if (response.status === 429) {
          errorMessage = 'Trop de requêtes. Veuillez patienter quelques secondes.';
        } else if (response.status === 401) {
          errorMessage = 'Clé API OpenAI invalide.';
        }
      } catch {
        console.error('OpenAI error: Could not parse response');
      }
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status || 500 }
      );
    }

    const data = await response.json();

    // Validation de la réponse OpenAI
    if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
      console.error('OpenAI returned empty choices:', data);
      return NextResponse.json(
        { error: 'Réponse vide de l\'assistant. Veuillez réessayer.' },
        { status: 500 }
      );
    }

    let choice = data.choices[0];

    console.log('OpenAI response:', JSON.stringify(choice.message, null, 2));

    // Si tool calls → vérifier les permissions avant d'exécuter
    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      console.log('Tool calls detected, checking permissions...');

      // Vérifier les permissions pour chaque tool call
      for (const toolCall of choice.message.tool_calls) {
        const toolName = toolCall.function.name;
        const permission = getToolPermission(toolName, mode);

        console.log(`Tool ${toolName}: permission=${permission}, confirmedAction=${confirmedAction}`);

        // Si confirmation requise et non fournie, bloquer l'exécution
        if (permission === 'confirm' && !confirmedAction) {
          let parsedArgs: Record<string, unknown> = {};
          try {
            parsedArgs = JSON.parse(toolCall.function.arguments);
          } catch {
            // Ignorer les erreurs de parsing pour le message de confirmation
          }

          return NextResponse.json(
            {
              mode,
              tool: toolName,
              toolCallId: toolCall.id,
              args: parsedArgs,
              requiresConfirmation: true,
              message: `L'action "${toolName}" nécessite une confirmation en mode ${mode.toUpperCase()}.`,
            },
            { status: 403 }
          );
        }

        // Si action interdite (mode plan), bloquer
        if (permission === 'forbidden') {
          return NextResponse.json(
            {
              mode,
              tool: toolName,
              forbidden: true,
              message: `L'action "${toolName}" n'est pas autorisée en mode ${mode.toUpperCase()}.`,
            },
            { status: 403 }
          );
        }
      }

      console.log('Permissions OK, executing tools...');
      const toolResults = await executeToolCalls(supabase, userId, choice.message.tool_calls);
      ensureWithinBudget(requestStart);

      // Construire les messages avec le format correct pour les tool results
      const messagesWithToolResults: ChatMessage[] = [
        ...messages,
        {
          role: 'assistant',
          content: choice.message.content,
          tool_calls: choice.message.tool_calls,
        },
        // Ajouter chaque résultat de tool avec son ID
        ...toolResults.map(tr => ({
          role: 'tool' as const,
          content: tr.result,
          tool_call_id: tr.id,
        })),
      ];

      // Extraire les étapes de travail pour le client
      const workingSteps = toolResults.map(tr => tr.stepLabel);

      // Extraire les entités créées pour le refresh côté client
      const entitiesCreated = toolResults
        .filter(tr => tr.entityCreated)
        .map(tr => tr.entityCreated!);

      // Extraire les onglets à ouvrir
      const tabsToOpen = toolResults
        .filter(tr => tr.tabToOpen)
        .map(tr => tr.tabToOpen!);

      // Second appel pour obtenir la réponse finale (avec tools auto pour permettre un second tool call si nécessaire)
      console.log('Getting final response...');
      const followUpResponse = await withTimeout(
        callOpenAI(apiKey, messagesWithToolResults, 'auto', toolsForMode),
        OPENAI_TIMEOUT_MS,
        'OpenAI follow-up'
      );
      ensureWithinBudget(requestStart);

      if (followUpResponse.ok) {
        const followUpData = await followUpResponse.json();
        const followUpChoice = followUpData.choices[0];

        // Si le LLM veut appeler un autre tool, l'exécuter
        if (followUpChoice.message.tool_calls && followUpChoice.message.tool_calls.length > 0) {
          console.log('Follow-up tool calls detected, executing...');
          const followUpToolResults = await executeToolCalls(supabase, userId, followUpChoice.message.tool_calls);
          ensureWithinBudget(requestStart);

          // Ajouter aux étapes, entités et onglets
          workingSteps.push(...followUpToolResults.map(tr => tr.stepLabel));
          const newEntities = followUpToolResults.filter(tr => tr.entityCreated).map(tr => tr.entityCreated!);
          entitiesCreated.push(...newEntities);
          const newTabs = followUpToolResults.filter(tr => tr.tabToOpen).map(tr => tr.tabToOpen!);
          tabsToOpen.push(...newTabs);

          // Construire les messages avec les nouveaux résultats
          const messagesWithAllToolResults: ChatMessage[] = [
            ...messagesWithToolResults,
            {
              role: 'assistant',
              content: followUpChoice.message.content,
              tool_calls: followUpChoice.message.tool_calls,
            },
            ...followUpToolResults.map(tr => ({
              role: 'tool' as const,
              content: tr.result,
              tool_call_id: tr.id,
            })),
          ];

          // Dernier appel pour la réponse finale - avec streaming si demandé
          if (stream) {
            console.log('Streaming final response after follow-up...');
            const streamResponse = await callOpenAIStream(apiKey, messagesWithAllToolResults);
            if (streamResponse.ok) {
              return createStreamResponse(streamResponse, { workingSteps, entitiesCreated, tabsToOpen });
            }
          }

          const finalResponse = await withTimeout(
            callOpenAI(apiKey, messagesWithAllToolResults, 'none'),
            OPENAI_TIMEOUT_MS,
            'OpenAI final'
          );
          ensureWithinBudget(requestStart);
          if (finalResponse.ok) {
            const finalData = await finalResponse.json();
            const finalContent = finalData.choices[0]?.message?.content;
            console.log('Final response after follow-up:', finalContent);

            return NextResponse.json({
              message: finalContent || followUpToolResults.map(tr => tr.result).join('\n\n'),
              workingSteps,
              entitiesCreated,
              tabsToOpen,
            });
          }
        }

        const finalContent = followUpChoice.message.content;
        console.log('Final response:', finalContent);

        // Si la réponse finale suggère que le LLM allait faire quelque chose mais n'a pas appelé de tool
        if (finalContent && shouldRetryWithTools(finalContent)) {
          console.log('Final response suggests pending action, retrying with required...');
          const retryResponse = await callOpenAI(apiKey, messagesWithToolResults, 'required', toolsForMode);

          if (retryResponse.ok) {
            const retryData = await retryResponse.json();
            const retryChoice = retryData.choices?.[0];

            if (retryChoice?.message?.tool_calls?.length > 0) {
              console.log('Retry after follow-up: Tool calls detected, executing...');
              const retryToolResults = await executeToolCalls(supabase, userId, retryChoice.message.tool_calls);
              workingSteps.push(...retryToolResults.map(tr => tr.stepLabel));
              const retryEntities = retryToolResults.filter(tr => tr.entityCreated).map(tr => tr.entityCreated!);
              entitiesCreated.push(...retryEntities);
              const retryTabs = retryToolResults.filter(tr => tr.tabToOpen).map(tr => tr.tabToOpen!);
              tabsToOpen.push(...retryTabs);

              const messagesWithRetryResults: ChatMessage[] = [
                ...messagesWithToolResults,
                {
                  role: 'assistant',
                  content: retryChoice.message.content,
                  tool_calls: retryChoice.message.tool_calls,
                },
                ...retryToolResults.map(tr => ({
                  role: 'tool' as const,
                  content: tr.result,
                  tool_call_id: tr.id,
                })),
              ];

              // Avec streaming si demandé
              if (stream) {
                console.log('Streaming final response after retry...');
                const streamResponse = await callOpenAIStream(apiKey, messagesWithRetryResults);
                if (streamResponse.ok) {
                  return createStreamResponse(streamResponse, { workingSteps, entitiesCreated, tabsToOpen });
                }
              }

              const finalRetryResponse = await withTimeout(
                callOpenAI(apiKey, messagesWithRetryResults, 'none'),
                OPENAI_TIMEOUT_MS,
                'OpenAI final retry'
              );
              ensureWithinBudget(requestStart);
              if (finalRetryResponse.ok) {
                const finalRetryData = await finalRetryResponse.json();
                const finalRetryContent = finalRetryData.choices?.[0]?.message?.content;

                return NextResponse.json({
                  message: finalRetryContent || retryToolResults.map(tr => tr.result).join('\n\n'),
                  workingSteps,
                  entitiesCreated,
                  tabsToOpen,
                });
              }
            }
          }
        }

        return NextResponse.json({
          message: finalContent || toolResults.map(tr => tr.result).join('\n\n'),
          workingSteps,
          entitiesCreated,
          tabsToOpen,
        });
      }

      // Fallback: retourner les résultats bruts
      return NextResponse.json({
        message: toolResults.map(tr => tr.result).join('\n\n'),
        workingSteps,
        entitiesCreated,
        tabsToOpen,
      });
    }

    // Si pas de tool call mais réponse suggère échec → retry avec 'required' (UNE seule fois)
    const responseContent = choice.message.content || '';
    if (shouldRetryWithTools(responseContent) && toolsForMode.length > 0) {
      console.log('Retry with required tool_choice - response suggested failure:', responseContent.substring(0, 100));

      try {
        const retryResponse = await withTimeout(
          callOpenAI(apiKey, messages, 'required', toolsForMode),
          OPENAI_TIMEOUT_MS,
          'OpenAI retry'
        );
        ensureWithinBudget(requestStart);

        if (retryResponse.ok) {
          const retryData = await retryResponse.json();

          // Validation du retry
          if (!retryData.choices?.length) {
            console.log('Retry returned empty choices, using original response');
          } else {
            const retryChoice = retryData.choices[0];

            if (retryChoice.message.tool_calls && retryChoice.message.tool_calls.length > 0) {
              console.log('Retry: Tool calls detected, executing...');
              const toolResults = await executeToolCalls(supabase, userId, retryChoice.message.tool_calls);
              ensureWithinBudget(requestStart);
              const workingSteps = toolResults.map(tr => tr.stepLabel);
              const entitiesCreated = toolResults
                .filter(tr => tr.entityCreated)
                .map(tr => tr.entityCreated!);
              const tabsToOpen = toolResults
                .filter(tr => tr.tabToOpen)
                .map(tr => tr.tabToOpen!);

              const messagesWithToolResults: ChatMessage[] = [
                ...messages,
                {
                  role: 'assistant',
                  content: retryChoice.message.content,
                  tool_calls: retryChoice.message.tool_calls,
                },
                ...toolResults.map(tr => ({
                  role: 'tool' as const,
                  content: tr.result,
                  tool_call_id: tr.id,
                })),
              ];

              // Avec streaming si demandé
              if (stream) {
                console.log('Streaming final response after initial retry...');
                const streamResponse = await callOpenAIStream(apiKey, messagesWithToolResults);
                if (streamResponse.ok) {
                  return createStreamResponse(streamResponse, { workingSteps, entitiesCreated, tabsToOpen });
                }
              }

              const followUpResponse = await withTimeout(
                callOpenAI(apiKey, messagesWithToolResults, 'none'),
                OPENAI_TIMEOUT_MS,
                'OpenAI retry follow-up'
              );
              ensureWithinBudget(requestStart);

              if (followUpResponse.ok) {
                const followUpData = await followUpResponse.json();
                const finalContent = followUpData.choices?.[0]?.message?.content;

                return NextResponse.json({
                  message: finalContent || toolResults.map(tr => tr.result).join('\n\n'),
                  workingSteps,
                  entitiesCreated,
                  tabsToOpen,
                });
              }

              return NextResponse.json({
                message: toolResults.map(tr => tr.result).join('\n\n'),
                workingSteps,
                entitiesCreated,
                tabsToOpen,
              });
            }
          }
        }
      } catch (retryError) {
        console.error('Retry failed:', retryError);
        // Continue avec la réponse originale
      }
    }

    // Réponse directe sans tool calls - avec streaming si demandé
    if (stream) {
      console.log('Streaming direct response...');
      const streamResponse = await callOpenAIStream(apiKey, messages);
      if (streamResponse.ok) {
        return createStreamResponse(streamResponse);
      }
    }

    return NextResponse.json({
      message: choice.message.content || 'Je suis prêt à vous aider. Que souhaitez-vous faire ?',
    });
  } catch (error) {
    console.error('Chat API error:', error);

    // Messages d'erreur spécifiques selon le type
    let errorMessage = 'Une erreur est survenue. Veuillez réessayer.';
    let status = 500;

    if (error instanceof Error) {
      if (error.message.includes('TIMEOUT')) {
        errorMessage = 'L\'assistant met trop de temps à répondre. Veuillez réessayer.';
        status = 504;
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = 'Problème de connexion. Vérifiez votre réseau et réessayez.';
        status = 503;
      }
    }

    return NextResponse.json(
      { error: errorMessage },
      { status }
    );
  }
}

// Réponses mock pour le développement sans clé API
function mockResponse(message: string): string {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('client')) {
    return 'Pour créer un client, j\'ai besoin de son nom et de savoir s\'il s\'agit d\'un particulier ou d\'une entreprise. Quel est le nom du client ?';
  }

  if (lowerMessage.includes('devis')) {
    return 'Pour créer un devis, j\'ai besoin de connaître le client et les prestations à facturer. Pour quel client souhaitez-vous créer ce devis ?';
  }

  if (lowerMessage.includes('facture')) {
    return 'Pour créer une facture, j\'ai besoin de connaître le client et les prestations. Souhaitez-vous créer une facture à partir d\'un devis existant ou une nouvelle facture ?';
  }

  if (lowerMessage.includes('envoyer') || lowerMessage.includes('email')) {
    return 'Pour envoyer un document par email, précisez le numéro du devis ou de la facture. Je vous demanderai confirmation avant l\'envoi.';
  }

  if (lowerMessage.includes('payé') || lowerMessage.includes('payer')) {
    return 'Quelle facture souhaitez-vous marquer comme payée ? Donnez-moi le numéro de facture.';
  }

  if (lowerMessage.includes('convertir')) {
    return 'Quel devis souhaitez-vous convertir en facture ? Donnez-moi le numéro du devis.';
  }

  if (lowerMessage.includes('liste') || lowerMessage.includes('lister') || lowerMessage.includes('voir')) {
    return 'Que souhaitez-vous voir ? Je peux vous montrer la liste des clients, des devis, ou des factures.';
  }

  return 'Je suis Verifolio, votre assistant facturation. Je peux vous aider à :\n• Créer et gérer des clients\n• Créer des devis\n• Créer des factures\n• Convertir des devis en factures\n• Envoyer des documents par email\n• Marquer des factures comme payées\n• Consulter vos statistiques financières\n\nQue souhaitez-vous faire ?';
}
