// ============================================================================
// Catalogue des Pages de Proposition
// ============================================================================
// Définit toutes les pages disponibles pour créer une template de proposition

import type { TipTapContent } from '@/lib/types/structure-templates';

// ============================================================================
// Types
// ============================================================================

export interface ProposalPageDefinition {
  id: string;
  name: string;
  description: string;
  category: 'essential' | 'context' | 'differentiation' | 'specialized';
  isCover?: boolean;
  isLocked?: boolean; // Cannot be removed (e.g., cover)
  defaultContent: TipTapContent;
}

export type PageCategoryId = ProposalPageDefinition['category'];

export const PAGE_CATEGORIES: Record<PageCategoryId, { label: string; description: string }> = {
  essential: {
    label: 'Essentiel',
    description: 'Pages recommandées pour toute proposition',
  },
  context: {
    label: 'Contexte',
    description: 'Pour cadrer le projet',
  },
  differentiation: {
    label: 'Différenciation',
    description: 'Pour vous démarquer',
  },
  specialized: {
    label: 'Spécialisé',
    description: 'Selon votre métier',
  },
};

// ============================================================================
// TipTap Node Helpers
// ============================================================================

function text(t: string) {
  return { type: 'text', text: t };
}

function heading(level: number, content: string, align?: 'left' | 'center' | 'right') {
  return {
    type: 'heading',
    attrs: { level, ...(align && { textAlign: align }) },
    content: [text(content)],
  };
}

function paragraph(content?: string, align?: 'left' | 'center' | 'right') {
  if (!content) {
    return { type: 'paragraph', ...(align && { attrs: { textAlign: align } }) };
  }
  return {
    type: 'paragraph',
    ...(align && { attrs: { textAlign: align } }),
    content: [text(content)],
  };
}

function bulletList(items: string[]) {
  return {
    type: 'bulletList',
    content: items.map(item => ({
      type: 'listItem',
      content: [{ type: 'paragraph', content: [text(item)] }],
    })),
  };
}

function separator() {
  return { type: 'horizontalRule' };
}

function callout(content: string) {
  return {
    type: 'blockquote',
    content: [{ type: 'paragraph', content: [text(content)] }],
  };
}

function image(placeholder: string) {
  return {
    type: 'image',
    attrs: { src: `https://placehold.co/800x400/e2e8f0/64748b?text=${encodeURIComponent(placeholder)}`, alt: placeholder },
  };
}

function twoColumnsText(left: string, right: string) {
  return {
    type: 'twoColumns',
    content: [
      { type: 'columnBlock', content: [{ type: 'paragraph', content: [text(left)] }] },
      { type: 'columnBlock', content: [{ type: 'paragraph', content: [text(right)] }] },
    ],
  };
}

function twoColumnsImageText(imageText: string, textContent: string) {
  return {
    type: 'twoColumns',
    content: [
      { type: 'columnBlock', content: [{ type: 'image', attrs: { src: `https://placehold.co/400x300/e2e8f0/64748b?text=${encodeURIComponent(imageText)}`, alt: imageText } }] },
      { type: 'columnBlock', content: [{ type: 'paragraph', content: [text(textContent)] }] },
    ],
  };
}

function twoColumnsTextImage(textContent: string, imageText: string) {
  return {
    type: 'twoColumns',
    content: [
      { type: 'columnBlock', content: [{ type: 'paragraph', content: [text(textContent)] }] },
      { type: 'columnBlock', content: [{ type: 'image', attrs: { src: `https://placehold.co/400x300/e2e8f0/64748b?text=${encodeURIComponent(imageText)}`, alt: imageText } }] },
    ],
  };
}

function twoColumnsImages(left: string, right: string) {
  return {
    type: 'twoColumns',
    content: [
      { type: 'columnBlock', content: [{ type: 'image', attrs: { src: `https://placehold.co/400x300/e2e8f0/64748b?text=${encodeURIComponent(left)}`, alt: left } }] },
      { type: 'columnBlock', content: [{ type: 'image', attrs: { src: `https://placehold.co/400x300/e2e8f0/64748b?text=${encodeURIComponent(right)}`, alt: right } }] },
    ],
  };
}

function table(headers: string[], rows: string[][]) {
  return {
    type: 'table',
    content: [
      {
        type: 'tableRow',
        content: headers.map(h => ({
          type: 'tableHeader',
          attrs: { colspan: 1, rowspan: 1 },
          content: [{ type: 'paragraph', content: [text(h)] }],
        })),
      },
      ...rows.map(row => ({
        type: 'tableRow',
        content: row.map(cell => ({
          type: 'tableCell',
          attrs: { colspan: 1, rowspan: 1 },
          content: [{ type: 'paragraph', content: [text(cell)] }],
        })),
      })),
    ],
  };
}

function link(label: string, url: string) {
  return {
    type: 'paragraph',
    content: [{
      type: 'text',
      text: label,
      marks: [{ type: 'link', attrs: { href: url, target: '_blank' } }],
    }],
  };
}

// ============================================================================
// Catalogue des 18 Pages
// ============================================================================

export const PAGE_CATALOG: ProposalPageDefinition[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // 1. COUVERTURE
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'cover',
    name: 'Couverture',
    description: 'Première impression, identité visuelle',
    category: 'essential',
    isCover: true,
    isLocked: true,
    defaultContent: {
      type: 'doc',
      content: [
        image('Votre logo ou image de couverture'),
        heading(1, 'Proposition commerciale', 'center'),
        paragraph('Titre du projet', 'center'),
        separator(),
        paragraph('Préparé pour [Nom du client]', 'center'),
        paragraph('[Date]', 'center'),
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 2. INTRODUCTION
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'introduction',
    name: 'Introduction',
    description: 'Poser le contexte de la demande',
    category: 'context',
    defaultContent: {
      type: 'doc',
      content: [
        heading(1, 'Introduction'),
        paragraph('Décrivez ici le contexte de la demande : comment avez-vous été contacté, quel est le besoin exprimé, quels sont les enjeux pour le client.'),
        callout('💡 En résumé : [Synthèse en une phrase du besoin principal]'),
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 3. RAPPEL DU BRIEF
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'brief',
    name: 'Rappel du brief',
    description: 'Reformuler le besoin client',
    category: 'context',
    defaultContent: {
      type: 'doc',
      content: [
        heading(1, 'Votre besoin'),
        paragraph('Reformulez ici les objectifs exprimés par le client :'),
        bulletList(['Objectif 1', 'Objectif 2', 'Objectif 3']),
        separator(),
        heading(2, 'Contraintes identifiées'),
        bulletList(['Contrainte 1', 'Contrainte 2']),
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 4. NOTRE SOLUTION
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'solution',
    name: 'Notre solution',
    description: "Présenter l'approche proposée",
    category: 'essential',
    defaultContent: {
      type: 'doc',
      content: [
        heading(1, 'Notre proposition'),
        paragraph('Décrivez votre approche globale : quelle solution proposez-vous et pourquoi est-elle adaptée à ce contexte ?'),
        twoColumnsText(
          'Ce que nous allons faire\n\nDescription de l\'action principale',
          'Ce que cela apporte\n\nBénéfice concret pour le client'
        ),
        callout('✨ Notre valeur ajoutée : [Ce qui vous différencie sur ce projet]'),
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 5. PÉRIMÈTRE
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'scope',
    name: 'Périmètre',
    description: 'Délimiter ce qui est inclus/exclu',
    category: 'context',
    defaultContent: {
      type: 'doc',
      content: [
        heading(1, 'Périmètre de la mission'),
        twoColumnsText(
          '✓ Inclus\n\n• Élément inclus 1\n• Élément inclus 2\n• Élément inclus 3',
          '✗ Non inclus\n\n• Élément exclu 1\n• Élément exclu 2\n• Élément exclu 3'
        ),
        callout('ℹ️ Les éléments non inclus peuvent être ajoutés en option. Parlons-en.'),
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 6. LIVRABLES
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'deliverables',
    name: 'Livrables',
    description: 'Lister ce que le client recevra',
    category: 'essential',
    defaultContent: {
      type: 'doc',
      content: [
        heading(1, 'Livrables'),
        paragraph('Voici ce que vous recevrez à l\'issue de la mission :'),
        table(
          ['Livrable', 'Description', 'Format'],
          [
            ['Livrable 1', 'Description du livrable', 'PDF, Figma...'],
            ['Livrable 2', 'Description du livrable', 'Format'],
            ['Livrable 3', 'Description du livrable', 'Format'],
          ]
        ),
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 7. MÉTHODOLOGIE
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'methodology',
    name: 'Méthodologie',
    description: 'Expliquer le processus de travail',
    category: 'differentiation',
    defaultContent: {
      type: 'doc',
      content: [
        heading(1, 'Notre méthodologie'),
        paragraph('Décrivez votre processus de travail étape par étape :'),
        heading(2, 'Étape 1 — Découverte'),
        paragraph('Description de cette phase'),
        separator(),
        heading(2, 'Étape 2 — Conception'),
        paragraph('Description de cette phase'),
        separator(),
        heading(2, 'Étape 3 — Production'),
        paragraph('Description de cette phase'),
        separator(),
        heading(2, 'Étape 4 — Livraison'),
        paragraph('Description de cette phase'),
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 8. PLANNING
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'planning',
    name: 'Planning',
    description: 'Vision claire du calendrier',
    category: 'context',
    defaultContent: {
      type: 'doc',
      content: [
        heading(1, 'Planning prévisionnel'),
        table(
          ['Phase', 'Durée', 'Dates indicatives'],
          [
            ['Lancement', '1 semaine', 'Semaine 1'],
            ['Conception', '2 semaines', 'Semaines 2-3'],
            ['Production', '3 semaines', 'Semaines 4-6'],
            ['Livraison', '1 semaine', 'Semaine 7'],
          ]
        ),
        callout('⏱️ Durée totale estimée : [X semaines] à partir de la validation'),
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 9. BUDGET
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'budget',
    name: 'Budget',
    description: 'Présenter les tarifs',
    category: 'essential',
    defaultContent: {
      type: 'doc',
      content: [
        heading(1, 'Investissement'),
        table(
          ['Prestation', 'Détail', 'Montant HT'],
          [
            ['Prestation principale', 'Description', 'X €'],
            ['Option 1', 'Description', 'X €'],
            ['Option 2', 'Description', 'X €'],
          ]
        ),
        separator(),
        heading(2, 'Total : X € HT'),
        callout('💳 Conditions : [Acompte X% à la commande, solde à la livraison]'),
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 10. MODALITÉS
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'terms',
    name: 'Modalités',
    description: 'Conditions pratiques de collaboration',
    category: 'differentiation',
    defaultContent: {
      type: 'doc',
      content: [
        heading(1, 'Modalités pratiques'),
        twoColumnsText(
          'Paiement\n\n• Acompte de X%\n• Solde à la livraison\n• Paiement par virement',
          'Collaboration\n\n• Points hebdomadaires\n• Retours sous X jours\n• X allers-retours inclus'
        ),
        paragraph('Validité de cette proposition : 30 jours'),
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 11. À PROPOS
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'about',
    name: 'À propos',
    description: 'Se présenter et créer un lien',
    category: 'differentiation',
    defaultContent: {
      type: 'doc',
      content: [
        heading(1, 'Qui suis-je'),
        twoColumnsImageText(
          'Votre photo',
          '[Votre nom]\n[Votre métier]\n\nPrésentez-vous en quelques phrases : votre parcours, votre expertise, ce qui vous anime.'
        ),
        heading(2, 'Quelques chiffres'),
        bulletList([
          'X années d\'expérience',
          'X projets réalisés',
          'X clients accompagnés',
        ]),
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 12. RÉFÉRENCES
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'references',
    name: 'Références',
    description: 'Montrer des réalisations passées',
    category: 'differentiation',
    defaultContent: {
      type: 'doc',
      content: [
        heading(1, 'Quelques réalisations'),
        twoColumnsImageText(
          'Image projet 1',
          'Nom du projet\nClient : [Nom]\n\nCourte description du projet et des résultats obtenus.'
        ),
        separator(),
        twoColumnsTextImage(
          'Nom du projet\nClient : [Nom]\n\nCourte description du projet et des résultats obtenus.',
          'Image projet 2'
        ),
        link('🔗 Voir plus de réalisations sur mon portfolio', '#'),
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 13. POURQUOI NOUS
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'why-us',
    name: 'Pourquoi nous',
    description: 'Argumenter sa valeur ajoutée',
    category: 'differentiation',
    defaultContent: {
      type: 'doc',
      content: [
        heading(1, 'Pourquoi travailler ensemble'),
        heading(2, '✓ Expertise spécifique'),
        paragraph('Décrivez votre expertise sur ce type de projet'),
        heading(2, '✓ Approche personnalisée'),
        paragraph('Ce qui rend votre accompagnement unique'),
        heading(2, '✓ Engagement qualité'),
        paragraph('Vos garanties et votre niveau d\'exigence'),
        callout('💬 "[Témoignage client pertinent]" — Nom, Entreprise'),
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 14. MOODBOARD
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'moodboard',
    name: 'Moodboard',
    description: 'Direction artistique et inspirations',
    category: 'specialized',
    defaultContent: {
      type: 'doc',
      content: [
        heading(1, 'Direction artistique'),
        paragraph('Voici les inspirations visuelles qui guident notre proposition :'),
        twoColumnsImages('Image inspiration 1', 'Image inspiration 2'),
        twoColumnsImages('Image inspiration 3', 'Image inspiration 4'),
        heading(2, 'Mots-clés'),
        paragraph('Moderne, Épuré, Chaleureux...'),
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 15. CONCEPT
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'concept',
    name: 'Concept',
    description: 'Présenter une idée créative',
    category: 'specialized',
    defaultContent: {
      type: 'doc',
      content: [
        heading(1, 'Le concept'),
        heading(2, '[Nom du concept]'),
        paragraph('Décrivez l\'idée centrale de votre proposition créative : quelle est la grande idée ? Quel message veut-on transmettre ?'),
        image('Visuel illustrant le concept'),
        callout('🎯 En une phrase : [Résumé du concept]'),
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 16. DÉTAILS TECHNIQUES
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'technical',
    name: 'Détails techniques',
    description: 'Spécifications techniques',
    category: 'specialized',
    defaultContent: {
      type: 'doc',
      content: [
        heading(1, 'Spécifications techniques'),
        table(
          ['Élément', 'Spécification'],
          [
            ['Technologie', '[Ex: React, WordPress...]'],
            ['Hébergement', '[Ex: Vercel, OVH...]'],
            ['Compatibilité', '[Ex: Mobile, Desktop...]'],
            ['Performance', '[Ex: Score Lighthouse > 90]'],
          ]
        ),
        heading(2, 'Prérequis'),
        bulletList(['Prérequis 1', 'Prérequis 2']),
        callout('⚙️ Ces choix techniques sont adaptables selon vos contraintes.'),
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 17. PROCHAINES ÉTAPES
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'next-steps',
    name: 'Prochaines étapes',
    description: "Clarifier la suite et inciter à l'action",
    category: 'essential',
    defaultContent: {
      type: 'doc',
      content: [
        heading(1, 'Et maintenant ?'),
        heading(2, '1. Validation'),
        paragraph('Vous confirmez cette proposition (par retour écrit ou signature)'),
        heading(2, '2. Acompte'),
        paragraph('Règlement de l\'acompte pour lancer la mission'),
        heading(2, '3. Kick-off'),
        paragraph('Nous planifions un premier échange pour démarrer'),
        callout('📅 Disponibilité : Je peux démarrer dès [date/période]'),
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 18. CONTACT
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'contact',
    name: 'Contact',
    description: 'Coordonnées et appel à action',
    category: 'specialized',
    defaultContent: {
      type: 'doc',
      content: [
        heading(1, 'Restons en contact'),
        twoColumnsText(
          '[Votre nom]\n[Votre métier]\n\n📧 [email]\n📱 [téléphone]\n🌐 [site web]',
          '[Votre photo ou logo]'
        ),
        link('📅 Réserver un créneau d\'échange', '#'),
      ],
    },
  },
];

// ============================================================================
// Helpers
// ============================================================================

export function getPageById(id: string): ProposalPageDefinition | undefined {
  return PAGE_CATALOG.find(p => p.id === id);
}

export function getPagesByCategory(category: PageCategoryId): ProposalPageDefinition[] {
  return PAGE_CATALOG.filter(p => p.category === category);
}

export function getDefaultPages(): ProposalPageDefinition[] {
  // Pages essentielles par défaut
  return PAGE_CATALOG.filter(p => p.category === 'essential');
}

export function getCoverPage(): ProposalPageDefinition {
  return PAGE_CATALOG.find(p => p.isCover)!;
}

// ============================================================================
// Structures prédéfinies
// ============================================================================

export interface PredefinedStructure {
  name: string;
  description: string;
  pageIds: string[];
}

export const PREDEFINED_STRUCTURES: Record<string, PredefinedStructure> = {
  essential: {
    name: 'Essentiel',
    description: 'Pour une proposition rapide et efficace',
    pageIds: ['cover', 'solution', 'deliverables', 'budget', 'next-steps'],
  },
  complete: {
    name: 'Complet',
    description: 'Pour une proposition détaillée',
    pageIds: ['cover', 'introduction', 'brief', 'solution', 'deliverables', 'planning', 'budget', 'terms', 'next-steps'],
  },
  creative: {
    name: 'Créatif',
    description: 'Pour les métiers visuels',
    pageIds: ['cover', 'brief', 'moodboard', 'concept', 'solution', 'budget', 'references', 'next-steps'],
  },
  consulting: {
    name: 'Consulting',
    description: 'Pour missions stratégiques',
    pageIds: ['cover', 'introduction', 'brief', 'methodology', 'solution', 'planning', 'budget', 'next-steps', 'contact'],
  },
};

export type PredefinedStructureId = keyof typeof PREDEFINED_STRUCTURES;
