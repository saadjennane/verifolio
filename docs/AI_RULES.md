# Règles IA - Verifolio

Ce document définit ce que l'IA **PEUT** et **NE PEUT PAS** faire dans Verifolio.

## Philosophie

> **L'IA propose, l'humain décide.**

L'IA est un assistant intelligent qui comprend le contexte, détecte les opportunités et suggère des actions. Mais elle ne prend **JAMAIS** de décisions critiques seule.

## 🟢 Ce que l'IA PEUT faire

### 1. Comprendre et analyser
- Comprendre le langage naturel dans le chat
- Analyser l'état actuel du business (deals, missions, factures)
- Détecter des transitions logiques dans le workflow
- Identifier des incohérences ou problèmes potentiels

### 2. Proposer et suggérer (avec confirmation)
- **Génération de documents** : "Mission livrée. Souhaites-tu générer la facture ?"
- **Relances clients** : "Facture envoyée il y a 10 jours. Relancer ?"
- **Priorisation** : "Deal urgent avec date proche. Prioriser ?"
- **Demandes de review** : "Mission facturée depuis 14 jours. Demander un avis client ?"
- **Brouillons de contenu** : Rédiger des emails, propositions, descriptions

### 3. Automatiser la détection
- Mission DELIVERED → suggérer facturation
- Facture envoyée > 10 jours → suggérer relance
- Deal avec date proche → suggérer badge URGENT
- Mission INVOICED > 14 jours → suggérer review request

### 4. Fournir des insights
- Résumer l'activité récente
- Suggérer des optimisations de workflow
- Alerter sur les deadlines approchantes
- Recommander des actions pour maximiser les conversions

## 🔴 Ce que l'IA NE PEUT PAS faire (sans confirmation)

### 1. Changements de statut
- ❌ Changer le statut d'un deal (DRAFT → SENT)
- ❌ Marquer une mission comme livrée
- ❌ Clôturer une mission
- ❌ Passer une facture à PAID

### 2. Actions financières
- ❌ Créer un paiement
- ❌ Modifier un montant
- ❌ Marquer une facture comme payée automatiquement

### 3. Communications externes
- ❌ Envoyer un email sans validation
- ❌ Envoyer un document (devis, facture) au client
- ❌ Relancer un client automatiquement

### 4. Modifications de données
- ❌ Supprimer une entité (deal, mission, client)
- ❌ Modifier des coordonnées clients
- ❌ Changer des montants contractuels

## 📋 Système de suggestions

### Types de suggestions
1. **Action** : Propose une action concrète (générer facture, créer review request)
2. **Reminder** : Rappel d'une action à faire (relance client, deadline approchante)
3. **Warning** : Alerte sur un problème potentiel (date proche, facture en retard)
4. **Optimization** : Suggestion d'amélioration du workflow

### Priorités
- **URGENT** : Nécessite une attention immédiate (deadline dans < 24h)
- **HIGH** : Important, à traiter rapidement (date proche, relance importante)
- **MEDIUM** : Normal, suggéré proactivement (facturation, review request)
- **LOW** : Optionnel, amélioration (optimisations, bonnes pratiques)

### Cycle de vie d'une suggestion

```
PENDING → ACCEPTED → EXECUTED
       ↘ DISMISSED
```

1. **PENDING** : Suggestion active, en attente d'action utilisateur
2. **ACCEPTED** : Utilisateur a accepté, prêt à exécuter
3. **EXECUTED** : Action complétée
4. **DISMISSED** : Utilisateur a rejeté la suggestion

## 🔧 Fonctions de détection automatique

### `detect_invoice_suggestions()`
- **Déclencheur** : Mission DELIVERED depuis > 7 jours
- **Suggestion** : "Générer la facture pour cette mission ?"
- **Priorité** : MEDIUM

### `detect_invoice_reminder_suggestions()`
- **Déclencheur** : Facture envoyée depuis > 10 jours
- **Suggestion** : "Relancer le client pour cette facture ?"
- **Priorité** : MEDIUM

### `detect_urgent_deal_suggestions()`
- **Déclencheur** : Deal avec date de clôture dans < 7 jours
- **Suggestion** : "Marquer ce deal comme URGENT ?"
- **Priorité** : HIGH

### `detect_review_request_suggestions()`
- **Déclencheur** : Mission INVOICED depuis > 14 jours
- **Suggestion** : "Demander un avis client pour cette mission ?"
- **Priorité** : LOW

## 📊 API Endpoints

### Liste des suggestions
```
GET /api/ai/suggestions
Query params: status, suggestion_type, priority, entity_type, entity_id
```

### Accepter une suggestion
```
POST /api/ai/suggestions/:id/accept
```

### Rejeter une suggestion
```
POST /api/ai/suggestions/:id/dismiss
```

### Statistiques
```
GET /api/ai/suggestions/stats
Retourne: { total, urgent, high, medium, low }
```

### Déclencher la détection
```
POST /api/ai/suggestions/detect
```

## 🎯 Exemples d'usage

### Exemple 1 : Mission livrée
```typescript
// Détection automatique après 7 jours
const suggestion = {
  type: 'action',
  priority: 'medium',
  title: 'Mission livrée - Facturation suggérée',
  description: 'La mission "Spectacle magie Close-up" a été livrée il y a 8 jours. Souhaites-tu générer la facture ?',
  suggested_action: {
    type: 'generate_invoice',
    mission_id: 'uuid...'
  }
}
```

### Exemple 2 : Facture en retard
```typescript
const suggestion = {
  type: 'reminder',
  priority: 'medium',
  title: 'Relance client suggérée',
  description: 'La facture FAC-2024-001 a été envoyée il y a 12 jours. Souhaites-tu relancer le client ?',
  suggested_action: {
    type: 'send_reminder_email',
    invoice_id: 'uuid...'
  }
}
```

### Exemple 3 : Deal urgent
```typescript
const suggestion = {
  type: 'warning',
  priority: 'high',
  title: 'Deal urgent - Date de clôture proche',
  description: 'Le deal "Mariage Sarah & Tom" a une date de clôture dans 3 jours. Souhaites-tu le marquer comme URGENT ?',
  suggested_action: {
    type: 'add_urgent_badge',
    deal_id: 'uuid...'
  }
}
```

## 🔐 Sécurité et traçabilité

Toutes les actions déclenchées par l'IA sont tracées dans `ai_action_logs`:
- Date et heure
- Type d'action
- Entité concernée
- Confirmation utilisateur (oui/non)
- Résultat (success/failed/cancelled)
- Contexte et données d'entrée/sortie

Ceci permet:
- D'auditer toutes les actions IA
- De comprendre ce qui a été fait et pourquoi
- De détecter des patterns d'usage
- D'améliorer les suggestions au fil du temps

## 🚀 Future évolutions

### Phase 1 (actuelle) : Suggestions proactives
- Détection automatique
- Suggestions avec confirmation
- Actions manuelles

### Phase 2 : Chat intelligent
- Compréhension du langage naturel
- Génération de contenu personnalisé
- Navigation conversationnelle

### Phase 3 : Automatisations conditionnelles
- "Si facture payée, alors créer review request"
- "Si deal accepté, alors créer mission"
- Workflows personnalisables

### Phase 4 : Prédictions et insights
- Prédiction de conversion de deals
- Optimisation des relances
- Recommandations basées sur l'historique
