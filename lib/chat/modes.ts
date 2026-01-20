// ============================================================================
// Chat Mode Types
// ============================================================================

export type ChatMode = 'plan' | 'auto' | 'demander';

export interface ChatModeConfig {
  id: ChatMode;
  label: string;
  labelShort: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
}

// ============================================================================
// Mode Configurations
// ============================================================================

export const CHAT_MODES: Record<ChatMode, ChatModeConfig> = {
  plan: {
    id: 'plan',
    label: 'Mode Plan',
    labelShort: 'Plan',
    description: 'Analyse et propose un plan détaillé sans exécuter d\'actions. Idéal pour préparer une série d\'opérations.',
    icon: '◎',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 hover:bg-blue-100 border-blue-200 dark:bg-blue-950/50 dark:hover:bg-blue-900/50 dark:border-blue-800',
  },
  auto: {
    id: 'auto',
    label: 'Mode Auto',
    labelShort: 'Auto',
    description: 'Exécute automatiquement les actions sûres (brouillons, todos). Demande confirmation pour les envois et suppressions.',
    icon: '▸',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/50 dark:border-emerald-800',
  },
  demander: {
    id: 'demander',
    label: 'Mode Demander',
    labelShort: 'Demander',
    description: 'Demande confirmation avant chaque action d\'écriture. Maximum de contrôle sur les opérations.',
    icon: '◈',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 hover:bg-amber-100 border-amber-200 dark:bg-amber-950/50 dark:hover:bg-amber-900/50 dark:border-amber-800',
  },
};

// ============================================================================
// Mode Cycling
// ============================================================================

const MODE_ORDER: ChatMode[] = ['plan', 'auto', 'demander'];

export function getNextMode(currentMode: ChatMode): ChatMode {
  const currentIndex = MODE_ORDER.indexOf(currentMode);
  const nextIndex = (currentIndex + 1) % MODE_ORDER.length;
  return MODE_ORDER[nextIndex];
}

export function getModeConfig(mode: ChatMode): ChatModeConfig {
  return CHAT_MODES[mode];
}

// ============================================================================
// Tool Classifications
// ============================================================================

// Actions de lecture seules (autorisées en mode PLAN)
export const READ_ONLY_TOOLS = [
  'list_clients',
  'get_client',
  'list_contacts',
  'get_contact',
  'get_contact_for_context',
  'list_quotes',
  'get_quote',
  'list_invoices',
  'get_invoice',
  'list_proposals',
  'get_proposal',
  'get_proposal_public_link',
  'list_briefs',
  'get_brief',
  'list_missions',
  'get_mission',
  'list_templates',
  'get_template',
  'get_template_blocks',
  'get_company_settings',
  'get_financial_summary',
  'list_activities',
  'get_activity',
  'list_review_templates',
  'get_review_template',
];

// Actions sûres (autorisées en mode AUTO sans confirmation)
export const SAFE_WRITE_TOOLS = [
  'create_client',
  'update_client',
  'create_contact',
  'update_contact',
  'link_contact_to_client',
  'create_quote',
  'update_quote',
  'create_invoice',
  'update_invoice',
  'create_proposal',
  'update_proposal',
  'create_brief',
  'update_brief',
  'create_mission',
  'update_mission',
  'create_todo',
  'update_todo',
  'complete_todo',
  'create_template',
  'update_template',
  'add_template_block',
  'update_template_block',
  'create_activity',
  'update_activity',
  'create_review_template',
  'update_review_template',
];

// Actions critiques (toujours demander confirmation)
export const CRITICAL_TOOLS = [
  'send_email',
  'send_proposal',
  'send_quote',
  'send_invoice',
  'send_brief',
  'send_review_request',
  'delete_client',
  'delete_contact',
  'delete_quote',
  'delete_invoice',
  'delete_proposal',
  'delete_brief',
  'delete_mission',
  'delete_template',
  'archive_client',
  'mark_invoice_paid',
  'mark_invoice_cancelled',
  'set_proposal_status',
  'set_quote_status',
  'update_quote_status',
  'update_invoice_status',
  'update_brief_status',
  'convert_quote_to_invoice',
  'close_mission',
];

// ============================================================================
// Mode-Based Tool Permissions
// ============================================================================

export type ToolPermission = 'allowed' | 'confirm' | 'forbidden';

export function getToolPermission(tool: string, mode: ChatMode): ToolPermission {
  // En mode PLAN, seules les lectures sont autorisées
  if (mode === 'plan') {
    return READ_ONLY_TOOLS.includes(tool) ? 'allowed' : 'forbidden';
  }

  // En mode AUTO
  if (mode === 'auto') {
    if (READ_ONLY_TOOLS.includes(tool)) return 'allowed';
    if (SAFE_WRITE_TOOLS.includes(tool)) return 'allowed';
    if (CRITICAL_TOOLS.includes(tool)) return 'confirm';
    return 'confirm'; // Par défaut, demander confirmation pour les outils inconnus
  }

  // En mode DEMANDER
  if (mode === 'demander') {
    if (READ_ONLY_TOOLS.includes(tool)) return 'allowed';
    return 'confirm'; // Tout le reste demande confirmation
  }

  return 'confirm';
}

// ============================================================================
// Mode-Specific Prompt Instructions
// ============================================================================

export function getModePromptInstructions(mode: ChatMode): string {
  switch (mode) {
    case 'plan':
      return `
## MODE ACTUEL: PLAN 📋

Tu es en mode PLAN. Tu dois:
1. ANALYSER la demande de l'utilisateur sans exécuter d'actions
2. PROPOSER un plan détaillé avec les étapes à réaliser
3. N'utiliser que des outils de LECTURE pour collecter le contexte

### Format de réponse en mode PLAN:

**📍 Contexte détecté**
[Liste les éléments pertinents trouvés: client, devis existants, propositions, etc.]

**📋 Plan proposé**
1. [Première action à réaliser]
2. [Deuxième action à réaliser]
3. [etc.]

**⚠️ Points d'attention**
[Risques ou confirmations nécessaires]

**👉 Prêt à exécuter ?**
Passez en mode AUTO ou DEMANDER pour lancer l'exécution.

### Outils autorisés en mode PLAN:
UNIQUEMENT les outils de lecture (list_*, get_*).
Tu ne peux PAS créer, modifier, envoyer ou supprimer quoi que ce soit.
`;

    case 'auto':
      return `
## MODE ACTUEL: AUTO ⚡

Tu es en mode AUTO. EXÉCUTE les actions sûres IMMÉDIATEMENT sans demander.

### RÈGLE FONDAMENTALE EN MODE AUTO:
NE DEMANDE PAS de confirmation pour les actions sûres. EXÉCUTE directement.
Après l'exécution, informe simplement l'utilisateur : "Facture créée : FAC-2025-042"

### Actions sûres (EXÉCUTION IMMÉDIATE - PAS DE CONFIRMATION):
- Créer/modifier des brouillons (devis, factures, propositions)
- Créer/modifier des clients et contacts
- Créer des todos
- Modifier des templates

MAUVAIS EXEMPLE ❌ : "Je vais créer une facture pour X. Confirmer ?"
BON EXEMPLE ✅ : [Appeler create_invoice] → "Facture FAC-2025-042 créée (3 000 €). L'envoyer ?"

### Actions critiques (confirmation requise):
- Envoyer un email ou document (send_*)
- Marquer une facture comme payée (mark_invoice_paid)
- Supprimer un élément (delete_*)
- Conversions définitives (convert_quote_to_invoice)

Pour ces actions UNIQUEMENT, demande:
**🔔 Action nécessitant confirmation**
[Description de l'action]
Confirmer ? (Oui / Modifier / Non)
`;

    case 'demander':
      return `
## MODE ACTUEL: DEMANDER 🔒

Tu es en mode DEMANDER. Tu dois:
1. LIRE et analyser la demande
2. DEMANDER CONFIRMATION avant CHAQUE action d'écriture
3. Attendre la validation explicite de l'utilisateur

### Format pour chaque action:

**🔔 Action proposée**
[Description précise de ce qui va être fait]

Données:
- Champ 1: valeur
- Champ 2: valeur
- ...

**Confirmer ?**
- ✅ Oui - Exécuter
- ✏️ Modifier - Ajuster les données
- ❌ Non - Annuler

### Règles:
- UNE action à la fois
- Attendre la réponse avant de proposer la suivante
- Les lectures (list_*, get_*) ne nécessitent pas de confirmation
`;

    default:
      return '';
  }
}
