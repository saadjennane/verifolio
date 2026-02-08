# Capacités LLM par Métier - Verifolio

Ce document décrit ce que l'assistant LLM peut faire pour chaque domaine fonctionnel, et ce qui manque.

---

## 1. Clients

### Ce que le LLM fait
| Action | Outil | Exemple |
|--------|-------|---------|
| Créer un client | `create_client` | "Crée un client ACME entreprise" |
| Lister les clients | `list_clients` | "Montre mes clients" |
| Modifier un client | `update_client` | "Change l'email de ACME" |
| Champs personnalisés | `custom_fields` | "Ajoute ICE 123456 au client" |

### Ce qui manque
- [ ] **Supprimer un client** - `delete_client` non implémenté
- [ ] **Archiver un client** - `archive_client` non implémenté
- [ ] **Recherche avancée** - Filtrer par type, email, créé depuis X jours
- [ ] **Fusion de doublons** - Détecter et fusionner clients similaires

---

## 2. Contacts

### Ce que le LLM fait
| Action | Outil | Exemple |
|--------|-------|---------|
| Créer un contact | `create_contact` | "Ajoute le contact Marie Martin" |
| Lister les contacts | `list_contacts` | "Contacts d'ACME" |
| Lier contact → client | `link_contact_to_client` | "Marie est la comptable d'ACME" |
| Délier | `unlink_contact_from_client` | "Retire Marie d'ACME" |
| Modifier | `update_contact` | "Change le tel de Marie" |
| Rôles | `update_client_contact` | "Marie gère la facturation" |
| Contact par contexte | `get_contact_for_context` | "Qui contacter pour la facturation chez ACME?" |

### Ce qui manque
- [ ] **Supprimer un contact** - `delete_contact` non implémenté
- [ ] **Historique d'interactions** - Quand ai-je parlé à ce contact ?
- [ ] **Import depuis vCard** - Importer des contacts

---

## 3. Deals (Opportunités)

### Ce que le LLM fait
| Action | Outil | Exemple |
|--------|-------|---------|
| Créer un deal | `create_deal` | "Crée un deal Vidéo 2024 pour ACME, 5000€" |
| Lister | `list_deals` | "Mes deals en cours" |
| Détails | `get_deal` | "Détails du deal X" |
| Changer statut | `update_deal_status` | "Le deal est gagné" |

### Ce qui manque
- [ ] **Modifier un deal** - `update_deal` (titre, description, montant)
- [ ] **Supprimer un deal** - `delete_deal`
- [ ] **Ajouter des tags** - `add_deal_tag` existe dans le prompt mais pas implémenté
- [ ] **Ajouter des contacts** - Lier contacts au deal
- [ ] **Timeline/activités** - Historique des actions sur le deal
- [ ] **Probabilité de conversion** - Scoring du deal
- [ ] **Relances automatiques** - Suggérer de relancer un deal dormant

---

## 4. Devis

### Ce que le LLM fait
| Action | Outil | Exemple |
|--------|-------|---------|
| Créer | `create_quote` | "Crée un devis pour ACME: 5 jours dev à 500€" |
| Lister | `list_quotes` | "Mes devis en brouillon" |
| Statut | `update_quote_status` | "Marque le devis comme envoyé" |
| Convertir | `convert_quote_to_invoice` | "Convertis le devis en facture" |

### Ce qui manque
- [ ] **Modifier un devis** - `update_quote` (lignes, notes, dates)
- [ ] **Supprimer un devis** - `delete_quote`
- [ ] **Ajouter/modifier des lignes** - `add_quote_line`, `update_quote_line`
- [ ] **Dupliquer un devis** - `duplicate_quote`
- [ ] **Envoyer par email** - `send_quote` (existe dans le prompt, à vérifier)
- [ ] **Date de validité** - Alerter si proche expiration

---

## 5. Factures

### Ce que le LLM fait
| Action | Outil | Exemple |
|--------|-------|---------|
| Créer | `create_invoice` | "Crée une facture pour la mission X" |
| Lister | `list_invoices` | "Factures impayées" |
| Modifier | `update_invoice` | "Change la date d'échéance" |
| Statut | `update_invoice_status` | "La facture est envoyée" |
| Payer | `mark_invoice_paid` | "La facture est payée" |
| Depuis devis | `convert_quote_to_invoice` | "Convertis DEV-001 en facture" |

### Ce qui manque
- [ ] **Supprimer une facture** - `delete_invoice`
- [ ] **Ajouter/modifier des lignes** - `add_invoice_line`, `update_invoice_line`
- [ ] **Envoyer la facture** - `send_invoice` (défini comme CRITICAL mais à vérifier l'implémentation)
- [ ] **Envoyer un rappel** - `send_invoice_reminder`
- [ ] **Avoir/note de crédit** - Gérer les remboursements partiels
- [ ] **Facture récurrente** - Créer des factures automatiques

---

## 6. Missions

### Ce que le LLM fait
| Action | Outil | Exemple |
|--------|-------|---------|
| Créer | `create_mission` | "Crée une mission pour le deal X" |
| Lister | `list_missions` | "Missions en cours" |
| Détails | `get_mission` | "Détails de la mission Y" |
| Statut | `update_mission_status` | "La mission est livrée" |

### Ce qui manque
- [ ] **Modifier une mission** - `update_mission` (titre, dates, description)
- [ ] **Supprimer/annuler** - `delete_mission`, `cancel_mission`
- [ ] **Ajouter des livrables** - Tracker les livrables
- [ ] **Temps passé** - Time tracking
- [ ] **Facturer depuis mission** - Créer facture directement avec les infos de la mission

---

## 7. Propositions commerciales

### Ce que le LLM fait
| Action | Outil | Exemple |
|--------|-------|---------|
| Créer template | `create_proposal_template` | "Crée un template Vidéo Corporate" |
| Ajouter section | `add_template_section` | "Ajoute une section Tarification" |
| Lister templates | `list_proposal_templates` | - |
| Créer proposition | `create_proposal` | "Crée une proposition pour ACME" |
| Lister | `list_proposals` | "Mes propositions envoyées" |
| Statut | `set_proposal_status` | "Marque comme envoyée" |
| Lien public | `get_proposal_public_link` | - |
| Créer page | `proposal_create_page` | "Ajoute une page Introduction" |
| Modifier page | `proposal_update_page` | "Modifie le contenu de la page X" |
| Lister pages | `proposal_list_pages` | - |
| Réécrire | `proposal_rewrite_content` | "Réécris en style formel" |
| Destinataires | `set_proposal_recipients` | "Envoie à Marie et Pierre" |

### Ce qui manque
- [ ] **Supprimer proposition** - `delete_proposal`
- [ ] **Supprimer page** - `proposal_delete_page`
- [ ] **Dupliquer proposition** - `duplicate_proposal`
- [ ] **Réordonner pages** - `proposal_reorder_pages`
- [ ] **Design (couleurs, fonts)** - `update_proposal_style`

---

## 8. Briefs (Questionnaires)

### Ce que le LLM fait
| Action | Outil | Exemple |
|--------|-------|---------|
| Lister templates | `list_brief_templates` | - |
| Créer brief | `create_brief` | "Crée un brief pour le deal X" |
| Lister | `list_briefs` | "Briefs en attente de réponse" |
| Envoyer | `send_brief` | "Envoie le brief au client" |
| Statut | `update_brief_status` | - |

### Ce qui manque
- [ ] **Créer template** - `create_brief_template`
- [ ] **Modifier template** - `update_brief_template`
- [ ] **Voir les réponses** - `get_brief_responses`
- [ ] **Exporter réponses** - PDF/CSV des réponses

---

## 9. Reviews (Avis clients)

### Ce que le LLM fait
| Action | Outil | Exemple |
|--------|-------|---------|
| Demander un avis | `create_review_request` | "Demande un avis pour la mission X" |
| Lister demandes | `list_review_requests` | "Demandes en attente" |
| Lister avis | `list_reviews` | "Avis reçus" |

### Ce qui manque
- [ ] **Envoyer rappel** - `send_review_reminder`
- [ ] **Publier/dépublier** - `publish_review`, `unpublish_review`
- [ ] **Supprimer** - `delete_review`
- [ ] **Templates de review** - Créer/gérer les critères
- [ ] **Partager** - Générer lien de partage

---

## 10. Paiements

### Ce que le LLM fait
| Action | Outil | Exemple |
|--------|-------|---------|
| Créer paiement | `create_payment` | "Enregistre un paiement de 500€ sur FA-001" |
| Lister | `list_payments` | "Paiements d'ACME" |
| Modifier | `update_payment` | "Change la date du paiement" |
| Supprimer | `delete_payment` | "Supprime ce paiement" |
| Solde client | `get_client_payment_balance` | "Solde d'ACME" |
| Paiements mission | `get_mission_payments` | "Paiements de la mission X" |
| Paiements facture | `get_invoice_payments` | "Détail des paiements de FA-001" |

### Ce qui manque
- [ ] **Paiements partiels automatiques** - Répartir un paiement sur plusieurs factures
- [ ] **Relances automatiques** - Suggérer les clients à relancer
- [ ] **Export comptable** - Format FEC, CSV

---

## 11. Templates de tâches

### Ce que le LLM fait
| Action | Outil | Exemple |
|--------|-------|---------|
| Créer template | `create_task_template` | "Crée un template Workflow mission photo" |
| Lister | `list_task_templates` | - |
| Détails | `get_task_template` | - |
| Modifier | `update_task_template` | - |
| Supprimer | `delete_task_template` | - |
| Appliquer | `apply_task_template` | "Applique le workflow à cette mission" |
| Tâches d'une entité | `get_entity_tasks` | "Tâches de la mission X" |

### Ce qui manque
- [ ] **Compléter une tâche** - `complete_task` (existe probablement ailleurs)
- [ ] **Modifier une tâche** - `update_task`
- [ ] **Supprimer une tâche** - `delete_task`
- [ ] **Assigner une tâche** - À un contact/utilisateur

---

## 12. Paramètres

### Ce que le LLM fait
| Action | Outil | Exemple |
|--------|-------|---------|
| Voir paramètres | `get_company_settings` | "Mes infos entreprise" |
| Modifier | `update_company_settings` | "Change la devise en EUR" |
| Champs personnalisés | `list_custom_fields` | "Mes champs personnalisés" |
| Créer champ | `create_custom_field` | "Crée un champ ICE" |
| Modifier valeur | `update_custom_field_value` | "Mon ICE est 123456" |
| Supprimer champ | `delete_custom_field` | - |
| Templates docs | `list_templates`, `get_template_blocks` | - |
| Modifier template | `add_template_block`, `update_template_block` | "Ajoute ICE dans le footer" |

### Ce qui manque
- [ ] **Upload logo** - Pas possible via chat
- [ ] **Modifier le profil utilisateur** - Nom, email perso
- [ ] **Configurer les emails** - Templates d'email

---

## 13. Fonctionnalités transversales

### Ce qui existe
| Fonctionnalité | Outil | Description |
|----------------|-------|-------------|
| Résumé financier | `get_financial_summary` | CA, impayés, stats par client |
| Envoi email | `send_email` | Envoyer devis/facture par email |
| Suggestions post-création | *comportement* | Propose d'ajouter des détails après création (email, tel, adresse...) |
| Ouverture automatique | *comportement* | Ouvre automatiquement l'entité créée dans un nouvel onglet |

### Ce qui manque globalement

#### Recherche et intelligence
- [ ] **Recherche globale** - "Cherche ACME dans tout" (clients, deals, factures...)
- [ ] **Rappels intelligents** - Détecter et alerter (factures en retard, deals dormants)
- [ ] **Analyse et insights** - Tendances, prévisions

#### Actions groupées
- [ ] **Actions en masse** - "Marque toutes les factures de janvier comme envoyées"
- [ ] **Export** - Exporter clients, factures en CSV/PDF
- [ ] **Import** - Importer depuis un fichier

#### Intégrations
- [ ] **Calendrier** - Créer des événements, voir les deadlines
- [ ] **Notifications** - "Rappelle-moi de relancer ACME demain"
- [ ] **Documents** - Générer/télécharger les PDFs directement

#### Workflow avancé
- [ ] **Workflow automatique** - "Quand une facture est créée, envoie-la automatiquement"
- [ ] **Templates de workflow** - Séquences d'actions prédéfinies

---

## Priorités suggérées

### Haute priorité (Impact quotidien)
1. `delete_client`, `delete_deal` - Actions basiques manquantes
2. `update_deal`, `update_mission` - Modifier les infos
3. Suppression de devis/factures avec protection (soft delete)
4. Recherche globale

### Moyenne priorité (Gain de productivité)
1. Actions en masse
2. Rappels/alertes automatiques
3. Envoi de rappels facture

### Basse priorité (Nice to have)
1. Import/export
2. Intégration calendrier
3. Workflows automatiques

---

## Statistiques actuelles

- **Outils de lecture** : 19
- **Outils de création** : 15
- **Outils de modification** : 14
- **Outils de suppression** : 3 (payment, custom_field, task_template)
- **Total outils** : ~75

Le LLM couvre bien la création et la lecture, mais la **suppression** et les **actions groupées** sont sous-représentées.
