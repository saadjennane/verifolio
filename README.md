# Verifolio - POC Facturation avec Chat

POC d'un assistant conversationnel pour aider les micro-entrepreneurs à créer et gérer leurs devis et factures.

## Setup

### 1. Prérequis

- Node.js 18+
- Compte Supabase (gratuit)
- Clé API OpenAI (optionnel, mode mock disponible)

### 2. Supabase

1. Créer un projet sur [supabase.com](https://supabase.com)
2. Aller dans **SQL Editor**
3. Copier le contenu de `supabase/migrations/001_initial_schema.sql`
4. Exécuter le script
5. Récupérer les clés dans **Settings > API** :
   - Project URL
   - anon public key

### 3. Variables d'environnement

Créer un fichier `.env.local` à la racine :

```bash
# Supabase (requis)
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-clé-anon

# OpenAI (optionnel - mode mock si absent)
OPENAI_API_KEY=sk-votre-clé

# Email - Resend (optionnel - mock si absent)
RESEND_API_KEY=re_votre-clé
EMAIL_FROM=factures@votredomaine.com
```

### 4. Installation

```bash
npm install
npm run dev
```

L'app est accessible sur http://localhost:3000

## Fonctionnalités

### Chat (interface principale)
- Créer des clients, devis et factures par conversation
- Lister et rechercher des documents
- Convertir un devis en facture
- Marquer une facture comme payée
- Envoyer des documents par email (avec confirmation)

### Formulaires manuels
- Création/édition de clients
- Création/édition de devis avec lignes
- Création/édition de factures avec lignes

### Documents
- Génération PDF (un template simple)
- Envoi par email (Resend ou mock)
- Statuts : brouillon, envoyé, payé

### Mini-CRM
- Liste clients avec soldes (facturé/payé/restant)
- Fiche client avec indicateurs

## Architecture

```
app/
├── (auth)/           # Pages login/signup
├── (dashboard)/      # Pages protégées
│   ├── clients/
│   ├── quotes/
│   └── invoices/
└── api/
    ├── chat/         # Endpoint LLM
    ├── pdf/          # Génération PDF
    └── email/        # Envoi email

components/
├── chat/             # Interface chat
├── forms/            # Formulaires CRUD
├── documents/        # Preview + actions
├── layout/           # Sidebar
└── ui/               # Composants de base

lib/
├── supabase/         # Clients + types
├── llm/              # Prompt + tools + router
├── pdf/              # Template + génération
└── email/            # Envoi + template
```

## LLM Tools disponibles

- `create_client` - Créer un client
- `list_clients` - Lister les clients
- `create_quote` - Créer un devis
- `list_quotes` - Lister les devis
- `create_invoice` - Créer une facture
- `list_invoices` - Lister les factures
- `convert_quote_to_invoice` - Convertir devis → facture
- `mark_invoice_paid` - Marquer une facture payée
- `send_email` - Envoyer un document (avec confirmation)

## Scope OUT (Phase 2)

Les fonctionnalités suivantes sont hors scope pour ce POC :
- WhatsApp, notifications
- Connexion Gmail/Outlook
- Relances automatiques
- Multi-templates
- Paiement en ligne
- Workflow fiscal (verrouillage)
- Multi-entreprises, multi-utilisateurs
- Analytics avancés
