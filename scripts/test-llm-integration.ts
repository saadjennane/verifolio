#!/usr/bin/env npx tsx
/**
 * Tests d'intégration LLM - Vérifie que le LLM appelle les bons tools
 *
 * Usage:
 *   npx tsx scripts/test-llm-integration.ts              # Tous les tests
 *   npx tsx scripts/test-llm-integration.ts --section=9.1  # Section spécifique
 *   npx tsx scripts/test-llm-integration.ts --section=ambiguity  # Tests d'ambiguïté
 *
 * Nécessite:
 * - OPENAI_API_KEY dans .env.local
 */

import OpenAI from 'openai';
import { toolDefinitions } from '../lib/llm/tools';
import { getSystemPromptWithMode } from '../lib/llm/prompt';

// Configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = 'gpt-4o-mini';

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY manquant dans .env.local');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Cas de test avec alternatives et skip
type TestCase = {
  section: string;
  name: string;
  prompt: string;
  expectedTool: string;
  alternativeTools?: string[]; // Accepter ces tools comme "lecture d'abord"
  expectedArgs?: Record<string, unknown>;
  skip?: boolean; // Tool n'existe pas encore
  skipReason?: string;
};

const testCases: TestCase[] = [
  // ============================================================================
  // SECTION 9.1 - CLIENTS
  // ============================================================================
  {
    section: '9.1',
    name: 'Créer client simple',
    prompt: 'Crée un client Jean Dupont',
    expectedTool: 'create_client',
    expectedArgs: { nom: 'Jean Dupont' },
  },
  {
    section: '9.1',
    name: 'Créer client entreprise avec SIRET',
    prompt: 'Crée un client entreprise ACME avec SIRET 12345678901234',
    expectedTool: 'create_client',
    expectedArgs: { type: 'entreprise' },
  },
  {
    section: '9.1',
    name: 'Modifier email client',
    prompt: "Modifie l'email du client ACME à contact@acme.com",
    expectedTool: 'update_client',
    alternativeTools: ['list_clients'], // Peut chercher le client d'abord
    expectedArgs: { email: 'contact@acme.com' },
  },
  {
    section: '9.1',
    name: 'Lister clients',
    prompt: 'Liste mes clients',
    expectedTool: 'list_clients',
  },
  // SKIP: delete_client n'existe pas
  // {
  //   section: '9.1',
  //   name: 'Supprimer client',
  //   prompt: 'Supprime le client Test',
  //   expectedTool: 'delete_client',
  //   skip: true,
  //   skipReason: 'Tool delete_client non implémenté',
  // },

  // ============================================================================
  // SECTION 9.2 - CONTACTS
  // ============================================================================
  {
    section: '9.2',
    name: 'Créer contact',
    prompt: 'Ajoute un contact Marie Martin pour le client ACME',
    expectedTool: 'create_contact',
    alternativeTools: ['list_clients'], // Chercher le client d'abord
  },
  {
    section: '9.2',
    name: 'Contact principal',
    prompt: "Définis Pierre comme contact principal d'ACME",
    expectedTool: 'update_client_contact',
    alternativeTools: ['list_contacts', 'list_clients', 'get_contact_for_context', 'update_contact'],
  },
  {
    section: '9.2',
    name: 'Lister contacts',
    prompt: 'Liste les contacts du client ACME',
    expectedTool: 'list_contacts',
    alternativeTools: ['list_clients'],
  },

  // ============================================================================
  // SECTION 9.3 - DEALS
  // ============================================================================
  {
    section: '9.3',
    name: 'Créer deal',
    prompt: 'Crée un deal de 5000€ pour le client ACME',
    expectedTool: 'create_deal',
    alternativeTools: ['list_clients'],
  },
  {
    section: '9.3',
    name: 'Marquer deal gagné',
    prompt: 'Marque le deal Refonte Site comme gagné',
    expectedTool: 'update_deal_status',
    alternativeTools: ['list_deals'],
    expectedArgs: { status: 'won' },
  },
  {
    section: '9.3',
    name: 'Marquer deal perdu',
    prompt: 'Le deal Projet Mobile est perdu',
    expectedTool: 'update_deal_status',
    alternativeTools: ['list_deals'],
    expectedArgs: { status: 'lost' },
  },
  {
    section: '9.3',
    name: 'Lister deals',
    prompt: 'Liste mes deals en cours',
    expectedTool: 'list_deals',
  },
  // SKIP: add_deal_tag n'existe pas
  // {
  //   section: '9.3',
  //   name: 'Ajouter tag deal',
  //   prompt: 'Ajoute le tag urgent au deal',
  //   expectedTool: 'add_deal_tag',
  //   skip: true,
  //   skipReason: 'Tool add_deal_tag non implémenté',
  // },

  // ============================================================================
  // SECTION 9.4 - DEVIS
  // ============================================================================
  {
    section: '9.4',
    name: 'Créer devis',
    prompt: 'Crée un devis pour le client ACME',
    expectedTool: 'create_quote',
    alternativeTools: ['list_clients', 'list_deals'],
  },
  {
    section: '9.4',
    name: 'Lister devis',
    prompt: 'Liste mes devis',
    expectedTool: 'list_quotes',
  },
  {
    section: '9.4',
    name: 'Envoyer devis',
    prompt: 'Envoie le devis DEV-2025-001 au client',
    expectedTool: 'send_email',
    alternativeTools: ['list_quotes', 'get_quote'],
  },
  {
    section: '9.4',
    name: 'Devis accepté',
    prompt: 'Le devis DEV-2025-001 a été accepté par le client',
    expectedTool: 'update_quote_status',
    alternativeTools: ['list_quotes'],
    expectedArgs: { status: 'accepted' },
  },
  {
    section: '9.4',
    name: 'Devis refusé',
    prompt: 'Le client a refusé le devis DEV-2025-002',
    expectedTool: 'update_quote_status',
    alternativeTools: ['list_quotes'],
    expectedArgs: { status: 'refused' },
  },
  // SKIP: add_quote_line n'existe pas
  // {
  //   section: '9.4',
  //   name: 'Ajouter ligne devis',
  //   expectedTool: 'add_quote_line',
  //   skip: true,
  // },

  // ============================================================================
  // SECTION 9.5 - FACTURES
  // ============================================================================
  {
    section: '9.5',
    name: 'Créer facture',
    prompt: 'Crée une facture de 1000€ pour ACME',
    expectedTool: 'create_invoice',
    alternativeTools: ['list_clients', 'list_missions', 'get_company_settings'], // Lecture devise d'abord
  },
  {
    section: '9.5',
    name: 'Facture payée',
    prompt: 'La facture FAC-2025-001 a été payée',
    expectedTool: 'mark_invoice_paid',
    alternativeTools: ['list_invoices'],
  },
  {
    section: '9.5',
    name: 'Convertir devis en facture',
    prompt: 'Convertis le devis DEV-2025-001 en facture',
    expectedTool: 'convert_quote_to_invoice',
    alternativeTools: ['list_quotes'],
  },
  {
    section: '9.5',
    name: 'Lister factures',
    prompt: 'Liste mes factures',
    expectedTool: 'list_invoices',
  },
  // SKIP: send_invoice_reminder n'existe pas

  // ============================================================================
  // SECTION 9.6 - MISSIONS
  // ============================================================================
  {
    section: '9.6',
    name: 'Créer mission',
    prompt: 'Crée une mission pour le deal Refonte Site',
    expectedTool: 'create_mission',
    alternativeTools: ['list_deals'],
  },
  {
    section: '9.6',
    name: 'Lister missions',
    prompt: 'Liste mes missions',
    expectedTool: 'list_missions',
  },
  {
    section: '9.6',
    name: 'Mission livrée',
    prompt: 'La mission Développement App est livrée',
    expectedTool: 'update_mission_status',
    alternativeTools: ['list_missions'],
    expectedArgs: { status: 'delivered' },
  },

  // ============================================================================
  // SECTION 9.7 - PROPOSITIONS
  // ============================================================================
  {
    section: '9.7',
    name: 'Créer proposition',
    prompt: 'Crée une proposition commerciale pour le client ACME',
    expectedTool: 'create_proposal',
    alternativeTools: ['list_clients', 'list_deals', 'list_proposal_templates'],
  },
  {
    section: '9.7',
    name: 'Envoyer proposition',
    prompt: 'Envoie la proposition au client',
    expectedTool: 'set_proposal_status',
    alternativeTools: ['list_proposals', 'get_client_contacts_for_proposal'], // Lecture contacts d'abord
    expectedArgs: { status: 'sent' },
  },
  {
    section: '9.7',
    name: 'Lister propositions',
    prompt: 'Liste mes propositions',
    expectedTool: 'list_proposals',
  },

  // ============================================================================
  // SECTION 9.8 - BRIEFS
  // ============================================================================
  {
    section: '9.8',
    name: 'Créer brief',
    prompt: 'Crée un brief pour le deal Projet Vidéo',
    expectedTool: 'create_brief',
    alternativeTools: ['list_deals', 'list_brief_templates'],
  },
  {
    section: '9.8',
    name: 'Envoyer brief',
    prompt: 'Envoie le brief au client',
    expectedTool: 'send_brief',
    alternativeTools: ['list_briefs'],
  },
  {
    section: '9.8',
    name: 'Lister briefs',
    prompt: 'Liste mes briefs',
    expectedTool: 'list_briefs',
  },

  // ============================================================================
  // SECTION 9.9 - REVIEWS
  // ============================================================================
  {
    section: '9.9',
    name: 'Demander review',
    prompt: 'Demande un avis client pour la mission Développement Web',
    expectedTool: 'create_review_request',
    alternativeTools: ['list_missions', 'list_invoices'],
  },
  {
    section: '9.9',
    name: 'Lister reviews',
    prompt: 'Liste mes avis clients',
    expectedTool: 'list_reviews',
  },
  {
    section: '9.9',
    name: 'Lister demandes review',
    prompt: "Liste les demandes d'avis en attente",
    expectedTool: 'list_review_requests',
  },

  // ============================================================================
  // SECTION 9.13 - TÂCHES (tous skip - tools non implémentés)
  // ============================================================================
  // {
  //   section: '9.13',
  //   name: 'Créer tâche',
  //   prompt: 'Crée une tâche rappeler ACME demain',
  //   expectedTool: 'create_task',
  //   skip: true,
  //   skipReason: 'Tool create_task non implémenté',
  // },

  // ============================================================================
  // TESTS ANTI-AMBIGUÏTÉ
  // ============================================================================

  // "mail" = email, pas ICE
  {
    section: 'ambiguity',
    name: '"mail" signifie email',
    prompt: 'Modifie le mail du client ACME à contact@acme.com',
    expectedTool: 'update_client',
    alternativeTools: ['list_clients'],
    expectedArgs: { email: 'contact@acme.com' },
  },
  {
    section: 'ambiguity',
    name: '"adresse mail" = email',
    prompt: "Change l'adresse mail du client Jean à jean@example.com",
    expectedTool: 'update_client',
    alternativeTools: ['list_clients'],
    expectedArgs: { email: 'jean@example.com' },
  },

  // Téléphone
  {
    section: 'ambiguity',
    name: '"tel" = téléphone',
    prompt: 'Mets à jour le tel du client ACME à 0612345678',
    expectedTool: 'update_client',
    alternativeTools: ['list_clients'],
    expectedArgs: { telephone: '0612345678' },
  },

  // Client vs Contact
  {
    section: 'ambiguity',
    name: 'modifier contact (pas client)',
    prompt: 'Modifie le téléphone du contact Marie chez ACME',
    expectedTool: 'update_contact',
    alternativeTools: ['list_contacts', 'list_clients'],
  },
  {
    section: 'ambiguity',
    name: 'créer contact (pas client)',
    prompt: 'Ajoute un contact Pierre pour le client ACME',
    expectedTool: 'create_contact',
    alternativeTools: ['list_clients'],
  },

  // Devis vs Facture
  {
    section: 'ambiguity',
    name: '"devis" ≠ "facture"',
    prompt: 'Crée un devis de 1000€ pour ACME',
    expectedTool: 'create_quote',
    alternativeTools: ['list_clients'],
  },
  {
    section: 'ambiguity',
    name: '"facture" ≠ "devis"',
    prompt: 'Crée une facture de 1000€ pour ACME',
    expectedTool: 'create_invoice',
    alternativeTools: ['list_clients', 'list_missions', 'get_company_settings'], // Lecture devise d'abord
  },
  {
    section: 'ambiguity',
    name: '"facturer" = créer facture',
    prompt: 'Facture le client ACME pour 500€',
    expectedTool: 'create_invoice',
    alternativeTools: ['list_clients', 'list_missions'],
  },

  // Proposition vs Devis
  {
    section: 'ambiguity',
    name: '"proposition commerciale" ≠ "devis"',
    prompt: 'Crée une proposition commerciale pour présenter nos services à ACME',
    expectedTool: 'create_proposal',
    alternativeTools: ['list_clients', 'list_deals', 'list_proposal_templates'],
  },
  {
    section: 'ambiguity',
    name: '"propale" = proposition',
    prompt: 'Génère une propale pour le client ACME',
    expectedTool: 'create_proposal',
    alternativeTools: ['list_clients', 'list_deals'],
  },

  // Deal vs Mission
  {
    section: 'ambiguity',
    name: '"affaire" = deal',
    prompt: 'Crée une affaire de 10000€ pour ACME',
    expectedTool: 'create_deal',
    alternativeTools: ['list_clients'],
  },
  {
    section: 'ambiguity',
    name: '"projet" en prospection = deal',
    prompt: 'Ajoute un projet de refonte site web pour le client ACME',
    expectedTool: 'create_deal',
    alternativeTools: ['list_clients'],
  },
  {
    section: 'ambiguity',
    name: '"mission" = mission (pas deal)',
    prompt: 'Crée une mission pour livrer le deal Projet Web',
    expectedTool: 'create_mission',
    alternativeTools: ['list_deals'],
  },

  // Recherche vs Création
  {
    section: 'ambiguity',
    name: '"trouve" = list (pas create)',
    prompt: 'Trouve le client ACME',
    expectedTool: 'list_clients',
  },
  {
    section: 'ambiguity',
    name: '"cherche" = list',
    prompt: 'Cherche les factures impayées',
    expectedTool: 'list_invoices',
    alternativeTools: ['get_financial_summary'], // "impayées" peut déclencher le résumé financier
  },
  {
    section: 'ambiguity',
    name: '"montre" = list',
    prompt: 'Montre-moi les deals en cours',
    expectedTool: 'list_deals',
  },

  // Envoi
  {
    section: 'ambiguity',
    name: '"envoie le devis" = send',
    prompt: 'Envoie le devis DEV-2025-001 au client',
    expectedTool: 'send_email',
    alternativeTools: ['list_quotes', 'get_quote'],
  },
  {
    section: 'ambiguity',
    name: '"envoie la proposition" = set_status sent',
    prompt: 'Envoie la proposition PROP-001',
    expectedTool: 'set_proposal_status',
    alternativeTools: ['list_proposals'],
    expectedArgs: { status: 'sent' },
  },

  // Conversion
  {
    section: 'ambiguity',
    name: '"convertir devis en facture"',
    prompt: 'Convertis le devis DEV-2025-001 en facture',
    expectedTool: 'convert_quote_to_invoice',
    alternativeTools: ['list_quotes'],
  },
];

interface TestResult {
  section: string;
  name: string;
  passed: boolean;
  expectedTool: string;
  actualTool: string | null;
  actualArgs: Record<string, unknown> | null;
  wasAlternative?: boolean;
  error?: string;
  skipped?: boolean;
  skipReason?: string;
}

async function runTest(testCase: TestCase): Promise<TestResult> {
  // Skip si marqué
  if (testCase.skip) {
    return {
      section: testCase.section,
      name: testCase.name,
      passed: false,
      expectedTool: testCase.expectedTool,
      actualTool: null,
      actualArgs: null,
      skipped: true,
      skipReason: testCase.skipReason,
    };
  }

  const prompt = getSystemPromptWithMode('auto');

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: testCase.prompt },
      ],
      tools: toolDefinitions as OpenAI.ChatCompletionTool[],
      tool_choice: 'required',
      max_tokens: 500,
    });

    const toolCalls = response.choices[0]?.message?.tool_calls;

    if (!toolCalls || toolCalls.length === 0) {
      return {
        section: testCase.section,
        name: testCase.name,
        passed: false,
        expectedTool: testCase.expectedTool,
        actualTool: null,
        actualArgs: null,
        error: 'Aucun tool appelé',
      };
    }

    const firstToolCall = toolCalls[0] as { type: string; function: { name: string; arguments: string } };
    const actualTool = firstToolCall.function.name;
    const actualArgs = JSON.parse(firstToolCall.function.arguments || '{}');

    // Vérifier si c'est le tool attendu
    const toolMatches = actualTool === testCase.expectedTool;

    // Vérifier si c'est une alternative valide (lecture d'abord)
    const isValidAlternative =
      testCase.alternativeTools?.includes(actualTool) || false;

    // Vérifier les args partiels si spécifiés ET si tool correct
    let argsMatch = true;
    if (toolMatches && testCase.expectedArgs) {
      for (const [key, value] of Object.entries(testCase.expectedArgs)) {
        if (actualArgs[key] !== value) {
          if (typeof value === 'string' && typeof actualArgs[key] === 'string') {
            if (!actualArgs[key].toLowerCase().includes(value.toLowerCase())) {
              argsMatch = false;
              break;
            }
          } else {
            argsMatch = false;
            break;
          }
        }
      }
    }

    const passed = (toolMatches && argsMatch) || isValidAlternative;

    return {
      section: testCase.section,
      name: testCase.name,
      passed,
      expectedTool: testCase.expectedTool,
      actualTool,
      actualArgs,
      wasAlternative: isValidAlternative && !toolMatches,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    // Rate limit - attendre et réessayer
    if (errorMessage.includes('429') || errorMessage.includes('Rate limit')) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      return runTest(testCase); // Retry
    }
    return {
      section: testCase.section,
      name: testCase.name,
      passed: false,
      expectedTool: testCase.expectedTool,
      actualTool: null,
      actualArgs: null,
      error: errorMessage,
    };
  }
}

function getSections(): string[] {
  const sections = new Set(testCases.map(t => t.section));
  return Array.from(sections).sort();
}

function printSectionReport(results: TestResult[], section: string) {
  const sectionResults = results.filter(r => r.section === section);
  const passed = sectionResults.filter(r => r.passed).length;
  const skipped = sectionResults.filter(r => r.skipped).length;
  const total = sectionResults.length;
  const status = passed === total - skipped ? '✅' : '❌';

  console.log(`\n${status} Section ${section}: ${passed}/${total - skipped} tests passés${skipped > 0 ? ` (${skipped} skipped)` : ''}`);

  sectionResults.forEach(r => {
    if (r.skipped) {
      console.log(`  ⏭ ${r.name} (SKIP: ${r.skipReason})`);
    } else if (r.passed) {
      if (r.wasAlternative) {
        console.log(`  ✓ ${r.name} (via ${r.actualTool})`);
      } else {
        console.log(`  ✓ ${r.name}`);
      }
    } else {
      console.log(`  ✗ ${r.name}`);
      if (r.error) {
        console.log(`      Error: ${r.error}`);
      } else {
        console.log(`      Expected: ${r.expectedTool}`);
        console.log(`      Got: ${r.actualTool}`);
      }
    }
  });
}

async function main() {
  const args = process.argv.slice(2);
  let selectedSection: string | null = null;

  for (const arg of args) {
    if (arg.startsWith('--section=')) {
      selectedSection = arg.replace('--section=', '');
    }
  }

  let testsToRun = testCases.filter(t => !t.skip);
  if (selectedSection) {
    testsToRun = testCases.filter(t => t.section === selectedSection);
    if (testsToRun.length === 0) {
      console.error(`❌ Section "${selectedSection}" non trouvée`);
      console.log(`\nSections disponibles: ${getSections().join(', ')}`);
      process.exit(1);
    }
  }

  console.log('🧪 Tests d\'intégration LLM\n');
  console.log(`📦 Modèle: ${MODEL}`);
  if (selectedSection) {
    console.log(`📂 Section: ${selectedSection}`);
  }
  const activeTests = testsToRun.filter(t => !t.skip).length;
  const skippedTests = testsToRun.filter(t => t.skip).length;
  console.log(`📝 ${activeTests} tests à exécuter${skippedTests > 0 ? ` (${skippedTests} skipped)` : ''}\n`);
  console.log('─'.repeat(60));

  const results: TestResult[] = [];

  for (const testCase of testsToRun) {
    if (testCase.skip) {
      results.push({
        section: testCase.section,
        name: testCase.name,
        passed: false,
        expectedTool: testCase.expectedTool,
        actualTool: null,
        actualArgs: null,
        skipped: true,
        skipReason: testCase.skipReason,
      });
      process.stdout.write(`  [${testCase.section}] ${testCase.name}... ⏭ SKIP\n`);
      continue;
    }

    process.stdout.write(`  [${testCase.section}] ${testCase.name}... `);

    const result = await runTest(testCase);
    results.push(result);

    if (result.passed) {
      if (result.wasAlternative) {
        console.log(`✅ (${result.actualTool})`);
      } else {
        console.log('✅');
      }
    } else {
      console.log('❌');
    }

    // Pause pour éviter rate limiting
    await new Promise(resolve => setTimeout(resolve, 400));
  }

  console.log('\n' + '═'.repeat(60));
  console.log('RAPPORT PAR SECTION');
  console.log('═'.repeat(60));

  const sections = [...new Set(results.map(r => r.section))].sort();
  for (const section of sections) {
    printSectionReport(results, section);
  }

  console.log('\n' + '═'.repeat(60));

  const passed = results.filter(r => r.passed).length;
  const skipped = results.filter(r => r.skipped).length;
  const failed = results.filter(r => !r.passed && !r.skipped).length;

  console.log(`\n📊 TOTAL: ${passed}/${results.length - skipped} tests passés${skipped > 0 ? ` (${skipped} skipped)` : ''}`);

  if (failed > 0) {
    console.log(`\n❌ ${failed} tests échoués`);
    process.exit(1);
  } else {
    console.log('\n✅ Tous les tests passent!');
  }
}

main().catch(console.error);
