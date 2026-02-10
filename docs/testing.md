# Guide des Tests Verifolio

> **Version**: 1.2
> **Date**: 2025-02-10
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

### Tests des Templates de Taches

#### Fonctionnalite Task Templates

Systeme de templates permettant de creer des groupes de taches predefinies avec des delais relatifs (day_offset) par rapport a une date de reference.

**Page de gestion**: `/settings/task-templates`

**Tests manuels recommandes - Interface :**

| Test | Description | Verification |
|------|-------------|--------------|
| Acces page | Aller dans Parametres > Templates de taches | Page affichee avec liste des templates |
| Creer template | Cliquer "Nouveau template", remplir nom | Template cree, apparait dans la liste |
| Modifier template | Cliquer sur un template, modifier le nom | Nom mis a jour |
| Supprimer template | Cliquer X sur template, confirmer | Template supprime de la liste |
| Ajouter item | Dans un template, cliquer "Ajouter tache" | Nouvelle ligne apparait |
| Modifier item | Changer titre, day_offset, owner_scope | Item mis a jour |
| Supprimer item | Cliquer X sur un item | Item supprime |
| Day offset negatif | Creer item avec offset -7 | Accepte, affiche "J-7" |
| Day offset positif | Creer item avec offset +14 | Accepte, affiche "J+14" |
| Owner scope | Changer entre Moi/Client/Fournisseur | Valeur sauvegardee |

**Tests manuels recommandes - Application :**

| Test | Description | Verification |
|------|-------------|--------------|
| Bouton template | Sur fiche Deal/Mission/Client, cliquer "Template" | Modal de selection apparait |
| Selectionner template | Choisir un template dans la liste | Template selectionne |
| Date reference | Choisir une date de reference | Date selectionnee |
| Appliquer | Cliquer "Appliquer" | Taches creees avec dates calculees |
| Calcul dates | Template avec J+7, date ref = 1er janvier | Tache due le 8 janvier |
| Owner scope preserve | Template avec owner_scope=client | Tache creee avec owner_scope=client |

**Tests API :**

| Endpoint | Methode | Test | Verification |
|----------|---------|------|--------------|
| `/api/task-templates` | GET | Lister templates | Retourne array de templates avec items |
| `/api/task-templates` | POST | Creer template | Template cree, retourne id |
| `/api/task-templates/[id]` | GET | Detail template | Retourne template avec items |
| `/api/task-templates/[id]` | PUT | Modifier template | Template mis a jour |
| `/api/task-templates/[id]` | DELETE | Supprimer template | Template supprime (soft delete) |
| `/api/task-templates/[id]/apply` | POST | Appliquer template | Taches creees pour l'entite |

**Tests outils LLM :**

| Outil | Test | Verification |
|-------|------|--------------|
| `create_task_template` | Creer template via chat | Template cree avec items |
| `get_task_templates` | Lister templates via chat | Liste retournee |
| `apply_task_template` | Appliquer template via chat | Taches creees |

**Structure de donnees :**

```typescript
// Template
interface TaskTemplate {
  id: string;
  name: string;
  description?: string;
  entity_type: 'deal' | 'mission' | 'client';
  items: TaskTemplateItem[];
}

// Item de template
interface TaskTemplateItem {
  id: string;
  template_id: string;
  title: string;
  day_offset: number;        // Negatif = avant, positif = apres
  owner_scope: 'me' | 'client' | 'supplier';
  position: number;
}

// Application
// POST /api/task-templates/[id]/apply
{
  entity_type: 'deal',
  entity_id: 'uuid',
  reference_date: '2024-01-15'
}
```

**Fichiers sources**:
- Page: `app/(dashboard)/settings/task-templates/page.tsx`
- API: `app/api/task-templates/route.ts`, `app/api/task-templates/[id]/route.ts`
- Types: `lib/tasks/types.ts`, `lib/tasks/templates.ts`
- Outils LLM: `lib/llm/tools/task-template-tools.ts`

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

**Modules avec tests manuels documentés :**
- Documents (Clients & Fournisseurs)
- Trésorerie (Encaissements/Décaissements)
- Tâches liées & Templates
- Abonnements (Subscriptions)
- Paiements indépendants (Association a posteriori)

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

### Tests du Module Documents (Clients & Fournisseurs)

#### Documents Hub Refonte

Le module Documents est divisé en deux familles : **Documents Clients** (sortants) et **Documents Fournisseurs** (entrants/sortants).

**Page de test**: `/documents`

**Tests manuels recommandés - Navigation :**

| Test | Description | Vérification |
|------|-------------|--------------|
| Onglets principaux | Cliquer sur "Clients" puis "Fournisseurs" | Les sous-onglets changent selon la famille |
| Clients - Propositions | Aller dans Clients > Propositions | Liste des propositions affichée |
| Clients - Briefs | Aller dans Clients > Briefs | Liste des briefs affichée |
| Clients - Devis | Aller dans Clients > Devis | Liste des devis affichée |
| Clients - Factures | Aller dans Clients > Factures | Liste des factures affichée |
| Clients - Bons de livraison | Aller dans Clients > BL | Liste des BL client affichée |
| Fournisseurs - Factures | Aller dans Fournisseurs > Factures | Liste factures fournisseurs |
| Fournisseurs - Devis | Aller dans Fournisseurs > Devis | Liste devis fournisseurs |
| Fournisseurs - BL | Aller dans Fournisseurs > BL | Liste BL fournisseurs |
| Fournisseurs - Bons de commande | Aller dans Fournisseurs > BC | Liste bons de commande |

**Tests manuels recommandés - Création :**

| Test | Description | Vérification |
|------|-------------|--------------|
| Créer BL client | Clients > BL > "+ Nouveau", sélectionner mission | Bon de livraison créé avec numéro auto |
| Créer BC fournisseur | Fournisseurs > BC > "+ Nouveau", sélectionner fournisseur | Bon de commande créé avec numéro auto |
| Créer BL fournisseur | Fournisseurs > BL > "+ Nouveau", sélectionner fournisseur | BL fournisseur créé |
| Modal sélection fournisseur | Créer document fournisseur | Modal affiche liste des fournisseurs |

**Tests manuels recommandés - Bulk Actions :**

| Test | Description | Vérification |
|------|-------------|--------------|
| Mode sélection | Cliquer "Modifier" | Checkboxes apparaissent |
| Sélection multiple | Cocher plusieurs documents | Compteur affiché dans la barre |
| Tout sélectionner | Cliquer "Tout sélectionner" | Tous les documents cochés |
| Suppression groupée | Sélectionner + "Supprimer" | Confirmation, documents supprimés |

**Tests API :**

| Endpoint | Méthode | Test | Vérification |
|----------|---------|------|--------------|
| `/api/delivery-notes` | GET | Lister BL clients | Retourne array de BL |
| `/api/delivery-notes` | POST | Créer BL client | BL créé avec numéro généré |
| `/api/delivery-notes/[id]` | GET | Détail BL | Retourne BL avec relations |
| `/api/delivery-notes/[id]` | PATCH | Modifier BL | BL mis à jour |
| `/api/delivery-notes/[id]` | DELETE | Supprimer BL | Soft delete appliqué |
| `/api/purchase-orders` | GET | Lister BC | Retourne array de BC |
| `/api/purchase-orders` | POST | Créer BC | BC créé avec numéro généré |
| `/api/purchase-orders/[id]` | GET | Détail BC | Retourne BC avec relations |
| `/api/purchase-orders/[id]` | PATCH | Modifier BC | BC mis à jour |
| `/api/purchase-orders/[id]` | DELETE | Supprimer BC | Soft delete appliqué |
| `/api/suppliers/delivery-notes` | GET | Lister BL fournisseurs | Retourne array de BL |
| `/api/suppliers/delivery-notes` | POST | Créer BL fournisseur | BL créé |
| `/api/suppliers/delivery-notes/[id]` | GET | Détail BL fournisseur | Retourne BL avec relations |
| `/api/suppliers/delivery-notes/[id]` | PATCH | Modifier BL fournisseur | BL mis à jour |
| `/api/suppliers/delivery-notes/[id]` | DELETE | Supprimer BL fournisseur | Soft delete appliqué |

**Statuts par type de document :**

| Type | Statuts disponibles |
|------|---------------------|
| BL Client | brouillon, envoyé, signé |
| Bon de Commande | brouillon, envoyé, confirmé, livré, annulé |
| BL Fournisseur | reçu, vérifié, litige |

**Structure de données :**

```typescript
// Bon de livraison client
interface DeliveryNote {
  id: string;
  numero: string;           // Auto-généré (BL-2024-001)
  mission_id: string;
  client_id: string;
  date_emission: string;
  status: 'brouillon' | 'envoye' | 'signe';
  line_items: DeliveryNoteLineItem[];
}

// Bon de commande fournisseur
interface PurchaseOrder {
  id: string;
  numero: string;           // Auto-généré (BC-2024-001)
  supplier_id: string;
  supplier_quote_id?: string;
  date_emission: string;
  date_livraison_prevue?: string;
  total_ht: number;
  total_ttc: number;
  status: 'brouillon' | 'envoye' | 'confirme' | 'livre' | 'annule';
  line_items: PurchaseOrderLineItem[];
}

// BL fournisseur (reçu)
interface SupplierDeliveryNote {
  id: string;
  supplier_id: string;
  purchase_order_id?: string;
  reference?: string;
  date_reception: string;
  status: 'recu' | 'verifie' | 'litige';
  document_url?: string;
}
```

**Fichiers sources**:
- UI: `components/tabs/DocumentsListTab.tsx`
- Modal: `components/documents/EntitySelectionModal.tsx`
- Types: `lib/delivery-notes/types.ts`, `lib/purchase-orders/types.ts`, `lib/suppliers/types.ts`
- API: `app/api/delivery-notes/`, `app/api/purchase-orders/`, `app/api/suppliers/delivery-notes/`
- DB: `supabase/migrations/087_supplier_documents.sql`

---

### Tests du Module Tresorerie

#### Vue Tresorerie (Cash View)

Module cross-entite permettant de visualiser et gerer les encaissements (IN) et decaissements (OUT) avec KPIs et actions rapides.

**Page de test**: `/treasury` (via sidebar)

**Tests manuels recommandes - Navigation :**

| Test | Description | Verification |
|------|-------------|--------------|
| Acces sidebar | Cliquer sur "Tresorerie" dans la sidebar | Onglet Tresorerie s'ouvre |
| KPIs affiches | Page chargee | 9 cartes KPI visibles (meme si 0) |
| Periode preset | Cliquer sur "Ce mois" / "Cette semaine" | KPIs et mouvements se mettent a jour |
| Filtres avances | Ouvrir filtres, changer direction/type | Liste filtree correctement |

**Tests manuels recommandes - Encaissements :**

| Test | Description | Verification |
|------|-------------|--------------|
| Ouvrir modal | Cliquer "Encaisser" (bouton vert) | Modal s'ouvre avec liste factures clients |
| Selectionner facture | Choisir une facture dans la liste | Montant restant pre-rempli |
| Paiement total | Laisser montant = remaining, valider | Mouvement cree, facture passe en "payee" |
| Paiement partiel | Mettre montant < remaining, valider | Mouvement cree, remaining decremente |
| Validation montant | Mettre montant > remaining | Erreur affichee, pas de creation |

**Tests manuels recommandes - Decaissements :**

| Test | Description | Verification |
|------|-------------|--------------|
| Ouvrir modal | Cliquer "Decaisser" (bouton rouge) | Modal s'ouvre avec liste factures fournisseurs |
| Selectionner facture | Choisir une facture fournisseur | Montant restant pre-rempli |
| Paiement fournisseur | Entrer montant, valider | Mouvement OUT cree |
| Statut auto | Payer totalite d'une facture | Facture passe en "paid" automatiquement |

**Tests manuels recommandes - Table mouvements :**

| Test | Description | Verification |
|------|-------------|--------------|
| Liste mouvements | Avoir des paiements | Mouvements affiches groupes par date |
| Direction IN | Encaissement effectue | Badge vert "Encaissement" |
| Direction OUT | Decaissement effectue | Badge rouge "Decaissement" |
| Lien facture | Cliquer sur numero facture | Onglet facture s'ouvre |
| Lien client/fournisseur | Cliquer sur nom | Onglet client/fournisseur s'ouvre |

**Tests API :**

| Endpoint | Methode | Test | Verification |
|----------|---------|------|--------------|
| `/api/treasury/summary` | GET | KPIs periode | Retourne 9 KPIs calcules |
| `/api/treasury/movements` | GET | Liste mouvements | Retourne mouvements filtres |
| `/api/treasury/encaissement` | POST | Creer encaissement | Paiement IN cree, statut maj |
| `/api/treasury/decaissement` | POST | Creer decaissement | Paiement OUT cree, statut maj |
| `/api/treasury/pending?type=client` | GET | Factures a encaisser | Liste factures clients non payees |
| `/api/treasury/pending?type=supplier` | GET | Factures a payer | Liste factures fournisseurs non payees |

**KPIs calcules :**

| KPI | Description | Formule |
|-----|-------------|---------|
| Total encaisse | Somme IN sur periode | SUM(amount) WHERE direction='in' |
| Total decaisse | Somme OUT sur periode | SUM(amount) WHERE direction='out' |
| Solde net | Difference | encaisse - decaisse |
| A encaisser | Factures clients non payees | SUM(remaining) invoices |
| A payer | Factures fournisseurs non payees | SUM(remaining) supplier_invoices |
| En retard encaissement | A encaisser avec echeance passee | WHERE date_echeance < TODAY |
| En retard paiement | A payer avec echeance passee | WHERE date_echeance < TODAY |
| A venir encaissement | A encaisser echeance future | WHERE date_echeance >= TODAY |
| A venir paiement | A payer echeance future | WHERE date_echeance >= TODAY |

**Structure de donnees :**

```typescript
// KPIs
interface TreasuryKPIs {
  total_encaisse: number;
  total_decaisse: number;
  solde_net: number;
  a_encaisser: number;
  a_payer: number;
  en_retard_encaissement: number;
  en_retard_paiement: number;
  a_venir_encaissement: number;
  a_venir_paiement: number;
}

// Mouvement unifie
interface TreasuryMovement {
  id: string;
  direction: 'in' | 'out';
  movement_type: 'payment' | 'advance' | 'refund' | 'supplier_payment' | 'supplier_advance' | 'supplier_refund';
  amount: number;
  payment_method: string;
  payment_date: string;
  reference?: string;
  source_type: 'invoice' | 'supplier_invoice';
  source_id: string;
  source_numero: string;
  entity_id: string;
  entity_name: string;
}

// Payload encaissement
interface CreateEncaissementPayload {
  invoice_id: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  reference?: string;
  notes?: string;
}

// Payload decaissement
interface CreateDecaissementPayload {
  supplier_invoice_id: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  reference?: string;
  notes?: string;
}
```

**Fichiers sources**:
- Tab: `components/tabs/TreasuryTab.tsx`
- UI: `components/treasury/TreasuryKPICards.tsx`, `TreasuryFilters.tsx`, `TreasuryTable.tsx`
- Modals: `components/treasury/EncaissementModal.tsx`, `DecaissementModal.tsx`
- Types: `lib/treasury/types.ts`
- Lib: `lib/treasury/treasury.ts`
- API: `app/api/treasury/summary/`, `movements/`, `encaissement/`, `decaissement/`, `pending/`
- DB: `supabase/migrations/088_treasury_module.sql`

---

### Tests du Module Abonnements

#### Gestion des Abonnements (Subscriptions)

Module permettant de gerer les abonnements recurrents (SaaS, services) avec generation automatique des paiements et suivi des echeances.

**Page de test**: Integre dans la vue Tresorerie (`/treasury`)

**Tests manuels recommandes - CRUD Abonnements :**

| Test | Description | Verification |
|------|-------------|--------------|
| Creer abonnement | Remplir nom, montant, frequence, fournisseur | Abonnement cree avec next_due_date calcule |
| Frequence mensuelle | Choisir "Mensuel" | Echeance +1 mois |
| Frequence trimestrielle | Choisir "Trimestriel" | Echeance +3 mois |
| Frequence annuelle | Choisir "Annuel" | Echeance +12 mois |
| Frequence custom | Choisir "Personnalise" + nb jours | Echeance +N jours |
| Modifier abonnement | Changer montant/frequence | Mise a jour appliquee |
| Suspendre abonnement | Passer status = "suspended" | Plus de paiements generes |
| Resilier abonnement | Passer status = "cancelled" | cancelled_at renseigne |

**Tests manuels recommandes - Paiements Abonnement :**

| Test | Description | Verification |
|------|-------------|--------------|
| Generation auto | Abonnement actif avec echeance proche | Paiement cree automatiquement |
| Auto-debit ON | auto_debit = true | Paiement passe en "completed" a la date |
| Auto-debit OFF | auto_debit = false | Paiement reste en "pending" |
| Marquer paye | Cliquer "Confirmer" sur paiement pending | Statut → completed, next_due_date avance |
| Paiement en retard | Paiement pending + date passee | Badge "En retard" affiche |

**Tests API :**

| Endpoint | Methode | Test | Verification |
|----------|---------|------|--------------|
| `/api/subscriptions` | GET | Lister abonnements | Retourne liste avec supplier_name |
| `/api/subscriptions` | POST | Creer abonnement | Abonnement cree, next_due_date calcule |
| `/api/subscriptions/[id]` | GET | Detail abonnement | Retourne abonnement avec paiements |
| `/api/subscriptions/[id]` | PATCH | Modifier abonnement | Mise a jour appliquee |
| `/api/subscriptions/[id]` | DELETE | Supprimer abonnement | Soft delete ou suppression |
| `/api/subscriptions/[id]/suspend` | POST | Suspendre | Status → suspended |
| `/api/subscriptions/[id]/resume` | POST | Reprendre | Status → active |
| `/api/subscriptions/[id]/cancel` | POST | Resilier | Status → cancelled |
| `/api/subscriptions/generate` | POST | Generer paiements | Paiements crees pour echeances proches |
| `/api/subscriptions/[id]/payments/[paymentId]/complete` | POST | Marquer paye | Paiement → completed |

**KPIs Abonnements :**

| KPI | Description |
|-----|-------------|
| Total mensuel | Cout mensuel normalise (tous abonnements actifs) |
| Total annuel | Cout annuel estime |
| Actifs | Nombre d'abonnements actifs |
| Paiements en attente | Paiements pending (a confirmer manuellement) |
| Paiements en retard | Paiements pending avec date passee |

**Structure de donnees :**

```typescript
// Abonnement
interface Subscription {
  id: string;
  supplier_id: string;
  name: string;               // Nom du service (ChatGPT, Figma...)
  amount: number;
  currency: string;
  frequency: 'monthly' | 'quarterly' | 'yearly' | 'custom';
  frequency_days?: number;    // Si custom
  start_date: string;
  next_due_date: string;
  auto_debit: boolean;
  status: 'active' | 'suspended' | 'cancelled';
  cancelled_at?: string;
  notes?: string;
}

// Paiement abonnement
interface SubscriptionPayment {
  payment_id: string;
  subscription_id: string;
  subscription_name: string;
  supplier_id: string;
  supplier_name: string;
  amount: number;
  payment_date: string;
  payment_status: 'pending' | 'scheduled' | 'completed';
  effective_status: 'completed' | 'overdue' | 'due_today' | 'scheduled';
}

// Summary
interface SubscriptionsSummary {
  total_monthly: number;
  total_yearly: number;
  active_count: number;
  pending_payments: number;
  overdue_payments: number;
}
```

**Fichiers sources**:
- Types: `lib/subscriptions/types.ts`
- Lib: `lib/subscriptions/subscriptions.ts`
- API: `app/api/subscriptions/`
- DB: `supabase/migrations/089_subscriptions.sql`

---

### Tests de la Gestion des Paiements Independants

#### Association a Posteriori des Paiements

Fonctionnalite permettant de creer des paiements (encaissements/decaissements) sans les lier immediatement a une facture, puis de les associer ulterieurement.

**Tests manuels recommandes - Paiements non associes :**

| Test | Description | Verification |
|------|-------------|--------------|
| Encaissement sans facture | Creer encaissement, ne pas selectionner de facture | Paiement cree avec payment_type='advance' |
| Decaissement sans facture | Creer decaissement fournisseur sans facture | Paiement cree avec payment_type='supplier_advance' |
| Liste non associes | Aller dans section paiements non affectes | Liste des paiements en attente d'affectation |
| Filtre par client | Filtrer les paiements non associes par client | Seuls les paiements du client affiches |

**Tests manuels recommandes - Association :**

| Test | Description | Verification |
|------|-------------|--------------|
| Associer a facture client | Selectionner paiement + facture du meme client | Paiement lie, statut facture mis a jour |
| Associer a facture fournisseur | Selectionner paiement + facture fournisseur | Paiement lie, statut facture mis a jour |
| Validation client | Essayer d'associer a facture d'un autre client | Erreur: client ne correspond pas |
| Validation montant | Associer montant > remaining | Erreur: montant superieur au reste a payer |
| Statut automatique (total) | Associer montant = remaining | Facture passe en "payee" |
| Statut automatique (partiel) | Associer montant < remaining | Facture passe en "partielle" |

**Tests manuels recommandes - Dissociation :**

| Test | Description | Verification |
|------|-------------|--------------|
| Dissocier paiement | Cliquer "Dissocier" sur paiement associe | Paiement redevient 'advance', facture maj |
| Statut apres dissociation | Dissocier le seul paiement d'une facture | Facture repasse en "envoyee" |

**Tests API :**

| Endpoint | Methode | Test | Verification |
|----------|---------|------|--------------|
| `/api/payments/unassociated` | GET | Liste non associes | Retourne paiements sans facture |
| `/api/payments/unassociated?type=client` | GET | Filtre client | Paiements clients uniquement |
| `/api/payments/unassociated?type=supplier` | GET | Filtre fournisseur | Paiements fournisseurs uniquement |
| `/api/payments/[id]/associate` | POST | Associer a facture | Lien cree, statut maj |
| `/api/payments/[id]/dissociate` | POST | Dissocier de facture | Lien supprime, statut maj |

**Tests RPC SQL :**

| Fonction | Test | Verification |
|----------|------|--------------|
| `associate_payment_to_invoice` | Appel avec IDs valides | Retourne {success: true, allocated, remaining} |
| `associate_payment_to_invoice` | Client different | Retourne {success: false, error: '...'} |
| `associate_payment_to_supplier_invoice` | Appel avec IDs valides | Retourne {success: true, allocated, remaining} |
| `dissociate_payment_from_invoice` | Paiement associe | Retourne {success: true}, paiement devient 'advance' |

**Vues SQL disponibles :**

| Vue | Description |
|-----|-------------|
| `unassociated_client_payments` | Paiements clients sans facture |
| `unassociated_supplier_payments` | Paiements fournisseurs sans facture |
| `pending_client_invoices` | Factures clients en attente (pour modal association) |
| `pending_supplier_invoices` | Factures fournisseurs en attente |

**Structure de donnees :**

```typescript
// Paiement non associe (client)
interface UnassociatedClientPayment {
  id: string;
  user_id: string;
  client_id: string;
  client_name: string;
  mission_id?: string;
  mission_title?: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  payment_type: 'advance';
  reference?: string;
  notes?: string;
  available_amount: number;
}

// Paiement non associe (fournisseur)
interface UnassociatedSupplierPayment {
  id: string;
  user_id: string;
  supplier_id: string;
  supplier_name: string;
  mission_id?: string;
  mission_title?: string;
  deal_id?: string;
  deal_name?: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  payment_type: 'supplier_advance';
  available_amount: number;
}

// Facture en attente (pour association)
interface PendingInvoice {
  id: string;
  numero: string;
  client_id: string;     // ou supplier_id
  client_name: string;   // ou supplier_name
  total_ttc: number;
  total_paid: number;
  remaining: number;
  date_echeance?: string;
}

// Payload association
interface AssociatePaymentPayload {
  invoice_id: string;        // ou supplier_invoice_id
  amount?: number;           // Optionnel, prend le minimum par defaut
}

// Resultat association
interface AssociatePaymentResult {
  success: boolean;
  error?: string;
  allocated?: number;
  remaining?: number;
  new_status?: string;
}
```

**Fichiers sources**:
- Vues SQL: `supabase/migrations/090_unassociated_payments.sql`
- Fonctions RPC: `associate_payment_to_invoice`, `associate_payment_to_supplier_invoice`, `dissociate_payment_from_invoice`
- Modal: `components/payments/PaymentAssociationModal.tsx`
- API: `app/api/payments/[id]/associate/`, `app/api/payments/[id]/dissociate/`

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
