# Plan de Test - Verifolio

Ce document contient les cas de test pour chaque fonctionnalité de l'application.

---

## 1. Gestion des Clients

### 1.1 Création de client
- [ ] Créer un client particulier avec tous les champs
- [ ] Créer un client entreprise avec SIRET/TVA
- [ ] Vérifier la validation des champs obligatoires (nom)
- [ ] Vérifier le format email
- [ ] Vérifier le format téléphone

### 1.2 Édition de client
- [ ] Modifier le nom du client
- [ ] Modifier l'adresse complète
- [ ] Modifier l'email et téléphone
- [ ] Ajouter/modifier des champs personnalisés

### 1.3 Consultation
- [ ] Afficher la liste des clients
- [ ] Rechercher un client par nom
- [ ] Filtrer par type (particulier/entreprise)
- [ ] Voir le détail d'un client
- [ ] Voir le solde client (facturé, payé, restant)

### 1.4 Suppression
- [ ] Supprimer un client (soft delete)
- [ ] Vérifier que le client apparaît dans la corbeille
- [ ] Restaurer un client depuis la corbeille
- [ ] Supprimer définitivement un client

### 1.5 Comportement LLM
- [ ] **Chat**: "Crée un client Jean Dupont" → Appelle `create_client` avec le nom
- [ ] **Chat**: "Crée un client entreprise ACME avec SIRET 12345678901234" → Crée client type entreprise
- [ ] **Chat**: "Modifie l'email du client X" → Appelle `update_client`
- [ ] **Chat**: "Liste mes clients" → Appelle `list_clients`
- [ ] **Chat**: "Supprime le client X" → Appelle `delete_client` (soft delete)
- [ ] **Contexte**: Sur la page client, le LLM a accès aux infos du client courant
- [ ] **Validation**: Le LLM refuse de créer un client sans nom

---

## 2. Gestion des Contacts

### 2.1 Création
- [ ] Créer un contact lié à un client
- [ ] Remplir tous les champs (nom, email, téléphone, fonction)
- [ ] Assigner des responsabilités (facturation, commercial, opérations, direction)
- [ ] Définir comme contact principal

### 2.2 Édition
- [ ] Modifier les informations du contact
- [ ] Changer les responsabilités
- [ ] Changer le statut principal

### 2.3 Consultation
- [ ] Voir la liste des contacts
- [ ] Filtrer par client
- [ ] Voir le détail d'un contact

### 2.4 Suppression
- [ ] Supprimer un contact
- [ ] Vérifier les liens avec deals/missions

### 2.5 Comportement LLM
- [ ] **Chat**: "Ajoute un contact Marie Martin pour ACME" → Appelle `create_contact`
- [ ] **Chat**: "Le contact principal d'ACME c'est Pierre" → Met à jour `is_primary`
- [ ] **Chat**: "Ajoute le rôle facturation à Marie" → Appelle `update_contact`
- [ ] **Contexte**: Sur la page client, le LLM peut lister les contacts associés

---

## 3. Gestion des Deals (Opportunités)

### 3.1 Création
- [ ] Créer un deal avec titre et montant estimé
- [ ] Lier à un client existant
- [ ] Ajouter des contacts au deal
- [ ] Ajouter des tags
- [ ] Ajouter des badges

### 3.2 Workflow de statut
- [ ] Passer de "Nouveau" à "Brouillon"
- [ ] Passer de "Brouillon" à "Envoyé"
- [ ] Marquer comme "Gagné"
- [ ] Marquer comme "Perdu"
- [ ] Archiver un deal

### 3.3 Documents liés
- [ ] Créer un devis depuis le deal
- [ ] Créer une proposition depuis le deal
- [ ] Vérifier les documents requis avant création de mission
- [ ] Créer une mission depuis le deal gagné

### 3.4 Consultation
- [ ] Voir la liste des deals
- [ ] Filtrer par statut
- [ ] Voir le détail avec timeline

### 3.5 Comportement LLM
- [ ] **Chat**: "Crée un deal pour ACME de 5000€" → Appelle `create_deal`
- [ ] **Chat**: "Marque le deal X comme gagné" → Appelle `update_deal_status`
- [ ] **Chat**: "Ajoute le tag urgent au deal" → Appelle `add_deal_tag`
- [ ] **Chat**: "Crée une mission depuis ce deal" → Appelle `create_mission_from_deal`
- [ ] **Contexte**: Sur la page deal, le LLM connaît le statut et montant
- [ ] **Suggestions IA**: Détection automatique des deals urgents à relancer
- [ ] **Validation**: Le LLM refuse de créer une mission si le deal n'est pas gagné

---

## 4. Devis

### 4.1 Création
- [ ] Créer un devis vierge
- [ ] Créer un devis depuis un deal
- [ ] Ajouter des lignes de prestation
- [ ] Calculer les totaux HT/TVA/TTC
- [ ] Définir les conditions de paiement
- [ ] Définir la date de validité

### 4.2 Lignes de devis
- [ ] Ajouter une ligne avec description, quantité, prix unitaire
- [ ] Modifier le taux de TVA par ligne
- [ ] Réordonner les lignes
- [ ] Supprimer une ligne
- [ ] Vérifier le calcul automatique des totaux

### 4.3 Workflow
- [ ] Enregistrer en brouillon
- [ ] Envoyer le devis (génère le PDF)
- [ ] Marquer comme accepté
- [ ] Marquer comme refusé
- [ ] Annuler un devis

### 4.4 PDF
- [ ] Générer le PDF
- [ ] Vérifier l'affichage du logo
- [ ] Vérifier les informations client
- [ ] Vérifier les totaux
- [ ] Accéder au PDF via lien public

### 4.5 Comportement LLM
- [ ] **Chat**: "Crée un devis pour ACME" → Appelle `create_quote`
- [ ] **Chat**: "Ajoute une ligne développement web 5 jours à 500€" → Appelle `add_quote_line`
- [ ] **Chat**: "Envoie le devis au client" → Appelle `send_quote`
- [ ] **Chat**: "Le devis a été accepté" → Appelle `update_quote_status`
- [ ] **Contexte**: Sur la page devis, le LLM connaît les lignes et totaux
- [ ] **Devise**: Le LLM utilise la devise configurée (EUR, USD, etc.)
- [ ] **Calcul**: Le LLM calcule correctement HT/TVA/TTC

---

## 5. Factures

### 5.1 Création
- [ ] Créer une facture vierge
- [ ] Créer une facture depuis un devis
- [ ] Créer une facture pour une mission
- [ ] Ajouter des lignes de prestation
- [ ] Définir les conditions de paiement

### 5.2 Lignes de facture
- [ ] Ajouter/modifier/supprimer des lignes
- [ ] Vérifier les calculs HT/TVA/TTC
- [ ] Appliquer différents taux de TVA

### 5.3 Workflow
- [ ] Enregistrer en brouillon
- [ ] Envoyer la facture
- [ ] Marquer comme payée
- [ ] Annuler une facture

### 5.4 PDF
- [ ] Générer le PDF
- [ ] Vérifier la numérotation automatique
- [ ] Accéder au PDF via lien public

### 5.5 Comportement LLM
- [ ] **Chat**: "Crée une facture depuis le devis X" → Appelle `create_invoice_from_quote`
- [ ] **Chat**: "La facture a été payée" → Appelle `update_invoice_status`
- [ ] **Chat**: "Envoie un rappel pour la facture en retard" → Appelle `send_invoice_reminder`
- [ ] **Suggestions IA**: Détection automatique des factures en retard de paiement
- [ ] **Suggestions IA**: Rappel des factures à échéance proche
- [ ] **Contexte**: Sur la page facture, le LLM connaît le statut de paiement

---

## 6. Missions

### 6.1 Création
- [ ] Créer une mission depuis un deal
- [ ] Créer une mission standalone
- [ ] Définir les dates (début, livraison)
- [ ] Ajouter une description/contexte
- [ ] Assigner des contacts

### 6.2 Workflow
- [ ] Passer en "Livré"
- [ ] Passer en "À facturer"
- [ ] Passer en "Facturé"
- [ ] Passer en "Payé"
- [ ] Clôturer la mission
- [ ] Annuler la mission

### 6.3 Facturation
- [ ] Lier des factures à la mission
- [ ] Vérifier le montant total facturé
- [ ] Créer une facture depuis la mission

### 6.4 Verifolio
- [ ] Marquer comme visible sur Verifolio
- [ ] Masquer de Verifolio

### 6.5 Comportement LLM
- [ ] **Chat**: "Crée une mission pour le deal X" → Appelle `create_mission_from_deal`
- [ ] **Chat**: "La mission est livrée" → Appelle `update_mission_status`
- [ ] **Chat**: "Facture la mission" → Crée une facture liée
- [ ] **Chat**: "Affiche cette mission sur mon Verifolio" → Met `visible_on_verifolio = true`
- [ ] **Contexte**: Sur la page mission, le LLM connaît le contexte et les factures liées

---

## 7. Propositions Commerciales

### 7.1 Création
- [ ] Créer une proposition vierge
- [ ] Créer depuis un template
- [ ] Créer depuis un deal
- [ ] Choisir un preset de structure

### 7.2 Éditeur de pages
- [ ] Ajouter une page
- [ ] Renommer une page
- [ ] Réordonner les pages
- [ ] Supprimer une page
- [ ] Masquer une page

### 7.3 Contenu
- [ ] Ajouter du texte avec l'éditeur Tiptap
- [ ] Ajouter des images
- [ ] Ajouter des tableaux
- [ ] Ajouter des colonnes
- [ ] Utiliser les variables dynamiques

### 7.4 Design
- [ ] Changer la couleur primaire
- [ ] Changer la couleur d'accent
- [ ] Changer la police
- [ ] Activer/désactiver les options visuelles

### 7.5 Workflow
- [ ] Enregistrer en brouillon
- [ ] Envoyer (génère le lien public)
- [ ] Voir la preview
- [ ] Accéder au lien public
- [ ] Accepter via le lien public
- [ ] Refuser via le lien public

### 7.6 Comportement LLM - Génération de structure IA
- [ ] **Génération**: Entrer un mini-prompt (ex: "Proposition pour refonte site e-commerce")
- [ ] **Validation prompt**: Le prompt doit avoir au moins 5 caractères
- [ ] **Pages générées**: L'IA génère une liste de pages pertinentes
- [ ] **Couverture obligatoire**: La page "Couverture" est toujours ajoutée en premier
- [ ] **Catalogue de pages**: L'IA ne génère que des pages du catalogue (25 types)
- [ ] **Filtrage**: Les pages invalides sont automatiquement filtrées
- [ ] **Format JSON**: L'IA retourne un JSON valide avec `{ pages: [...] }`
- [ ] **Gestion erreurs**: Message d'erreur si l'API OpenAI échoue
- [ ] **Timeout**: Timeout de 60s pour la génération

### 7.7 Comportement LLM - Chat
- [ ] **Chat**: "Crée une proposition pour ACME" → Appelle `create_proposal`
- [ ] **Chat**: "Envoie la proposition" → Génère le token public
- [ ] **Contexte**: Sur la page proposition, le LLM connaît les pages et le statut

---

## 8. Briefs (Questionnaires Client)

### 8.1 Templates
- [ ] Créer un template de brief
- [ ] Ajouter des questions de type titre/description
- [ ] Ajouter des questions texte court/long
- [ ] Ajouter des questions sélection (dropdown, radio, checkbox)
- [ ] Ajouter des questions date (simple, plage, multiple)
- [ ] Ajouter des questions notation
- [ ] Ajouter des questions adresse
- [ ] Réordonner les questions
- [ ] Dupliquer un template

### 8.2 Création de brief
- [ ] Créer un brief depuis un template
- [ ] Personnaliser le thème
- [ ] Afficher/masquer le logo
- [ ] Envoyer le brief au client

### 8.3 Réponses
- [ ] Accéder au brief via lien public
- [ ] Répondre à toutes les questions
- [ ] Soumettre le brief
- [ ] Voir les réponses côté admin

### 8.4 Comportement LLM - Génération de structure IA
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

### 8.5 Comportement LLM - Chat
- [ ] **Chat**: "Crée un brief pour le projet X" → Appelle `create_brief`
- [ ] **Chat**: "Envoie le brief au client" → Génère le lien et envoie l'email

---

## 9. Reviews (Témoignages)

### 9.1 Demande de review
- [ ] Créer une demande de review pour une facture
- [ ] Ajouter plusieurs destinataires
- [ ] Envoyer la demande par email
- [ ] Envoyer un rappel

### 9.2 Soumission de review
- [ ] Accéder au formulaire via lien public
- [ ] Donner une note globale
- [ ] Remplir les critères détaillés (réactivité, qualité, etc.)
- [ ] Ajouter un commentaire
- [ ] Joindre des médias (images/vidéos)
- [ ] Vérifier l'email
- [ ] Soumettre la review

### 9.3 Gestion des reviews
- [ ] Voir la liste des reviews reçues
- [ ] Publier une review
- [ ] Dépublier une review
- [ ] Filtrer par note
- [ ] Supprimer une review

### 9.4 Templates de review
- [ ] Créer un template avec critères personnalisés
- [ ] Définir les notes à afficher
- [ ] Configurer l'affichage des commentaires

### 9.5 Comportement LLM
- [ ] **Chat**: "Demande une review pour la facture X" → Appelle `create_review_request`
- [ ] **Chat**: "Envoie un rappel pour les reviews en attente" → Appelle `send_review_reminder`
- [ ] **Chat**: "Publie la review de Marie" → Appelle `publish_review`
- [ ] **Suggestions IA**: Détection automatique des factures payées sans review demandée
- [ ] **Suggestions IA**: Suggestion de demander une review après paiement

---

## 10. Verifolio (Portfolio Public)

### 10.1 Profil
- [ ] Créer le profil Verifolio
- [ ] Modifier le nom affiché
- [ ] Modifier le titre professionnel
- [ ] Modifier la bio
- [ ] Uploader une photo de profil
- [ ] Modifier le slug URL

### 10.2 Design
- [ ] Changer le thème de couleur
- [ ] Afficher/masquer le logo entreprise

### 10.3 Sections
- [ ] Activer/désactiver les activités
- [ ] Activer/désactiver les témoignages
- [ ] Définir la note minimale pour afficher les reviews

### 10.4 CTAs (Call to Action)
- [ ] Ajouter un CTA principal avec label et URL
- [ ] Ajouter un CTA secondaire
- [ ] Choisir l'icône du CTA (email, portfolio, calendrier, etc.)
- [ ] Supprimer un CTA

### 10.5 Activités
- [ ] Ajouter une activité
- [ ] Modifier le titre et la description
- [ ] Uploader une image
- [ ] Ajouter des médias (galerie)
- [ ] Activer le modal de détails
- [ ] Réordonner les activités
- [ ] Masquer une activité
- [ ] Supprimer une activité

### 10.6 Publication
- [ ] Publier le Verifolio
- [ ] Dépublier le Verifolio
- [ ] Accéder au lien public
- [ ] Vérifier l'affichage mobile

### 10.7 Comportement LLM
- [ ] **Chat**: "Publie mon Verifolio" → Met `is_published = true`
- [ ] **Chat**: "Change le thème en bleu" → Met à jour `theme_color`
- [ ] **Chat**: "Ajoute une activité Développement Web" → Crée une activité
- [ ] **Contexte**: Le LLM connaît l'état de publication et les sections actives

---

## 11. Paramètres

### 11.1 Profil utilisateur
- [ ] Modifier le prénom et nom
- [ ] Modifier le téléphone
- [ ] Enregistrer les modifications

### 11.2 Entreprise
- [ ] Modifier le nom de l'entreprise
- [ ] Uploader le logo
- [ ] Modifier l'adresse
- [ ] Modifier l'email et téléphone
- [ ] Définir la devise par défaut
- [ ] Définir le taux de TVA par défaut
- [ ] Configurer le format des numéros de factures
- [ ] Configurer le format des numéros de devis

### 11.3 Emails
- [ ] Configurer les templates d'email
- [ ] Tester l'envoi d'email

### 11.4 Champs personnalisés
- [ ] Créer un champ pour les clients
- [ ] Activer/désactiver un champ
- [ ] Supprimer un champ

### 11.5 Modèle de document
- [ ] Changer la couleur primaire
- [ ] Changer la couleur d'accent
- [ ] Changer la police
- [ ] Configurer les sections à afficher
- [ ] Prévisualiser le template

### 11.6 Templates de review
- [ ] Créer un template de review
- [ ] Définir les critères de notation
- [ ] Supprimer un template

### 11.7 Navigation
- [ ] Activer/désactiver des éléments du menu
- [ ] Réordonner le menu

### 11.8 Corbeille
- [ ] Voir les éléments supprimés
- [ ] Restaurer un élément
- [ ] Supprimer définitivement

### 11.9 Comportement LLM
- [ ] **Devise**: Le LLM utilise la devise configurée dans les calculs
- [ ] **TVA**: Le LLM applique le taux de TVA par défaut
- [ ] **Contexte entreprise**: Le LLM connaît le nom de l'entreprise pour les documents

---

## 12. Fournisseurs et Dépenses

### 12.1 Fournisseurs
- [ ] Créer un fournisseur
- [ ] Modifier les informations
- [ ] Supprimer un fournisseur

### 12.2 Consultations
- [ ] Créer une consultation (demande de devis)
- [ ] Ajouter des devis fournisseurs
- [ ] Uploader un document de devis
- [ ] Voir l'extraction OCR
- [ ] Accepter/refuser un devis
- [ ] Clôturer la consultation

### 12.3 Factures fournisseurs
- [ ] Créer une facture fournisseur
- [ ] Uploader le document
- [ ] Lier à un fournisseur

### 12.4 Dépenses
- [ ] Créer une catégorie de dépense
- [ ] Créer une dépense
- [ ] Uploader un justificatif
- [ ] Lier à un fournisseur
- [ ] Filtrer par catégorie

### 12.5 Comportement LLM - OCR/Vision (GPT-4o)
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

### 12.6 Comportement LLM - Chat
- [ ] **Chat**: "Crée un fournisseur" → Appelle `create_supplier`
- [ ] **Chat**: "Ajoute cette dépense" → Appelle `create_expense`

---

## 13. Tâches

### 13.1 Création
- [ ] Créer une tâche manuelle
- [ ] Créer une tâche liée à un deal
- [ ] Créer une tâche liée à une mission
- [ ] Définir une date d'échéance

### 13.2 Workflow
- [ ] Marquer comme en attente (avec raison)
- [ ] Marquer comme terminée
- [ ] Rouvrir une tâche terminée

### 13.3 Consultation
- [ ] Filtrer par statut
- [ ] Filtrer par entité liée
- [ ] Voir les tâches en retard

### 13.4 Comportement LLM
- [ ] **Chat**: "Crée une tâche rappeler ACME demain" → Appelle `create_task`
- [ ] **Chat**: "Marque la tâche X comme terminée" → Appelle `complete_task`
- [ ] **Chat**: "Quelles sont mes tâches en retard?" → Appelle `list_tasks` avec filtre

---

## 14. Interface et Navigation

### 14.1 Onglets
- [ ] Ouvrir plusieurs onglets simultanément
- [ ] Basculer entre les onglets
- [ ] Fermer un onglet
- [ ] Vérifier la persistence des onglets

### 14.2 Sidebar
- [ ] Voir le widget de complétion des paramètres
- [ ] Naviguer vers les différentes sections
- [ ] Replier/déplier la sidebar

### 14.3 Responsive
- [ ] Vérifier l'affichage sur mobile
- [ ] Vérifier l'affichage tablette
- [ ] Vérifier l'affichage desktop

---

## 15. Pages Publiques

### 15.1 Proposition publique
- [ ] Accéder via le token
- [ ] Voir toutes les pages
- [ ] Accepter la proposition
- [ ] Refuser la proposition

### 15.2 Brief public
- [ ] Accéder via le token
- [ ] Répondre aux questions
- [ ] Soumettre les réponses

### 15.3 Verifolio public
- [ ] Accéder via le slug
- [ ] Voir les activités
- [ ] Voir les témoignages
- [ ] Cliquer sur les CTAs
- [ ] Ouvrir les détails d'activité

### 15.4 PDFs publics
- [ ] Accéder au devis via token
- [ ] Accéder à la facture via token

---

## 16. Performance

### 16.1 Temps de chargement
- [ ] Dashboard < 2s
- [ ] Liste de clients < 1s
- [ ] Éditeur de proposition < 3s
- [ ] PDF génération < 5s

### 16.2 Limites
- [ ] Tester avec 100+ clients
- [ ] Tester avec 50+ lignes de devis
- [ ] Tester avec 10+ pages de proposition

### 16.3 Performance LLM
- [ ] **Timeout chat**: 60 secondes maximum pour une réponse
- [ ] **Timeout structure IA**: 60 secondes pour génération de pages
- [ ] **Timeout OCR**: Temps raisonnable pour extraction d'image

---

## 17. Sécurité

### 17.1 Authentification
- [ ] Connexion avec email/mot de passe
- [ ] Déconnexion
- [ ] Session expirée

### 17.2 Autorisation
- [ ] Ne pas accéder aux données d'un autre utilisateur
- [ ] Liens publics fonctionnent sans connexion
- [ ] Actions sensibles protégées

### 17.3 Sécurité LLM
- [ ] **Isolation données**: Le LLM n'accède qu'aux données de l'utilisateur connecté
- [ ] **Modes de chat**: Respect des permissions selon le mode (AUTO, CONFIRM, READ_ONLY)
- [ ] **Validation outils**: Le LLM ne peut pas appeler des outils non autorisés
- [ ] **Clé API**: OpenAI API key stockée côté serveur uniquement

---

## 18. Système de Suggestions IA

### 18.1 Types de suggestions
- [ ] **Action**: Suggestions d'actions à effectuer
- [ ] **Reminder**: Rappels automatiques
- [ ] **Warning**: Alertes importantes
- [ ] **Optimization**: Suggestions d'amélioration

### 18.2 Priorités
- [ ] **Low**: Suggestions peu urgentes
- [ ] **Medium**: Suggestions normales
- [ ] **High**: Suggestions importantes
- [ ] **Urgent**: Suggestions critiques

### 18.3 Détection automatique
- [ ] **Factures en retard**: Détection via `detect_invoice_suggestions()`
- [ ] **Rappels factures**: Détection via `detect_invoice_reminder_suggestions()`
- [ ] **Deals urgents**: Détection via `detect_urgent_deal_suggestions()`
- [ ] **Demandes review**: Détection via `detect_review_request_suggestions()`

### 18.4 Workflow suggestions
- [ ] Affichage des suggestions dans le chat
- [ ] Accepter une suggestion → Exécute l'action
- [ ] Rejeter une suggestion → Masque la suggestion
- [ ] Statistiques des suggestions acceptées/rejetées

### 18.5 Tests suggestions
- [ ] **Facture impayée > 30j**: Génère suggestion "warning" urgente
- [ ] **Facture à échéance < 7j**: Génère suggestion "reminder"
- [ ] **Deal sans activité > 14j**: Génère suggestion "action"
- [ ] **Mission payée sans review**: Génère suggestion "action"

---

## 19. Assistant Chat LLM

### 19.1 Modes de fonctionnement
- [ ] **AUTO**: Exécute les actions automatiquement
- [ ] **CONFIRM**: Demande confirmation avant chaque action
- [ ] **READ_ONLY**: Répond aux questions sans modifier les données
- [ ] **DISABLED**: Chat désactivé

### 19.2 Contexte intelligent
- [ ] **Page courante**: Le LLM sait sur quelle page l'utilisateur se trouve
- [ ] **Entité active**: Le LLM connaît le client/deal/mission courant
- [ ] **Statuts**: Le LLM connaît les statuts des entités
- [ ] **Devise**: Le LLM utilise la devise configurée

### 19.3 Outils disponibles (20+)
- [ ] `create_client`, `update_client`, `delete_client`, `list_clients`
- [ ] `create_contact`, `update_contact`
- [ ] `create_deal`, `update_deal`, `update_deal_status`, `add_deal_tag`
- [ ] `create_quote`, `add_quote_line`, `send_quote`, `update_quote_status`
- [ ] `create_invoice`, `create_invoice_from_quote`, `send_invoice`, `update_invoice_status`
- [ ] `create_mission`, `create_mission_from_deal`, `update_mission_status`
- [ ] `create_proposal`, `create_brief`, `create_review_request`
- [ ] `create_task`, `complete_task`, `list_tasks`

### 19.4 Tests du chat
- [ ] **Conversation naturelle**: "Bonjour, comment vas-tu?"
- [ ] **Création simple**: "Crée un client Test"
- [ ] **Création complexe**: "Crée un devis de 3 lignes pour ACME"
- [ ] **Workflow**: "Crée un deal, puis un devis, puis envoie-le"
- [ ] **Questions**: "Quel est le montant total des factures impayées?"
- [ ] **Erreurs**: "Crée un client" (sans nom) → Demande le nom
- [ ] **Permissions**: En mode READ_ONLY, refuse de créer des entités

### 19.5 Retry et fallback
- [ ] **Tool calling**: Si le LLM suggère mais n'exécute pas, retry automatique
- [ ] **Timeout**: Gestion du timeout 60s avec message d'erreur
- [ ] **API error**: Message d'erreur si OpenAI est indisponible

---

## 20. Workflow Complet E2E

### 20.1 Parcours client complet
1. [ ] Créer un client
2. [ ] Créer un contact pour ce client
3. [ ] Créer un deal lié au client
4. [ ] Créer une proposition pour le deal
5. [ ] Envoyer la proposition
6. [ ] Accepter la proposition (lien public)
7. [ ] Créer un devis depuis le deal
8. [ ] Envoyer le devis
9. [ ] Marquer le deal comme gagné
10. [ ] Créer une mission depuis le deal
11. [ ] Créer une facture pour la mission
12. [ ] Marquer la facture comme payée
13. [ ] Demander une review
14. [ ] Soumettre la review (lien public)
15. [ ] Publier la review sur Verifolio

### 20.2 Parcours E2E avec LLM
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

## Notes de Test

### Environnement
- Navigateur: Chrome, Firefox, Safari
- Résolutions: Mobile (375px), Tablette (768px), Desktop (1440px)

### Données de test
- Utiliser des données réalistes
- Tester les cas limites (champs vides, caractères spéciaux)
- Tester les formats internationaux (téléphones, adresses)

### Configuration LLM requise
- Variable d'environnement: `OPENAI_API_KEY`
- Modèles utilisés:
  - `gpt-4o-mini`: Chat, génération de structure
  - `gpt-4o`: OCR/Vision pour extraction de documents

### Rapport de bugs
- Inclure les étapes de reproduction
- Inclure l'environnement (navigateur, résolution)
- Inclure des captures d'écran si nécessaire
- Pour bugs LLM: inclure le prompt et la réponse

### Modèles IA et limites
| Fonctionnalité | Modèle | Max Tokens | Timeout |
|----------------|--------|------------|---------|
| Chat assistant | gpt-4o-mini | - | 60s |
| Structure proposition | gpt-4o-mini | 1024 | 60s |
| Structure brief | gpt-4o-mini | 2048 | 60s |
| OCR documents | gpt-4o | - | 60s |
