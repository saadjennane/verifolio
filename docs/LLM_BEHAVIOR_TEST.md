# Test du Comportement LLM Verifolio

> Document de test pour valider le comportement du LLM

---

## 1. ROLE DU LLM

### Ce que le LLM FAIT

- Interpréter les intentions : "Crée un client Acme" -> `create_client`
- Sélectionner le flux métier : Deal -> Mission -> Facture -> Avis
- Orchestrer les tools : Appeler 1 à N tools en séquence
- Produire des plans : Mode PLAN = liste d'étapes sans exécution
- Demander confirmation : Mode DEMANDER = valider avant chaque écriture
- Exécuter automatiquement : Mode AUTO = actions sûres sans confirmation
- Enrichir le contexte : Utiliser les données de l'entité courante

### Ce que le LLM NE FAIT PAS

- Décisions irréversibles sans confirmation (suppressions, envois d'emails)
- Accès direct à la base de données (toujours via tools définis)
- Logique métier critique non vérifiée (calculs financiers, TVA)
- Inventer des données (ne jamais halluciner des IDs, montants)
- Répondre sans données (toujours appeler un tool de lecture d'abord)
- Exposer des informations système (pas de logs, tokens, configs)

### Règle d'or

```
LE LLM NE DEVINE JAMAIS.
IL LIT D'ABORD, IL AGIT ENSUITE.
```

---

## 2. MODES D'INTERACTION

### Vue d'ensemble

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

### Mode PLAN (📋)

**Objectif** : Analyser et proposer un plan sans rien exécuter.

- Tools autorisés : READ_ONLY uniquement
- Sortie : Liste d'étapes numérotées
- Confirmation : "Accepter / Modifier / Annuler"
- Transition : Vers AUTO ou DEMANDER pour exécution

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

### Mode DEMANDER (🔒)

**Objectif** : Exécuter avec confirmation explicite à chaque étape.

- Tools autorisés : Tous, avec confirmation
- Confirmation : Avant CHAQUE tool d'écriture
- Format : "Je vais [action]. Confirmer ? (Oui/Non)"

**Règles** :
- Lecture : exécution directe
- Écriture légère : demander confirmation
- Écriture critique : demander confirmation + warning

### Mode AUTO (⚡)

**Objectif** : Exécuter rapidement les actions courantes.

- Tools READ_ONLY : Exécution directe
- Tools SAFE_WRITE : Exécution directe
- Tools CRITICAL : Demander confirmation

**Classification des tools** :

```typescript
// Exécution directe en AUTO
SAFE_WRITE_TOOLS = [
  'create_client', 'update_client',
  'create_contact', 'update_contact',
  'create_quote', 'create_invoice',
  'create_deal', 'create_mission',
  'create_proposal', 'create_brief',
]

// Toujours demander confirmation
CRITICAL_TOOLS = [
  'send_email', 'send_quote', 'send_invoice',
  'send_proposal', 'send_brief', 'send_review_request',
  'mark_invoice_paid', 'update_deal_status',
  'delete_*', // Toute suppression
]
```

---

## 3. MODE WORKING (OBSERVABILITE)

### Structure

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

### Affichage

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

### Règles d'affichage

| Condition | Comportement |
|-----------|--------------|
| Opération lancée | Afficher bloc, `isActive: true` |
| Étape en cours | `status: 'in_progress'`, icône bleue animée |
| Étape terminée | `status: 'completed'`, icône verte ✓ |
| Toutes terminées | Auto-collapse après 1.5s |
| Arrêt manuel | Marquer restantes comme `cancelled` |
| Changement de contexte | Reset complet |

---

## 4. CONTEXT ID

### Format

```typescript
type ContextId = {
  type: ContextType;  // 'dashboard' | 'deal' | 'client' | ...
  id?: string;        // UUID de l'entité (optionnel pour dashboard)
}

// Sérialisation : "type:id" ou "type" si pas d'id
// Exemples : "client:abc-123", "dashboard", "deal:xyz-789"
```

### Types de contexte supportés

```typescript
type ContextType =
  | 'dashboard'
  | 'deal' | 'mission' | 'invoice' | 'quote'
  | 'client' | 'contact'
  | 'proposal' | 'brief' | 'review'
  | 'settings';
```

### Durée de vie

| Élément | Durée de vie |
|---------|--------------|
| Contexte | Tant que l'onglet/page est ouvert |
| Messages | Persistés en localStorage |
| Suggestions dismissées | 24h |
| Mode | Persisté par contexte |
| Working state | Session uniquement |

### Règles de remplacement

```
CHANGEMENT DE PAGE = CHANGEMENT DE CONTEXTE
1. Sauvegarder l'état du contexte précédent
2. Charger ou créer le nouveau contexte
3. Restaurer messages, mode, suggestions du nouveau
4. Reset complet du working state
```

### Enrichissement de contexte

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

## 5. TOOL CALLING

### Familles de tools

#### READ_ONLY (Lecture seule)

```typescript
const READ_ONLY_TOOLS = [
  'list_clients', 'list_contacts', 'list_quotes', 'list_invoices',
  'list_deals', 'list_missions', 'list_proposals', 'list_briefs',
  'list_reviews', 'list_custom_fields', 'list_templates',
  'get_financial_summary', 'get_company_settings',
];
```

- Confirmation : Jamais
- Effet de bord : Aucun
- Idempotent : Oui

#### SAFE_WRITE (Écriture légère)

```typescript
const SAFE_WRITE_TOOLS = [
  'create_client', 'update_client',
  'create_contact', 'update_contact', 'link_contact_to_client',
  'create_quote', 'create_invoice', 'update_invoice',
  'create_deal', 'create_mission',
  'create_proposal', 'create_brief',
  'create_custom_field', 'update_custom_field_value',
];
```

- Confirmation en DEMANDER : Oui
- Confirmation en AUTO : Non
- Réversible : Oui (soft delete)

#### CRITICAL (Écriture critique)

```typescript
const CRITICAL_TOOLS = [
  'send_email', 'send_quote', 'send_invoice',
  'send_proposal', 'send_brief', 'send_review_request',
  'mark_invoice_paid', 'convert_quote_to_invoice',
  'update_deal_status', 'update_mission_status',
  'delete_custom_field',
];
```

- Confirmation : TOUJOURS
- Effet de bord : Oui (emails, statuts)
- Réversible : Non ou difficile

### Format d'entrée (Tool Call)

```typescript
interface ToolCall {
  name: ToolName;
  arguments: {
    [key: string]: unknown;
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

### Format de sortie (Tool Result)

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
  data: { id: 'abc-123', nom: 'Acme Corp', type: 'entreprise' }
}

// Exemple erreur
{
  success: false,
  message: 'Erreur: Le client existe déjà.'
}
```

---

## 6. ERREURS ET EDGE CASES

### Problèmes identifiés

| Problème | Fréquence | Impact |
|----------|-----------|--------|
| Hallucinations d'IDs | Moyen | Critique |
| Confusion de contexte | Faible | Moyen |
| Sorties non parsables | Rare | Bloquant |
| Répétitions inutiles | Moyen | UX |
| Suggestions hors sujet | Faible | UX |
| Lenteur (>5s) | Moyen | UX |
| Étapes working incorrectes | Moyen | UX |

### Garde-fous

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

### Timeouts et retry

| Opération | Timeout | Retry |
|-----------|---------|-------|
| OpenAI call | 60s | 1 fois |
| Tool execution | 30s | Non |
| Total request | 90s | Non |

---

## 7. SCENARIOS DE TEST

### Création

| # | Scénario | Input | Expected |
|---|----------|-------|----------|
| 1 | Créer client simple | "Crée un client Jean Dupont" | `create_client({type:'particulier', nom:'Jean Dupont'})` |
| 2 | Créer client entreprise + ICE | "Crée Acme avec ICE 123" | `create_client({type:'entreprise', nom:'Acme', custom_fields:{ICE:'123'}})` |
| 3 | Créer client sans nom | "Crée un client" | Erreur : nom requis |
| 4 | Créer devis | "Crée un devis pour Acme" | `list_clients()` -> `create_quote({client_id:...})` |

### Modification

| # | Scénario | Input | Expected |
|---|----------|-------|----------|
| 5 | Modifier email client | "Ajoute mail@acme.com à Acme" | `update_client({client_name:'Acme', email:'mail@acme.com'})` |
| 6 | Modifier client inexistant | "Modifie le client XYZ" | Erreur : client non trouvé |

### Lecture

| # | Scénario | Input | Expected |
|---|----------|-------|----------|
| 7 | Lister clients | "Liste mes clients" | `list_clients()` |
| 8 | Résumé financier | "Combien me doivent mes clients ?" | `get_financial_summary({query_type:'unpaid'})` |

### Suppression

| # | Scénario | Input | Expected |
|---|----------|-------|----------|
| 9 | Supprimer client (soft) | "Supprime le client Test" | Confirmation requise + soft delete |

### Contexte

| # | Scénario | Input | Expected |
|---|----------|-------|----------|
| 10 | Contexte client actif | Sur page client, "Son email ?" | Utilise les données du contexte |
| 11 | Changement de contexte | Navigation vers autre page | Reset working, conserver messages |

### Modes

| # | Scénario | Input | Expected |
|---|----------|-------|----------|
| 12 | Mode PLAN | "Crée un client" en mode PLAN | Liste d'étapes, pas d'exécution |
| 13 | Mode DEMANDER | "Crée un client" en mode DEMANDER | Demande confirmation avant création |
| 14 | Mode AUTO + action critique | "Envoie la facture" en AUTO | Demande confirmation malgré AUTO |

### Edge cases

| # | Scénario | Input | Expected |
|---|----------|-------|----------|
| 15 | Timeout OpenAI | Réponse >60s | Message d'erreur propre |
| 16 | Tool échoue | Erreur Supabase | Message d'erreur + pas de crash |

---

## 8. CRITERES DE REUSSITE

| Critère | Seuil |
|---------|-------|
| Taux de succès tools | >98% |
| Temps de réponse P95 | <5s |
| Hallucinations | 0 |
| Crashes chat | 0 |
| Sorties non parsables | 0 |

### La brique est fiable quand...

1. Un utilisateur peut créer/modifier/lister des entités via le chat sans erreur
2. Le LLM n'hallucine jamais d'IDs ou de données
3. Les modes PLAN/DEMANDER/AUTO fonctionnent comme documenté
4. Le contexte est correctement enrichi et isolé
5. Les actions critiques demandent TOUJOURS confirmation
6. Le working mode reflète fidèlement les étapes en cours
7. Les erreurs sont affichées proprement, sans crash

---

## 9. TESTS COMPORTEMENT LLM PAR FONCTIONNALITE

### 9.1 Clients

- [ ] **Chat**: "Crée un client Jean Dupont" → Appelle `create_client` avec le nom
- [ ] **Chat**: "Crée un client entreprise ACME avec SIRET 12345678901234" → Crée client type entreprise
- [ ] **Chat**: "Modifie l'email du client X" → Appelle `update_client`
- [ ] **Chat**: "Liste mes clients" → Appelle `list_clients`
- [ ] **Chat**: "Supprime le client X" → Appelle `delete_client` (soft delete)
- [ ] **Contexte**: Sur la page client, le LLM a accès aux infos du client courant
- [ ] **Validation**: Le LLM refuse de créer un client sans nom

### 9.2 Contacts

- [ ] **Chat**: "Ajoute un contact Marie Martin pour ACME" → Appelle `create_contact`
- [ ] **Chat**: "Le contact principal d'ACME c'est Pierre" → Met à jour `is_primary`
- [ ] **Chat**: "Ajoute le rôle facturation à Marie" → Appelle `update_contact`
- [ ] **Contexte**: Sur la page client, le LLM peut lister les contacts associés

### 9.3 Deals (Opportunités)

- [ ] **Chat**: "Crée un deal pour ACME de 5000€" → Appelle `create_deal`
- [ ] **Chat**: "Marque le deal X comme gagné" → Appelle `update_deal_status`
- [ ] **Chat**: "Ajoute le tag urgent au deal" → Appelle `add_deal_tag`
- [ ] **Chat**: "Crée une mission depuis ce deal" → Appelle `create_mission_from_deal`
- [ ] **Contexte**: Sur la page deal, le LLM connaît le statut et montant
- [ ] **Suggestions IA**: Détection automatique des deals urgents à relancer
- [ ] **Validation**: Le LLM refuse de créer une mission si le deal n'est pas gagné

### 9.4 Devis

- [ ] **Chat**: "Crée un devis pour ACME" → Appelle `create_quote`
- [ ] **Chat**: "Ajoute une ligne développement web 5 jours à 500€" → Appelle `add_quote_line`
- [ ] **Chat**: "Envoie le devis au client" → Appelle `send_quote`
- [ ] **Chat**: "Le devis a été accepté" → Appelle `update_quote_status`
- [ ] **Contexte**: Sur la page devis, le LLM connaît les lignes et totaux
- [ ] **Devise**: Le LLM utilise la devise configurée (EUR, USD, etc.)
- [ ] **Calcul**: Le LLM calcule correctement HT/TVA/TTC

### 9.5 Factures

- [ ] **Chat**: "Crée une facture depuis le devis X" → Appelle `create_invoice_from_quote`
- [ ] **Chat**: "La facture a été payée" → Appelle `update_invoice_status`
- [ ] **Chat**: "Envoie un rappel pour la facture en retard" → Appelle `send_invoice_reminder`
- [ ] **Suggestions IA**: Détection automatique des factures en retard de paiement
- [ ] **Suggestions IA**: Rappel des factures à échéance proche
- [ ] **Contexte**: Sur la page facture, le LLM connaît le statut de paiement

### 9.6 Missions

- [ ] **Chat**: "Crée une mission pour le deal X" → Appelle `create_mission_from_deal`
- [ ] **Chat**: "La mission est livrée" → Appelle `update_mission_status`
- [ ] **Chat**: "Facture la mission" → Crée une facture liée
- [ ] **Chat**: "Affiche cette mission sur mon Verifolio" → Met `visible_on_verifolio = true`
- [ ] **Contexte**: Sur la page mission, le LLM connaît le contexte et les factures liées

### 9.7 Propositions Commerciales

#### Génération de structure IA

- [ ] **Génération**: Entrer un mini-prompt (ex: "Proposition pour refonte site e-commerce")
- [ ] **Validation prompt**: Le prompt doit avoir au moins 5 caractères
- [ ] **Pages générées**: L'IA génère une liste de pages pertinentes
- [ ] **Couverture obligatoire**: La page "Couverture" est toujours ajoutée en premier
- [ ] **Catalogue de pages**: L'IA ne génère que des pages du catalogue (25 types)
- [ ] **Filtrage**: Les pages invalides sont automatiquement filtrées
- [ ] **Format JSON**: L'IA retourne un JSON valide avec `{ pages: [...] }`
- [ ] **Gestion erreurs**: Message d'erreur si l'API OpenAI échoue
- [ ] **Timeout**: Timeout de 60s pour la génération

#### Chat

- [ ] **Chat**: "Crée une proposition pour ACME" → Appelle `create_proposal`
- [ ] **Chat**: "Envoie la proposition" → Génère le token public
- [ ] **Contexte**: Sur la page proposition, le LLM connaît les pages et le statut

### 9.8 Briefs (Questionnaires Client)

#### Génération de structure IA

- [ ] **Génération**: Entrer une description (ex: "Brief pour projet mobile banking")
- [ ] **Types de blocs**: L'IA génère des blocs valides parmi 11 types:
  - `title`, `description`, `separator`, `media`
  - `text_short`, `text_long`, `number`
  - `address`, `time`, `date`, `selection`, `rating`
- [ ] **Configuration selection**: Génère `selection_type` (dropdown/radio/multiple) et `options`
- [ ] **Configuration date**: Génère `mode` (single/range/multiple/flexible)
- [ ] **Labels obligatoires**: Chaque bloc a un `label` non vide
- [ ] **Blocs requis**: L'IA peut marquer des blocs comme `required: true`
- [ ] **Format JSON**: Retourne `{ blocks: [...] }` valide
- [ ] **Filtrage**: Les blocs avec types invalides sont supprimés
- [ ] **Max tokens**: Limité à 2048 tokens pour la réponse

#### Chat

- [ ] **Chat**: "Crée un brief pour le projet X" → Appelle `create_brief`
- [ ] **Chat**: "Envoie le brief au client" → Génère le lien et envoie l'email

### 9.9 Reviews (Témoignages)

- [ ] **Chat**: "Demande une review pour la facture X" → Appelle `create_review_request`
- [ ] **Chat**: "Envoie un rappel pour les reviews en attente" → Appelle `send_review_reminder`
- [ ] **Chat**: "Publie la review de Marie" → Appelle `publish_review`
- [ ] **Suggestions IA**: Détection automatique des factures payées sans review demandée
- [ ] **Suggestions IA**: Suggestion de demander une review après paiement

### 9.10 Verifolio (Portfolio Public)

- [ ] **Chat**: "Publie mon Verifolio" → Met `is_published = true`
- [ ] **Chat**: "Change le thème en bleu" → Met à jour `theme_color`
- [ ] **Chat**: "Ajoute une activité Développement Web" → Crée une activité
- [ ] **Contexte**: Le LLM connaît l'état de publication et les sections actives

### 9.11 Paramètres

- [ ] **Devise**: Le LLM utilise la devise configurée dans les calculs
- [ ] **TVA**: Le LLM applique le taux de TVA par défaut
- [ ] **Contexte entreprise**: Le LLM connaît le nom de l'entreprise pour les documents

### 9.12 Fournisseurs et Dépenses

#### OCR/Vision (GPT-4o)

- [ ] **Upload image**: Uploader une image de devis/facture fournisseur
- [ ] **Extraction données**: L'IA extrait automatiquement:
  - Informations fournisseur (nom, SIRET, email, adresse)
  - Numéro de document
  - Date et date d'échéance
  - Montants (HT, TVA, TTC)
  - Lignes de détail (description, quantité, prix)
- [ ] **Matching fournisseur**: Recherche automatique par SIRET, email ou nom (fuzzy)
- [ ] **Score de confiance**: Affichage du score de confiance (0-1)
- [ ] **Formats supportés**: Images (PNG, JPG), PDF
- [ ] **Gestion erreurs**: Message si l'image est illisible
- [ ] **Distance Levenshtein**: Matching fuzzy des noms de fournisseurs

#### Chat

- [ ] **Chat**: "Crée un fournisseur" → Appelle `create_supplier`
- [ ] **Chat**: "Ajoute cette dépense" → Appelle `create_expense`

### 9.13 Tâches

- [ ] **Chat**: "Crée une tâche rappeler ACME demain" → Appelle `create_task`
- [ ] **Chat**: "Marque la tâche X comme terminée" → Appelle `complete_task`
- [ ] **Chat**: "Quelles sont mes tâches en retard?" → Appelle `list_tasks` avec filtre

### 9.14 Suggestions IA

#### Types de suggestions

- [ ] **Action**: Suggestions d'actions à effectuer
- [ ] **Reminder**: Rappels automatiques
- [ ] **Warning**: Alertes importantes
- [ ] **Optimization**: Suggestions d'amélioration

#### Priorités

- [ ] **Low**: Suggestions peu urgentes
- [ ] **Medium**: Suggestions normales
- [ ] **High**: Suggestions importantes
- [ ] **Urgent**: Suggestions critiques

#### Détection automatique

- [ ] **Factures en retard**: Détection via `detect_invoice_suggestions()`
- [ ] **Rappels factures**: Détection via `detect_invoice_reminder_suggestions()`
- [ ] **Deals urgents**: Détection via `detect_urgent_deal_suggestions()`
- [ ] **Demandes review**: Détection via `detect_review_request_suggestions()`

#### Workflow suggestions

- [ ] Affichage des suggestions dans le chat
- [ ] Accepter une suggestion → Exécute l'action
- [ ] Rejeter une suggestion → Masque la suggestion
- [ ] Statistiques des suggestions acceptées/rejetées

#### Tests suggestions

- [ ] **Facture impayée > 30j**: Génère suggestion "warning" urgente
- [ ] **Facture à échéance < 7j**: Génère suggestion "reminder"
- [ ] **Deal sans activité > 14j**: Génère suggestion "action"
- [ ] **Mission payée sans review**: Génère suggestion "action"

### 9.15 Assistant Chat

#### Modes de fonctionnement

- [ ] **AUTO**: Exécute les actions automatiquement
- [ ] **CONFIRM**: Demande confirmation avant chaque action
- [ ] **READ_ONLY**: Répond aux questions sans modifier les données
- [ ] **DISABLED**: Chat désactivé

#### Contexte intelligent

- [ ] **Page courante**: Le LLM sait sur quelle page l'utilisateur se trouve
- [ ] **Entité active**: Le LLM connaît le client/deal/mission courant
- [ ] **Statuts**: Le LLM connaît les statuts des entités
- [ ] **Devise**: Le LLM utilise la devise configurée

#### Outils disponibles (20+)

- [ ] `create_client`, `update_client`, `delete_client`, `list_clients`
- [ ] `create_contact`, `update_contact`
- [ ] `create_deal`, `update_deal`, `update_deal_status`, `add_deal_tag`
- [ ] `create_quote`, `add_quote_line`, `send_quote`, `update_quote_status`
- [ ] `create_invoice`, `create_invoice_from_quote`, `send_invoice`, `update_invoice_status`
- [ ] `create_mission`, `create_mission_from_deal`, `update_mission_status`
- [ ] `create_proposal`, `create_brief`, `create_review_request`
- [ ] `create_task`, `complete_task`, `list_tasks`

#### Tests du chat

- [ ] **Conversation naturelle**: "Bonjour, comment vas-tu?"
- [ ] **Création simple**: "Crée un client Test"
- [ ] **Création complexe**: "Crée un devis de 3 lignes pour ACME"
- [ ] **Workflow**: "Crée un deal, puis un devis, puis envoie-le"
- [ ] **Questions**: "Quel est le montant total des factures impayées?"
- [ ] **Erreurs**: "Crée un client" (sans nom) → Demande le nom
- [ ] **Permissions**: En mode READ_ONLY, refuse de créer des entités

#### Retry et fallback

- [ ] **Tool calling**: Si le LLM suggère mais n'exécute pas, retry automatique
- [ ] **Timeout**: Gestion du timeout 60s avec message d'erreur
- [ ] **API error**: Message d'erreur si OpenAI est indisponible

### 9.16 Sécurité LLM

- [ ] **Isolation données**: Le LLM n'accède qu'aux données de l'utilisateur connecté
- [ ] **Modes de chat**: Respect des permissions selon le mode (AUTO, CONFIRM, READ_ONLY)
- [ ] **Validation outils**: Le LLM ne peut pas appeler des outils non autorisés
- [ ] **Clé API**: OpenAI API key stockée côté serveur uniquement

### 9.17 Performance LLM

- [ ] **Timeout chat**: 60 secondes maximum pour une réponse
- [ ] **Timeout structure IA**: 60 secondes pour génération de pages
- [ ] **Timeout OCR**: Temps raisonnable pour extraction d'image

---

## 10. WORKFLOW E2E AVEC LLM

### Parcours complet via Chat

1. [ ] **Chat**: "Crée un client ACME avec contact Jean"
2. [ ] **Chat**: "Crée un deal de 5000€ pour ACME"
3. [ ] **Chat**: "Génère une proposition" → Utilise IA pour structure
4. [ ] **Chat**: "Envoie la proposition"
5. [ ] **Public**: Accepter via lien
6. [ ] **Chat**: "Crée un devis avec les mêmes lignes"
7. [ ] **Chat**: "Marque le deal comme gagné"
8. [ ] **Chat**: "Crée la mission"
9. [ ] **Chat**: "Facture la mission"
10. [ ] **Suggestion IA**: "Demander une review?" → Accepter
11. [ ] **Public**: Soumettre la review
12. [ ] **Chat**: "Publie la review"

---

## ANNEXE: Modèles IA et limites

| Fonctionnalité | Modèle | Max Tokens | Timeout |
|----------------|--------|------------|---------|
| Chat assistant | gpt-4o-mini | - | 60s |
| Structure proposition | gpt-4o-mini | 1024 | 60s |
| Structure brief | gpt-4o-mini | 2048 | 60s |
| OCR documents | gpt-4o | - | 60s |

### Configuration requise

- Variable d'environnement: `OPENAI_API_KEY`
- Modèles utilisés:
  - `gpt-4o-mini`: Chat, génération de structure
  - `gpt-4o`: OCR/Vision pour extraction de documents
