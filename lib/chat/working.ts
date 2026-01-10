// ============================================================================
// Working Mode Types
// ============================================================================

export type WorkingStepStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface WorkingStep {
  id: string;
  label: string;
  status: WorkingStepStatus;
}

export interface WorkingState {
  isActive: boolean;
  isCollapsed: boolean;
  steps: WorkingStep[];
  contextId: string | null; // Pour détecter les changements de contexte
}

// ============================================================================
// Initial State
// ============================================================================

export const initialWorkingState: WorkingState = {
  isActive: false,
  isCollapsed: true,
  steps: [],
  contextId: null,
};

// ============================================================================
// Helper Functions
// ============================================================================

export function createWorkingStep(label: string): WorkingStep {
  return {
    id: `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    label,
    status: 'pending',
  };
}

export function getInProgressStep(steps: WorkingStep[]): WorkingStep | undefined {
  return steps.find((step) => step.status === 'in_progress');
}

export function getPendingSteps(steps: WorkingStep[]): WorkingStep[] {
  return steps.filter((step) => step.status === 'pending');
}

export function getCompletedSteps(steps: WorkingStep[]): WorkingStep[] {
  return steps.filter((step) => step.status === 'completed');
}

export function areAllStepsCompleted(steps: WorkingStep[]): boolean {
  return steps.length > 0 && steps.every((step) => step.status === 'completed');
}

export function hasActiveStep(steps: WorkingStep[]): boolean {
  return steps.some((step) => step.status === 'in_progress');
}

// ============================================================================
// Step Label Generation (from tool names to user-friendly labels)
// ============================================================================

const TOOL_LABELS: Record<string, string> = {
  // Lecture
  list_clients: 'Charger les clients',
  get_client: 'Charger le client',
  list_contacts: 'Charger les contacts',
  get_contact: 'Charger le contact',
  list_quotes: 'Charger les devis',
  get_quote: 'Charger le devis',
  list_invoices: 'Charger les factures',
  get_invoice: 'Charger la facture',
  list_proposals: 'Charger les propositions',
  get_proposal: 'Charger la proposition',
  list_missions: 'Charger les missions',
  get_mission: 'Charger la mission',
  get_financial_summary: 'Charger le résumé financier',
  get_company_settings: 'Charger les paramètres',

  // Création
  create_client: 'Créer le client',
  create_contact: 'Créer le contact',
  create_quote: 'Créer le devis',
  create_invoice: 'Créer la facture',
  create_proposal: 'Créer la proposition',
  create_mission: 'Créer la mission',
  create_todo: 'Créer le rappel',

  // Modification
  update_client: 'Mettre à jour le client',
  update_contact: 'Mettre à jour le contact',
  update_quote: 'Mettre à jour le devis',
  update_invoice: 'Mettre à jour la facture',
  update_proposal: 'Mettre à jour la proposition',
  update_mission: 'Mettre à jour la mission',

  // Actions
  send_email: 'Envoyer l\'email',
  send_proposal: 'Envoyer la proposition',
  send_quote: 'Envoyer le devis',
  send_invoice: 'Envoyer la facture',
  mark_invoice_paid: 'Marquer comme payée',
  convert_quote_to_invoice: 'Convertir en facture',
  set_proposal_status: 'Changer le statut',

  // Reviews
  create_review_template: 'Créer le template d\'avis',
  send_review_request: 'Envoyer la demande d\'avis',
};

export function getStepLabelFromTool(toolName: string, args?: Record<string, unknown>): string {
  // Label de base
  let label = TOOL_LABELS[toolName] || toolName.replace(/_/g, ' ');

  // Enrichir avec les arguments si disponibles
  if (args) {
    if (args.client_name) {
      label = label.replace('le client', `${args.client_name}`);
      label = label.replace('les clients', `${args.client_name}`);
    }
    if (args.amount) {
      label += ` de ${args.amount} €`;
    }
    if (args.name) {
      label += ` "${args.name}"`;
    }
  }

  return label;
}

// ============================================================================
// Parse Steps from AI Response
// ============================================================================

export interface ParsedWorkingPlan {
  steps: string[];
  summary?: string;
}

export function parseWorkingPlanFromResponse(response: string): ParsedWorkingPlan | null {
  // Chercher un pattern de plan dans la réponse
  // Format attendu: lignes commençant par - ou • ou numéros
  const lines = response.split('\n');
  const steps: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Matcher: "- action", "• action", "1. action", "1) action"
    const match = trimmed.match(/^[-•]\s+(.+)$|^(\d+)[.)]\s+(.+)$/);
    if (match) {
      const stepText = match[1] || match[3];
      if (stepText && stepText.length < 100) {
        steps.push(stepText);
      }
    }
  }

  if (steps.length === 0) {
    return null;
  }

  return { steps };
}
