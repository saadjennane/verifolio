# Spécification Technique — Brique LLM Verifolio

> **Version**: 1.0
> **Date**: 2025-01-20
> **Audience**: Agent Codex (refactoring, tests, stabilisation)

---

## 1. CONTEXTE PRODUIT

### 1.1 Qu'est-ce que Verifolio ?

Verifolio est un **copilote administratif pour freelances** (micro-entrepreneurs français).
Le LLM est le cerveau de l'assistant conversationnel intégré.

### 1.2 Rôle du LLM dans le produit

| Fonction | Description |
|----------|-------------|
| Interprétation d'intentions | Comprendre ce que l'utilisateur veut faire |
| Orchestration des tools | Appeler les bonnes fonctions métier |
| Production de plans | Proposer des étapes avant exécution |
| Guidage utilisateur | Aider sans polluer l'interface |
| Contextualisation | Adapter les réponses à l'entité en cours |

### 1.3 Contraintes UX

- Le chat est **contextuel** (par page/entité)
- Le chat est **propre** (pas de pollution visuelle)
- Le chat est **non-historique global** (chaque contexte a son historique)
- Les réponses sont **en français**, ton **informel** (tutoiement)

---

## 2. RÔLE EXACT DU LLM

### 2.1 Ce que le LLM FAIT

| Action | Détail |
|--------|--------|
| Interpréter les intentions | "Crée un client Acme" → `create_client` |
| Sélectionner le flux métier | Deal → Mission → Facture → Avis |
| Orchestrer les tools | Appeler 1 à N tools en séquence |
| Produire des plans | Mode PLAN : liste d'étapes sans exécution |
| Demander confirmation | Mode DEMANDER : valider avant chaque écriture |
| Exécuter automatiquement | Mode AUTO : actions sûres sans confirmation |
| Enrichir le contexte | Utiliser les données de l'entité courante |

### 2.2 Ce que le LLM NE FAIT PAS

| Interdit | Raison |
|----------|--------|
| Décisions irréversibles sans confirmation | Suppressions, envois d'emails |
| Accès direct à la base de données | Toujours via tools définis |
| Logique métier critique non vérifiée | Calculs financiers, TVA |
| Inventer des données | Ne jamais halluciner des IDs, montants |
| Répondre sans données | Toujours appeler un tool de lecture d'abord |
| Exposer des informations système | Pas de logs, tokens, configs |

### 2.3 Règle d'or

```
LE LLM NE DEVINE JAMAIS.
IL LIT D'ABORD, IL AGIT ENSUITE.
```

---

## 3. MODES D'INTERACTION

### 3.1 Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────┐
│                         MODES                                │
├─────────────┬─────────────────┬─────────────────────────────┤
│    PLAN     │   DEMANDER      │          AUTO               │
│     📋      │      🔒         │           ⚡                 │
├─────────────┼─────────────────┼─────────────────────────────┤
│ Lecture     │ Lecture         │ Lecture                     │
│ seule       │ + confirmation  │ + exécution auto            │
│             │ systématique    │ (sauf critique)             │
└─────────────┴─────────────────┴─────────────────────────────┘
```

### 3.2 Mode PLAN (📋)

**Objectif** : Analyser et proposer un plan sans rien exécuter.

| Aspect | Comportement |
|--------|--------------|
| Tools autorisés | READ_ONLY uniquement |
| Sortie | Liste d'étapes numérotées |
| Confirmation | "Accepter / Modifier / Annuler" |
| Transition | Vers AUTO ou DEMANDER pour exécution |

**Format de sortie attendu** :
```markdown
Voici ce que je propose :
1. Vérifier si le client existe
2. Créer le client "Acme"
3. Ajouter le champ ICE

Confirmer ? (Oui / Non / Modifier)
```

**Règles** :
- Ne jamais appeler de tool d'écriture
- Ne jamais exécuter d'action
- Toujours terminer par une demande de confirmation

### 3.3 Mode DEMANDER (🔒)

**Objectif** : Exécuter avec confirmation explicite à chaque étape.

| Aspect | Comportement |
|--------|--------------|
| Tools autorisés | Tous, avec confirmation |
| Confirmation | Avant CHAQUE tool d'écriture |
| Format | "Je vais [action]. Confirmer ? (Oui/Non)" |

**Règles** :
- Lecture : exécution directe
- Écriture légère : demander confirmation
- Écriture critique : demander confirmation + warning

### 3.4 Mode AUTO (⚡)

**Objectif** : Exécuter rapidement les actions courantes.

| Aspect | Comportement |
|--------|--------------|
| Tools READ_ONLY | Exécution directe |
| Tools SAFE_WRITE | Exécution directe |
| Tools CRITICAL | Demander confirmation |

**Classification des tools** :

```typescript
// Exécution directe en AUTO
SAFE_WRITE_TOOLS = [
  'create_client', 'update_client',
  'create_contact', 'update_contact',
  'create_quote', 'create_invoice',
  'create_deal', 'create_mission',
  'create_proposal', 'create_brief',
  // ... créations et mises à jour
]

// Toujours demander confirmation
CRITICAL_TOOLS = [
  'send_email', 'send_quote', 'send_invoice',
  'send_proposal', 'send_brief', 'send_review_request',
  'mark_invoice_paid', 'update_deal_status',
  'delete_*', // Toute suppression
]
```

### 3.5 Transitions entre modes

```
┌──────────┐     Cycle      ┌──────────────┐
│   PLAN   │ ←────────────→ │   DEMANDER   │
└────┬─────┘                └──────┬───────┘
     │                             │
     │         Cycle               │
     └──────────────┬──────────────┘
                    ↓
              ┌──────────┐
              │   AUTO   │
              └──────────┘
```

**Règle** : L'utilisateur peut changer de mode à tout moment via le bouton mode.

---

## 4. MODE WORKING (OBSERVABILITÉ)

### 4.1 Objectif

Afficher la progression des opérations multi-étapes sans polluer le chat.

### 4.2 Structure

```typescript
interface WorkingState {
  isActive: boolean;        // Mode working actif
  isCollapsed: boolean;     // Bloc replié
  steps: WorkingStep[];     // Liste des étapes
  contextId: string | null; // Contexte associé
}

interface WorkingStep {
  id: string;
  label: string;            // En français
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
}
```

### 4.3 Affichage

```
┌─────────────────────────────────────────┐
│ ▾ En cours (2/4)              [Arrêter] │
├─────────────────────────────────────────┤
│ ✓ Analyse de la demande                 │
│ ✓ Recherche du client                   │
│ ● Mise à jour du client                 │
│ ○ Confirmation                          │
└─────────────────────────────────────────┘
```

### 4.4 Règles d'affichage

| Condition | Comportement |
|-----------|--------------|
| Opération lancée | Afficher bloc, `isActive: true` |
| Étape en cours | `status: 'in_progress'`, icône bleue animée |
| Étape terminée | `status: 'completed'`, icône verte ✓ |
| Toutes terminées | Auto-collapse après 1.5s |
| Arrêt manuel | Marquer restantes comme `cancelled` |
| Changement de contexte | Reset complet |

### 4.5 Détection des étapes préliminaires

**Objectif** : Afficher des étapes AVANT que le LLM réponde (feedback immédiat).

```typescript
function detectPreliminarySteps(message: string): string[] {
  // Modification de client
  if (message.includes('client') && message.includes('mail')) {
    return ['Analyse de la demande', 'Recherche du client', 'Mise à jour du client'];
  }

  // Création de client
  if (message.includes('crée') && message.includes('client')) {
    return ['Analyse de la demande', 'Vérification existant', 'Création du client'];
  }

  // Etc.
}
```

**Règles critiques** :
- Les étapes préliminaires sont **indicatives** (peuvent ne pas correspondre)
- Elles servent de **feedback UX**, pas de vérité
- Elles doivent être **cohérentes** avec l'intention détectée

---

## 5. CONTEXT ID — CONTRAT FONDAMENTAL

### 5.1 Format

```typescript
type ContextId = {
  type: ContextType;  // 'dashboard' | 'deal' | 'client' | ...
  id?: string;        // UUID de l'entité (optionnel pour dashboard)
}

// Sérialisation : "type:id" ou "type" si pas d'id
// Exemples : "client:abc-123", "dashboard", "deal:xyz-789"
```

### 5.2 Types de contexte supportés

```typescript
type ContextType =
  | 'dashboard'
  | 'deal' | 'mission' | 'invoice' | 'quote'
  | 'client' | 'contact'
  | 'proposal' | 'brief' | 'review'
  | 'settings';
```

### 5.3 Durée de vie

| Élément | Durée de vie |
|---------|--------------|
| Contexte | Tant que l'onglet/page est ouvert |
| Messages | Persistés en localStorage |
| Suggestions dismissées | 24h |
| Mode | Persisté par contexte |
| Working state | Session uniquement |

### 5.4 Règles de remplacement

```
┌─────────────────────────────────────────────────────────────┐
│ CHANGEMENT DE PAGE = CHANGEMENT DE CONTEXTE                 │
├─────────────────────────────────────────────────────────────┤
│ 1. Sauvegarder l'état du contexte précédent                 │
│ 2. Charger ou créer le nouveau contexte                     │
│ 3. Restaurer messages, mode, suggestions du nouveau         │
│ 4. Reset complet du working state                           │
└─────────────────────────────────────────────────────────────┘
```

### 5.5 Ce que le LLM DOIT ignorer au changement

| À ignorer | Raison |
|-----------|--------|
| Messages de l'ancien contexte | Pas pertinents |
| Working steps en cours | Contexte différent |
| Suggestions non répondues | Plus pertinentes |
| Entité précédente | Nouvelles données |

### 5.6 Ce qui peut persister

| Persistable | Condition |
|-------------|-----------|
| Mode utilisateur | Préférence globale possible |
| Actions validées | Commit en base = persisté |
| Préférences UI | Indépendant du contexte |

### 5.7 Enrichissement de contexte

```
URL: /clients/abc-123
       ↓
Context ID: { type: 'client', id: 'abc-123' }
       ↓
Fetch entity data: SELECT * FROM clients WHERE id = 'abc-123'
       ↓
Format summary: "Client: Acme Corp (entreprise)\nEmail: contact@acme.com\n..."
       ↓
Inject in prompt: systemPrompt + entitySummary + userMessage
```

---

## 6. TOOL CALLING — CONTRATS

### 6.1 Familles de tools

#### READ_ONLY (Lecture seule)

```typescript
const READ_ONLY_TOOLS = [
  'list_clients', 'list_contacts', 'list_quotes', 'list_invoices',
  'list_deals', 'list_missions', 'list_proposals', 'list_briefs',
  'list_reviews', 'list_custom_fields', 'list_templates',
  'get_financial_summary', 'get_company_settings',
  'get_contact_for_context', 'get_client_contacts_for_proposal',
];
```

| Aspect | Valeur |
|--------|--------|
| Confirmation | Jamais |
| Effet de bord | Aucun |
| Idempotent | Oui |

#### SAFE_WRITE (Écriture légère)

```typescript
const SAFE_WRITE_TOOLS = [
  'create_client', 'update_client',
  'create_contact', 'update_contact', 'link_contact_to_client',
  'create_quote', 'create_invoice', 'update_invoice',
  'create_deal', 'create_mission',
  'create_proposal', 'create_brief',
  'create_custom_field', 'update_custom_field_value',
  'add_template_block', 'update_template_block',
];
```

| Aspect | Valeur |
|--------|--------|
| Confirmation en DEMANDER | Oui |
| Confirmation en AUTO | Non |
| Réversible | Oui (soft delete) |

#### CRITICAL (Écriture critique)

```typescript
const CRITICAL_TOOLS = [
  'send_email', 'send_quote', 'send_invoice',
  'send_proposal', 'send_brief', 'send_review_request',
  'mark_invoice_paid', 'convert_quote_to_invoice',
  'update_deal_status', 'update_mission_status',
  'set_proposal_status',
  'delete_custom_field', 'remove_template_block',
];
```

| Aspect | Valeur |
|--------|--------|
| Confirmation | TOUJOURS |
| Effet de bord | Oui (emails, statuts) |
| Réversible | Non ou difficile |

### 6.2 Format d'entrée (Tool Call)

```typescript
interface ToolCall {
  name: ToolName;           // Nom du tool
  arguments: {
    [key: string]: unknown; // Paramètres selon définition
  };
}

// Exemple
{
  name: 'create_client',
  arguments: {
    type: 'entreprise',
    nom: 'Acme Corp',
    email: 'contact@acme.com',
    custom_fields: { ICE: '123456789' }
  }
}
```

### 6.3 Format de sortie (Tool Result)

```typescript
interface ToolResult {
  success: boolean;
  message: string;          // Message lisible en français
  data?: unknown;           // Données structurées
}

// Exemple succès
{
  success: true,
  message: 'Client "Acme Corp" créé avec succès (entreprise).\n(ID: abc-123)',
  data: { id: 'abc-123', nom: 'Acme Corp', type: 'entreprise', ... }
}

// Exemple erreur
{
  success: false,
  message: 'Erreur: Le client existe déjà.'
}
```

### 6.4 Validation stricte

**Règle** : Toute sortie de tool DOIT être un JSON valide conforme à `ToolResult`.

```typescript
// INTERDIT
return "Client créé";  // String brut

// OBLIGATOIRE
return {
  success: true,
  message: 'Client créé',
  data: { ... }
};
```

---

## 7. ERREURS ET EDGE CASES

### 7.1 Problèmes identifiés

| Problème | Fréquence | Impact |
|----------|-----------|--------|
| Hallucinations d'IDs | Moyen | Critique |
| Confusion de contexte | Faible | Moyen |
| Sorties non parsables | Rare | Bloquant |
| Répétitions inutiles | Moyen | UX |
| Suggestions hors sujet | Faible | UX |
| Lenteur (>5s) | Moyen | UX |
| Étapes working incorrectes | Moyen | UX |

### 7.2 Garde-fous recommandés

#### Contre les hallucinations

```typescript
// RÈGLE : Ne jamais utiliser un ID sans l'avoir obtenu d'un tool
// MAUVAIS
await executeToolCall('create_quote', { client_id: 'abc-123' }); // D'où vient cet ID ?

// BON
const clients = await executeToolCall('list_clients', {});
const client = clients.data.find(c => c.nom === 'Acme');
await executeToolCall('create_quote', { client_id: client.id });
```

#### Contre la confusion de contexte

```typescript
// RÈGLE : Toujours vérifier que le contexte est cohérent
if (contextId && contextId.type !== expectedType) {
  return { success: false, message: 'Action non disponible sur cette page.' };
}
```

#### Contre les sorties non parsables

```typescript
// RÈGLE : Wrapper toutes les réponses LLM dans un try/catch JSON
try {
  const parsed = JSON.parse(response);
  if (!isValidToolResult(parsed)) throw new Error('Invalid format');
  return parsed;
} catch {
  return { success: false, message: 'Erreur de communication avec l\'assistant.' };
}
```

#### Contre les répétitions

```typescript
// RÈGLE : Ne pas re-lister si les données sont déjà dans le contexte
if (contextContainsClientData(context)) {
  // Utiliser les données du contexte
} else {
  // Appeler list_clients
}
```

### 7.3 Timeouts et retry

| Opération | Timeout | Retry |
|-----------|---------|-------|
| OpenAI call | 60s | 1 fois |
| Tool execution | 30s | Non |
| Total request | 90s | Non |

---

## 8. STRATÉGIE DE TEST

### 8.1 Types de tests à implémenter

| Type | Objectif | Outil |
|------|----------|-------|
| Unitaire | Valider les fonctions | Vitest |
| Intégration | Valider le flux complet | Vitest + Mocks |
| E2E | Valider l'UX | Playwright |
| Golden path | Scénarios métier | Vitest |
| Regression | Non-régression | CI/CD |

### 8.2 Mocks nécessaires

```typescript
// Mock OpenAI
const mockOpenAI = {
  chat: {
    completions: {
      create: vi.fn().mockResolvedValue({
        choices: [{
          message: {
            content: null,
            tool_calls: [{ function: { name: 'list_clients', arguments: '{}' } }]
          }
        }]
      })
    }
  }
};

// Mock Supabase
const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: {...}, error: null })
};

// Mock Tool Result
const mockToolResult = (success: boolean, data?: unknown) => ({
  success,
  message: success ? 'OK' : 'Erreur',
  data
});
```

### 8.3 Scénarios critiques à tester

#### Création

| # | Scénario | Input | Expected |
|---|----------|-------|----------|
| 1 | Créer client simple | "Crée un client Jean Dupont" | `create_client({type:'particulier', nom:'Jean Dupont'})` |
| 2 | Créer client entreprise + ICE | "Crée Acme avec ICE 123" | `create_client({type:'entreprise', nom:'Acme', custom_fields:{ICE:'123'}})` |
| 3 | Créer client sans nom | "Crée un client" | Erreur : nom requis |
| 4 | Créer devis | "Crée un devis pour Acme" | `list_clients()` → `create_quote({client_id:...})` |

#### Modification

| # | Scénario | Input | Expected |
|---|----------|-------|----------|
| 5 | Modifier email client | "Ajoute mail@acme.com à Acme" | `update_client({client_name:'Acme', email:'mail@acme.com'})` |
| 6 | Modifier client inexistant | "Modifie le client XYZ" | Erreur : client non trouvé |

#### Lecture

| # | Scénario | Input | Expected |
|---|----------|-------|----------|
| 7 | Lister clients | "Liste mes clients" | `list_clients()` |
| 8 | Résumé financier | "Combien me doivent mes clients ?" | `get_financial_summary({query_type:'unpaid'})` |

#### Suppression

| # | Scénario | Input | Expected |
|---|----------|-------|----------|
| 9 | Supprimer client (soft) | "Supprime le client Test" | Confirmation requise + soft delete |

#### Contexte

| # | Scénario | Input | Expected |
|---|----------|-------|----------|
| 10 | Contexte client actif | Sur page client, "Son email ?" | Utilise les données du contexte |
| 11 | Changement de contexte | Navigation vers autre page | Reset working, conserver messages |

#### Modes

| # | Scénario | Input | Expected |
|---|----------|-------|----------|
| 12 | Mode PLAN | "Crée un client" en mode PLAN | Liste d'étapes, pas d'exécution |
| 13 | Mode DEMANDER | "Crée un client" en mode DEMANDER | Demande confirmation avant création |
| 14 | Mode AUTO + action critique | "Envoie la facture" en AUTO | Demande confirmation malgré AUTO |

#### Edge cases

| # | Scénario | Input | Expected |
|---|----------|-------|----------|
| 15 | Timeout OpenAI | Réponse >60s | Message d'erreur propre |
| 16 | Tool échoue | Erreur Supabase | Message d'erreur + pas de crash |

### 8.4 Validation des schémas

```typescript
// Schéma ToolResult
const ToolResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.unknown().optional()
});

// Schéma ContextId
const ContextIdSchema = z.object({
  type: z.enum(['dashboard', 'deal', 'mission', ...]),
  id: z.string().uuid().optional()
});

// Test
test('tool result matches schema', () => {
  const result = executeToolCall(...);
  expect(() => ToolResultSchema.parse(result)).not.toThrow();
});
```

---

## 9. OBJECTIF FINAL

### 9.1 Critères de réussite

| Critère | Seuil | Mesure |
|---------|-------|--------|
| Taux de succès tools | >98% | Logs |
| Temps de réponse P95 | <5s | Monitoring |
| Hallucinations | 0 | Tests |
| Crashes chat | 0 | Sentry |
| Sorties non parsables | 0 | Tests |

### 9.2 Indicateurs de stabilité

```
✅ Tous les tests passent
✅ Aucune régression sur les golden paths
✅ Les modes fonctionnent comme documenté
✅ Le contexte est correctement isolé
✅ Les tools retournent des formats valides
✅ Les erreurs sont gérées proprement
✅ Le working mode reflète les vraies étapes
```

### 9.3 La brique est fiable quand...

1. **Un utilisateur peut** créer/modifier/lister des entités via le chat sans erreur
2. **Le LLM n'hallucine jamais** d'IDs ou de données
3. **Les modes** PLAN/DEMANDER/AUTO fonctionnent comme documenté
4. **Le contexte** est correctement enrichi et isolé
5. **Les actions critiques** demandent TOUJOURS confirmation
6. **Le working mode** reflète fidèlement les étapes en cours
7. **Les erreurs** sont affichées proprement, sans crash

---

## ANNEXES

### A. Fichiers clés

| Fichier | Responsabilité |
|---------|----------------|
| `lib/llm/prompt.ts` | Prompt système (~1800 lignes) |
| `lib/llm/tools.ts` | Définitions tools (~1500 lignes, 60+ tools) |
| `lib/llm/router.ts` | Exécution tools |
| `lib/llm/entity-context.ts` | Enrichissement contexte |
| `lib/chat/modes.ts` | Gestion des modes |
| `lib/chat/context.ts` | Types contexte |
| `lib/chat/working.ts` | État working |
| `lib/stores/context-store.ts` | Store Zustand |
| `app/api/chat/route.ts` | API endpoint |
| `components/chat/ContextualChat.tsx` | Composant principal |

### B. Dépendances externes

| Dépendance | Usage |
|------------|-------|
| OpenAI | Appels LLM (gpt-4o) |
| Supabase | Base de données |
| Zustand | State management |
| Zod | Validation schémas (recommandé) |

### C. Commandes utiles

```bash
# Lancer les tests
npm run test

# Lancer en dev
npm run dev

# Build
npm run build

# Vérifier types
npx tsc --noEmit
```

---

**FIN DE SPÉCIFICATION**
