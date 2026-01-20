'use client';

import { useState } from 'react';
import { Inter, Plus_Jakarta_Sans, DM_Sans, Outfit } from 'next/font/google';
import { GeistSans } from 'geist/font/sans';
import { Button } from '@/components/ui';
import { Check } from 'lucide-react';

// Charger les polices
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-plus-jakarta' });
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' });
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });

interface FontOption {
  id: string;
  name: string;
  className: string;
  description: string;
}

const fonts: FontOption[] = [
  {
    id: 'inter',
    name: 'Inter',
    className: inter.className,
    description: 'Police actuelle - Clean et neutre',
  },
  {
    id: 'plus-jakarta',
    name: 'Plus Jakarta Sans',
    className: plusJakarta.className,
    description: 'Géométrique et chaleureuse - Très tendance',
  },
  {
    id: 'dm-sans',
    name: 'DM Sans',
    className: dmSans.className,
    description: 'Moderne et élégante - Excellente pour les chiffres',
  },
  {
    id: 'geist',
    name: 'Geist',
    className: GeistSans.className,
    description: 'Par Vercel - Conçue pour les interfaces',
  },
  {
    id: 'outfit',
    name: 'Outfit',
    className: outfit.className,
    description: 'Géométrique contemporaine - Look premium',
  },
];

export function FontsSettings() {
  const [selectedFont, setSelectedFont] = useState<string>('inter');
  const currentFont = fonts.find((f) => f.id === selectedFont) || fonts[0];

  return (
    <div className="space-y-6">
      {/* Font Selection */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {fonts.map((font) => (
          <button
            key={font.id}
            onClick={() => setSelectedFont(font.id)}
            className={`
              relative p-4 rounded-lg border-2 transition-all text-left
              ${selectedFont === font.id
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                : 'border-border hover:border-muted-foreground/50 bg-card'
              }
            `}
          >
            {selectedFont === font.id && (
              <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}
            <span className={`text-lg font-semibold block ${font.className}`}>
              {font.name}
            </span>
            <span className="text-xs text-muted-foreground mt-1 block">
              {font.id === 'inter' ? '(actuelle)' : ''}
            </span>
          </button>
        ))}
      </div>

      {/* Description */}
      <div className="p-4 bg-muted rounded-lg border border-border">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{currentFont.name}:</span> {currentFont.description}
        </p>
      </div>

      {/* Preview Area */}
      <div className={`${currentFont.className} bg-card rounded-xl border border-border overflow-hidden`}>
        {/* Preview Header */}
        <div className="px-6 py-4 border-b border-border bg-muted">
          <span className="text-sm font-medium text-muted-foreground">APERÇU EN DIRECT</span>
        </div>

        <div className="p-6 space-y-8">
          {/* Typography Samples */}
          <div className="space-y-4">
            <h1 className="text-3xl font-bold text-foreground">Titre principal H1</h1>
            <h2 className="text-xl font-semibold text-foreground/90">Sous-titre H2 - Gestion des clients</h2>
            <h3 className="text-lg font-medium text-foreground/80">Section H3 - Détails du devis</h3>
            <p className="text-base text-muted-foreground">
              Corps de texte normal. Verifolio vous aide à gérer vos devis et factures simplement.
              Cette police doit être lisible en toutes circonstances.
            </p>
            <p className="text-sm text-muted-foreground/80">
              Texte secondaire plus petit - Créé le 20 janvier 2025
            </p>
          </div>

          {/* Numbers & Currency */}
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="text-sm font-medium text-muted-foreground mb-3">CHIFFRES ET MONTANTS</h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-foreground">12 450,00 €</div>
                <div className="text-xs text-muted-foreground">Montant HT</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">8 320,50 €</div>
                <div className="text-xs text-muted-foreground">Payé</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-500">4 129,50 €</div>
                <div className="text-xs text-muted-foreground">Restant</div>
              </div>
            </div>
          </div>

          {/* Chat Simulation */}
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-2 bg-muted border-b border-border">
              <span className="text-sm font-medium text-muted-foreground">Simulation Chat</span>
            </div>
            <div className="p-4 space-y-3 bg-card">
              {/* User Message */}
              <div className="flex justify-end">
                <div className="bg-blue-500 text-white px-4 py-2 rounded-2xl rounded-br-md max-w-xs">
                  <p className="text-sm">Crée un client Acme Corp avec ICE 123456789</p>
                </div>
              </div>

              {/* Assistant Message */}
              <div className="flex justify-start">
                <div className="bg-card border border-border px-4 py-3 rounded-2xl rounded-bl-md max-w-sm shadow-sm">
                  <p className="text-sm text-foreground">
                    J&apos;ai créé le client &quot;Acme Corp&quot; avec l&apos;ICE 123456789.
                    Tu veux que je crée un devis pour ce client ?
                  </p>
                </div>
              </div>

              {/* Suggestion Buttons */}
              <div className="flex flex-wrap gap-2 mt-2">
                <button className="px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-full text-foreground transition-colors">
                  Créer un deal
                </button>
                <button className="px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-full text-foreground transition-colors">
                  On facture ?
                </button>
                <button className="px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-full text-foreground transition-colors">
                  Son historique
                </button>
              </div>

              {/* Working Block */}
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                  <span className="text-xs">▾</span>
                  <span>Terminé</span>
                  <span className="text-xs text-muted-foreground">(3/3)</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="text-green-600">✓</span>
                    <span className="line-through">Analyse de la demande</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="text-green-600">✓</span>
                    <span className="line-through">Vérification du client</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="text-green-600">✓</span>
                    <span className="line-through">Création du client</span>
                  </div>
                </div>
              </div>

              {/* Quick Reply Buttons */}
              <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                <button className="px-4 py-2 text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors">
                  Oui
                </button>
                <button className="px-4 py-2 text-sm font-medium bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors">
                  Non
                </button>
                <button className="px-4 py-2 text-sm font-medium bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors">
                  Modifier
                </button>
              </div>
            </div>
          </div>

          {/* Table Sample */}
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Client</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Montant</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="px-4 py-3 font-medium text-foreground">Acme Corp</td>
                  <td className="px-4 py-3 text-muted-foreground">Entreprise</td>
                  <td className="px-4 py-3 text-right text-foreground">5 400,00 €</td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full">
                      Payé
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-foreground">Jean Dupont</td>
                  <td className="px-4 py-3 text-muted-foreground">Particulier</td>
                  <td className="px-4 py-3 text-right text-foreground">1 250,00 €</td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-1 text-xs font-medium bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 rounded-full">
                      En attente
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-foreground">Tech Solutions</td>
                  <td className="px-4 py-3 text-muted-foreground">Entreprise</td>
                  <td className="px-4 py-3 text-right text-foreground">12 800,00 €</td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
                      Brouillon
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Form Elements */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">ÉLÉMENTS DE FORMULAIRE</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Nom du client
                </label>
                <input
                  type="text"
                  placeholder="Ex: Acme Corp"
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Montant HT
                </label>
                <input
                  type="text"
                  placeholder="0,00 €"
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
                  readOnly
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="flex justify-end">
        <Button
          variant="default"
          className="px-6"
          onClick={() => {
            alert(`Police sélectionnée: ${currentFont.name}\n\nPour appliquer cette police, il faudra modifier le fichier layout.tsx`);
          }}
        >
          Appliquer {currentFont.name}
        </Button>
      </div>
    </div>
  );
}
