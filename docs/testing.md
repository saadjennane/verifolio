# Guide des Tests Verifolio

> **Version**: 1.1
> **Date**: 2025-02-08
> **Framework**: Vitest

---

## Configuration

### vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globals: false,
  },
});
```

### Commandes

```bash
# Lancer tous les tests
npm run test

# Lancer les tests en mode watch
npm run test -- --watch

# Lancer un fichier spécifique
npm run test tests/lib/briefs/format-responses.test.ts

# Lancer avec couverture
npm run test -- --coverage
```

---

## Structure des Tests

```
tests/
├── lib/                          # Tests unitaires des utilitaires
│   └── briefs/
│       └── format-responses.test.ts    # Formatage des réponses de brief
│
└── llm/                          # Tests du système LLM
    ├── behavior/                 # Tests comportement par entité
    │   ├── briefs.test.ts
    │   ├── clients.test.ts
    │   ├── contacts.test.ts
    │   ├── deals.test.ts
    │   ├── invoices.test.ts
    │   ├── missions.test.ts
    │   ├── proposals.test.ts
    │   ├── quotes.test.ts
    │   ├── reviews.test.ts
    │   └── suggestions.test.ts
    │
    ├── e2e/                      # Tests end-to-end
    │   └── workflow.test.ts
    │
    ├── safety/                   # Tests de sécurité
    │   └── hallucination.test.ts
    │
    ├── tools/                    # Tests des outils LLM
    │   └── tools.test.ts
    │
    ├── route.auto.test.ts        # Tests mode AUTO
    ├── route.context.test.ts     # Tests contexte
    ├── route.demander.test.ts    # Tests mode DEMANDER
    ├── route.plan.test.ts        # Tests mode PLAN
    ├── route.safety.test.ts      # Tests sécurité route
    ├── route.timeout.test.ts     # Tests timeout
    ├── route.validation.test.ts  # Tests validation entrées
    └── schemas.test.ts           # Tests schémas Zod
```

---

## Tests Unitaires

### lib/briefs/format-responses.test.ts (17 tests)

Tests du formatage des réponses de brief pour le résumé IA.

| Test | Description |
|------|-------------|
| `should include brief context` | Vérifie le titre, client et projet |
| `should format text_short responses` | Formatage réponse courte |
| `should format text_long responses` | Formatage réponse longue |
| `should format address responses` | Formatage adresse complète |
| `should format single date responses` | Formatage date unique |
| `should format date range responses` | Formatage période |
| `should format multiple dates` | Formatage dates multiples |
| `should format dropdown selection` | Formatage dropdown |
| `should format radio selection` | Formatage radio |
| `should format multiple selection` | Formatage multi-sélection |
| `should format rating responses` | Formatage note étoiles |
| `should format number responses` | Formatage nombre |
| `should skip title blocks` | Ignore les blocs titre |
| `should skip description blocks` | Ignore les blocs description |
| `should skip separator blocks` | Ignore les séparateurs |
| `should show "(pas de réponse)"` | Questions sans réponse |
| `hasResponsesToSummarize` | Détecte les réponses à résumer |

**Fichier source**: `lib/briefs/format-responses.ts`

```typescript
// Fonctions testées
formatBriefForSummary(brief: BriefWithDetails): string
hasResponsesToSummarize(brief: BriefWithDetails): boolean
```

---

## Tests LLM

### Comportement par Entité

#### clients.test.ts (5 tests)

| Test | Entrée | Attendu |
|------|--------|---------|
| Créer client simple | "Crée un client Jean Dupont" | `create_client` |
| Créer entreprise | "Crée entreprise ACME" | `create_client({type:'entreprise'})` |
| Modifier email | "Modifie l'email du client X" | `update_client` |
| Lister clients | "Liste mes clients" | `list_clients` |
| Supprimer client | "Supprime le client X" | Confirmation + soft delete |

#### contacts.test.ts (6 tests)

| Test | Description |
|------|-------------|
| Création contact | Crée un contact pour un client |
| Contact principal | Définit un contact principal |
| Ajout rôle | Ajoute un rôle au contact |
| Lien client | Lie un contact à un client |

#### deals.test.ts (6 tests)

| Test | Description |
|------|-------------|
| Création deal | Crée une opportunité |
| Mise à jour statut | Change le statut (won/lost) |
| Ajout tag | Ajoute un tag au deal |
| Création mission | Crée mission depuis deal |

#### quotes.test.ts (5 tests)

| Test | Description |
|------|-------------|
| Création devis | Crée un devis pour un client |
| Ajout ligne | Ajoute une ligne au devis |
| Envoi devis | Envoie le devis au client |
| Mise à jour statut | Accepte/refuse le devis |

#### invoices.test.ts (6 tests)

| Test | Description |
|------|-------------|
| Création facture | Crée une facture |
| Depuis devis | Convertit un devis en facture |
| Envoi facture | Envoie la facture |
| Marquer payée | Met à jour le statut de paiement |
| Rappel | Envoie un rappel de paiement |

#### missions.test.ts (6 tests)

| Test | Description |
|------|-------------|
| Création mission | Crée une mission |
| Depuis deal | Crée depuis un deal gagné |
| Mise à jour statut | Change le statut (delivered) |
| Facturation | Facture la mission |

#### proposals.test.ts (8 tests)

| Test | Description |
|------|-------------|
| Création proposition | Crée une proposition commerciale |
| Génération IA | Génère structure via LLM |
| Envoi proposition | Génère lien public |
| Validation pages | Filtre les pages invalides |

#### briefs.test.ts (6 tests)

| Test | Description |
|------|-------------|
| Création brief | Crée un questionnaire client |
| Génération IA | Génère structure via LLM |
| Types de blocs | Valide les 11 types de blocs |
| Envoi brief | Génère lien et envoie |

#### reviews.test.ts (5 tests)

| Test | Description |
|------|-------------|
| Demande review | Crée une demande de témoignage |
| Rappel | Envoie un rappel |
| Publication | Publie une review |

#### suggestions.test.ts (9 tests)

| Test | Description |
|------|-------------|
| Factures en retard | Détecte les factures impayées |
| Rappels factures | Suggère des rappels |
| Deals urgents | Détecte les deals à relancer |
| Demandes review | Suggère des demandes de review |

#### daily-report.test.ts (6 tests)

| Test | Entrée | Attendu |
|------|--------|---------|
| Déclencheur principal | "Mon rapport du jour" | Appel `get_financial_summary` + `list_invoices` |
| Variante informelle | "Quoi de beau aujourd'hui ?" | Même comportement |
| Variante courte | "Rapport" | Même comportement |
| Format de sortie | - | Structure avec CA, Facturation, Top 3 actions |
| Outils READ_ONLY | - | Uniquement `get_financial_summary`, `list_invoices`, `list_deals` |
| Longueur réponse | - | Entre 120 et 220 mots |

**Déclencheurs reconnus** :
- "Mon rapport du jour"
- "Quoi de beau aujourd'hui ?"
- "Qu'est-ce que j'ai à faire ?"
- "Rapport"
- "Ma journée"
- "État de mon activité"

---

### Tests de Route

#### route.auto.test.ts (4 tests)

| Test | Description |
|------|-------------|
| Lecture directe | Exécute read_only sans confirmation |
| Écriture légère | Exécute safe_write sans confirmation |
| Écriture critique | Demande confirmation |
| Actions multiples | Exécute séquence d'actions |

#### route.demander.test.ts (5 tests)

| Test | Description |
|------|-------------|
| Lecture directe | Exécute read_only directement |
| Écriture avec confirm | Demande confirmation systématique |
| Confirmation acceptée | Continue après "Oui" |
| Confirmation refusée | Annule après "Non" |

#### route.plan.test.ts (4 tests)

| Test | Description |
|------|-------------|
| Lecture seule | N'exécute que les tools read_only |
| Pas d'écriture | Refuse les tools d'écriture |
| Format plan | Retourne liste d'étapes numérotées |
| Confirmation requise | Termine par demande de confirmation |

#### route.context.test.ts (3 tests)

| Test | Description |
|------|-------------|
| Enrichissement | Injecte les données de l'entité |
| Changement | Reset au changement de page |
| Isolation | Sépare les contextes |

#### route.validation.test.ts (4 tests)

| Test | Description |
|------|-------------|
| Paramètres requis | Valide les paramètres obligatoires |
| Types invalides | Rejette les types incorrects |
| Message vide | Rejette les messages vides |
| Mode invalide | Rejette les modes non supportés |

#### route.timeout.test.ts (3 tests)

| Test | Description |
|------|-------------|
| Timeout OpenAI | Gère timeout 60s |
| Timeout tool | Gère timeout 30s |
| Message d'erreur | Retourne erreur propre |

#### route.safety.test.ts (3 tests)

| Test | Description |
|------|-------------|
| Isolation données | N'accède qu'aux données utilisateur |
| Outils non autorisés | Rejette les outils inconnus |
| Injection prompt | Résiste aux injections |

---

### Tests de Sécurité

#### safety/hallucination.test.ts (8 tests)

| Test | Description |
|------|-------------|
| ID inventé | Refuse d'utiliser un ID non obtenu |
| Données inventées | Ne génère pas de données fictives |
| Montants inventés | Ne devine pas les montants |
| Lecture avant action | Lit les données avant d'agir |

---

### Tests de Schémas

#### schemas.test.ts (2 tests)

| Test | Description |
|------|-------------|
| ToolResult valide | Valide le format de retour |
| ContextId valide | Valide le format de contexte |

---

### Tests End-to-End

#### e2e/workflow.test.ts (8 tests)

Parcours complet via chat :

1. Création client + contact
2. Création deal
3. Génération proposition IA
4. Envoi proposition
5. Création devis
6. Création mission
7. Facturation
8. Demande de review

---

### Tests des Outils

#### tools/tools.test.ts (60+ tests)

Tests exhaustifs de chaque tool LLM :

| Catégorie | Nombre | Exemples |
|-----------|--------|----------|
| Clients | 6 | create, update, delete, list |
| Contacts | 5 | create, update, link |
| Deals | 6 | create, update_status, add_tag |
| Quotes | 5 | create, add_line, send |
| Invoices | 6 | create, from_quote, mark_paid |
| Missions | 5 | create, from_deal, update_status |
| Proposals | 4 | create, send |
| Briefs | 4 | create, send |
| Reviews | 4 | create, send_reminder, publish |
| Custom fields | 3 | create, update_value |
| Financial | 2 | get_summary |

---

### Tests du Store d'Onglets

#### lib/tabs-store.test.ts (21 tests)

Tests du système de gestion des onglets inspiré de VS Code avec onglets temporaires et figés.

**Règles d'ouverture testées (R1-R4) :**

| Test | Description |
|------|-------------|
| R1 - Sidebar opens temporary | Sidebar ouvre onglet temporaire |
| R1 - Replace temporary | Remplace le temporaire actif |
| R1 - Not replace pinned | Ne remplace pas un onglet figé |
| R2 - Navigate within tab | Navigation dans le même onglet |
| R2 - forceNew (Ctrl+Click) | Ouvre nouvel onglet avec Ctrl+Click |
| R3 - pinTab (double-clic) | Double-clic fige l'onglet |
| R4 - LLM opens new | LLM ouvre TOUJOURS nouvel onglet |
| R4 - LLM not replace | LLM ne remplace jamais |

**Règles de fermeture testées (F1-F3) :**

| Test | Description |
|------|-------------|
| closeTab | Ferme un onglet temporaire |
| Not close pinned | Dashboard jamais fermé |
| Not close dirty | Onglet modifié jamais fermé |
| F2 - Max 5 cleanup | Nettoie si > 5 temporaires |
| F2 - Not close active | Ne ferme pas l'onglet actif |
| F3 - closeAllTemporary | Ferme tous les temporaires |
| F3 - Keep pinned | Garde les onglets figés |
| F3 - Keep dirty | Garde les onglets modifiés |

**Tests de compatibilité :**

| Test | Description |
|------|-------------|
| getTemporaryTabsCount | Compte correct des temporaires |
| lastAccessedAt | Mise à jour du timestamp |
| makeTabPermanent legacy | API legacy fonctionne |
| boolean param legacy | Paramètre boolean accepté |

**Fichier source**: `lib/stores/tabs-store.ts`

```typescript
// Types clés
interface Tab {
  id: string;
  type: TabType;
  isTemporary: boolean;  // Onglet temporaire vs figé
  isDirty?: boolean;     // Contenu non sauvegardé
  pinned?: boolean;      // Jamais fermable (Dashboard)
  openedBy?: TabOpenedBy; // 'sidebar' | 'user' | 'llm'
  lastAccessedAt?: number;
}

// Actions principales
openTab(config, { source, pinned, forceNew })
pinTab(tabId)         // Double-clic fige l'onglet
closeTab(tabId)       // Ferme (sauf pinned/dirty)
closeAllTemporaryTabs() // Ferme tous les temporaires
cleanupTemporaryTabs()  // Maintient max 5 temporaires
```

---

### Tests de la Section Taches Liees

#### components/tasks/EntityTasksSection.tsx

Composant affichant les taches liees a une entite avec vues liste et kanban.

**Tests manuels recommandes :**

| Test | Description | Verification |
|------|-------------|--------------|
| Affichage liste | Ouvrir fiche Deal/Mission/Contact/Client | Section "Taches" visible |
| Toggle vue | Cliquer icone Liste/Kanban | Vue change correctement |
| Creer tache | Cliquer "+ Tache", remplir, sauvegarder | Tache apparait dans la liste |
| Marquer fait | Cocher une tache | Passe en "Terminees" (kanban) ou barre (liste) |
| Mettre en attente | Cliquer "Attendre" sur tache ouverte | Modal raison, tache passe en "En attente" |
| Supprimer tache | Cliquer X sur une tache | Confirmation, tache supprimee |
| Appliquer template | Cliquer "Template", choisir, appliquer | Taches du template ajoutees |
| Barre progression | Avoir des taches terminees | Pourcentage affiche correctement |
| Indicateur retard | Tache avec date passee | Badge "EN RETARD" rouge |

**Integration dans les pages :**

| Page | Composant | entityType |
|------|-----------|------------|
| Fiche Deal | `DealDetailTab.tsx` | `deal` |
| Fiche Mission | `MissionDetailTab.tsx` | `mission` |
| Fiche Contact | `ContactDetailTab.tsx` | `contact` |
| Fiche Client | `ClientDetailTab.tsx` | `client` |

**Fichier source**: `components/tasks/EntityTasksSection.tsx`

```typescript
// Props
interface EntityTasksSectionProps {
  entityType: TaskEntityType;  // 'deal' | 'mission' | 'client' | 'contact' | 'invoice'
  entityId: string;
  entityName?: string;
  className?: string;
}

// Vues disponibles
type ViewMode = 'list' | 'kanban';

// Colonnes Kanban
- A faire (open) - bleu
- En attente (en_attente) - jaune
- Terminees (done) - vert
```

---

## Statistiques

| Catégorie | Fichiers | Tests |
|-----------|----------|-------|
| Unitaires (lib) | 2 | 38 |
| Comportement | 10 | ~60 |
| Routes | 7 | ~25 |
| Sécurité | 2 | ~11 |
| Schémas | 1 | 2 |
| E2E | 1 | 8 |
| Outils | 1 | ~180 |
| **Total** | **24** | **~326** |

---

## Bonnes Pratiques

### Structure d'un test

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { functionToTest } from '@/lib/module';

describe('functionToTest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should do something specific', () => {
    // Arrange
    const input = { ... };

    // Act
    const result = functionToTest(input);

    // Assert
    expect(result).toBe(expected);
  });
});
```

### Mocks recommandés

```typescript
// Mock OpenAI
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: '{}' } }]
        })
      }
    }
  }))
}));

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: {}, error: null })
  })
}));
```

---

## Critères de Réussite

| Critère | Seuil |
|---------|-------|
| Tests passants | 100% |
| Couverture | >80% |
| Temps d'exécution | <30s |
| Aucun test skipped | 0 (hors intégration) |

---

## Ajout de Nouveaux Tests

1. Créer le fichier dans le bon dossier (`tests/lib/` ou `tests/llm/`)
2. Utiliser le pattern `*.test.ts`
3. Importer avec l'alias `@/`
4. Ajouter la documentation ici
5. Vérifier que tous les tests passent

```bash
npm run test
```
