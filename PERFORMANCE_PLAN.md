# Plan d'Optimisation Performance - Verifolio

## Phase 1: Quick Wins (Impact élevé, effort faible)
**Durée estimée: 1-2 jours**

### 1.1 Augmenter le debounce autosave
- [x] `components/verifolio/VerifolioActivities.tsx` - Passé de 500ms à 2000ms
- [x] Ajouté `maxWait: 5000ms` pour garantir la sauvegarde

### 1.2 Ajouter memo() aux composants enfants
- [x] `components/verifolio/VerifolioActivities.tsx` - ActivityCard wrappé avec memo()

### 1.3 Optimiser les images Next.js
- [x] Ajouté `sizes`, `quality={85}` aux images ActivityCard

### 1.4 Ajouter headers de cache aux API publiques
- [x] `app/api/verifolio/[username]/route.ts` - Ajouté Cache-Control (1h, stale-while-revalidate 24h)

---

## Phase 2: Requêtes Base de Données (Impact critique)
**Durée estimée: 2-3 jours** ✅ COMPLÉTÉ

### 2.1 Corriger N+1 dans endpoint Verifolio public
- [x] `app/api/verifolio/[username]/route.ts` - Requête unique avec joins Supabase
- [x] Remplacé Promise.all + map (N+1) par une seule requête avec joins

### 2.2 Paralléliser les requêtes séquentielles
- [x] `components/documents/DocumentEditor.tsx` - Promise.all pour chargement initial (company, fields, clients)
- [x] `components/documents/DocumentEditor.tsx` - Promise.all pour chargement client fields

### 2.3 Ajouter index Supabase manquants
- [x] Créé migration `082_performance_indexes.sql` avec:
  - `idx_reviews_mission_id`
  - `idx_reviews_mission_published`
  - `idx_verifolio_review_selections_profile_id`
  - `idx_verifolio_activity_medias_activity_id`
  - `idx_custom_field_values_entity`
  - `idx_custom_field_values_user_entity`
  - `idx_missions_user_verifolio`
  - `idx_review_mission_media_mission_public`
  - `idx_clients_user_active`
  - `idx_deals_user_status`
  - `idx_quotes_user_status`
  - `idx_invoices_user_status`

---

## Phase 3: Code Splitting & Bundle (Impact élevé)
**Durée estimée: 1-2 jours** ✅ COMPLÉTÉ

### 3.1 Dynamic imports pour éditeurs lourds
- [x] `components/layout/TabContent.tsx` - Ajouté `ssr: false` pour:
  - ProposalEditorTab
  - BriefTemplateEditorTab
  - QuoteFormTab
  - InvoiceFormTab

### 3.2 Lazy load des extensions Tiptap
- [x] `next.config.ts` - Ajouté `optimizePackageImports` pour @tiptap/*

### 3.3 Externaliser Puppeteer/OpenAI du bundle client
- [x] `next.config.ts` - Ajouté `serverExternalPackages` pour puppeteer, puppeteer-core, openai
- [x] Configuré Turbopack pour Next.js 16+

---

## Phase 4: State Management (Impact moyen)
**Durée estimée: 1 jour** ✅ COMPLÉTÉ

### 4.1 Créer store Zustand pour VerifolioEditor
- [x] `lib/stores/verifolio-editor-store.ts` - Store créé avec:
  - État centralisé: profile, activities, reviews, UI state
  - Actions: loadData, createProfile, togglePublish, updateTheme
  - Requêtes parallèles pour activities et reviews

### 4.2 Ajouter React Query pour data fetching
- [x] Installé `@tanstack/react-query`
- [x] `lib/providers/query-provider.tsx` - QueryClient configuré avec cache 5min
- [x] `app/layout.tsx` - QueryProvider ajouté
- [x] `lib/hooks/useVerifolioData.ts` - Hooks créés:
  - useVerifolioProfile, useVerifolioActivities, useVerifolioReviews
  - useCreateProfile, useUpdateProfile, useTogglePublish, useUpdateTheme
  - useCreateActivity, useUpdateActivity, useDeleteActivity
- [x] `lib/hooks/useCompanyData.ts` - Hooks créés:
  - useCompany, useUpdateCompany, useUploadLogo, useDeleteLogo

### Bonus: Corrections
- [x] `app/(dashboard)/settings/page.tsx` - Ajouté Suspense wrapper pour useSearchParams

---

## Phase 5: Optimisations Avancées (Nice to have)
**Durée estimée: 2-3 jours**

### 5.1 Virtualisation pour grandes listes
- [ ] `react-window` v2 incompatible avec React 19 (attendre version stable)
- [ ] Alternative: `@tanstack/react-virtual` à évaluer

### 5.2 Service worker pour cache offline
- [ ] Configurer next-pwa (nécessite configuration PWA complète)
- [ ] Cache des assets statiques

### 5.3 Migrer PDF vers service externe
- [ ] Évaluer: Browserless.io, PDFShift, ou AWS Lambda
- [ ] Supprimer Puppeteer des dépendances de production

---

## Ordre de Priorité Recommandé

| Priorité | Phase | Tâche | Impact | Effort |
|----------|-------|-------|--------|--------|
| 1 | 2.1 | Corriger N+1 Verifolio | Critique | Moyen |
| 2 | 2.2 | Paralléliser DocumentEditor | Critique | Faible |
| 3 | 1.1 | Augmenter debounce | Haut | Faible |
| 4 | 1.2 | Ajouter memo() | Haut | Faible |
| 5 | 1.4 | Cache headers API | Haut | Faible |
| 6 | 2.3 | Index Supabase | Haut | Faible |
| 7 | 3.1 | Dynamic imports | Moyen | Faible |
| 8 | 1.3 | Optimiser images | Moyen | Faible |
| 9 | 4.1 | Store Zustand | Moyen | Moyen |
| 10 | 4.2 | React Query | Moyen | Moyen |
| 11 | 5.3 | Service PDF externe | Haut | Élevé |

---

## Métriques à Suivre

- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1
- **TTI (Time to Interactive)**: < 3.5s
- **Bundle size**: Réduire de 20%
- **API response time**: < 200ms pour endpoints publics

---

## Notes

- Commencer par Phase 1 + 2.1 + 2.2 pour impact maximum
- Tester chaque changement avec Lighthouse avant/après
- Monitorer les métriques en production avec Vercel Analytics
