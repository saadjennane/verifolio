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

---

## 18. Workflow Complet E2E

### 18.1 Parcours client complet
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

---

## Notes de Test

### Environnement
- Navigateur: Chrome, Firefox, Safari
- Résolutions: Mobile (375px), Tablette (768px), Desktop (1440px)

### Données de test
- Utiliser des données réalistes
- Tester les cas limites (champs vides, caractères spéciaux)
- Tester les formats internationaux (téléphones, adresses)

### Rapport de bugs
- Inclure les étapes de reproduction
- Inclure l'environnement (navigateur, résolution)
- Inclure des captures d'écran si nécessaire
