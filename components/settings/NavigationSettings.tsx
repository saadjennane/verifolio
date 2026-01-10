'use client';

import { Card } from '@/components/ui/Card';

export function NavigationSettings() {
  return (
    <div className="space-y-6">
      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Réorganiser les onglets</h2>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold text-sm">1</span>
              </div>
              <div>
                <h3 className="font-medium text-sm mb-1">Ouvrez plusieurs onglets</h3>
                <p className="text-sm text-gray-600">
                  Cliquez sur "Clients", "Deals", "Missions", etc. dans la sidebar pour ouvrir des onglets
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold text-sm">2</span>
              </div>
              <div>
                <h3 className="font-medium text-sm mb-1">Glissez-déposez pour réorganiser</h3>
                <p className="text-sm text-gray-600">
                  Cliquez et maintenez sur un onglet dans la barre du haut, puis faites-le glisser à gauche ou à droite pour le déplacer
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold text-sm">3</span>
              </div>
              <div>
                <h3 className="font-medium text-sm mb-1">L'ordre est sauvegardé automatiquement</h3>
                <p className="text-sm text-gray-600">
                  Vos préférences sont conservées même après avoir fermé votre navigateur
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <svg
                className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h4 className="font-semibold text-sm text-blue-900 mb-1">Astuce</h4>
                <p className="text-sm text-blue-700">
                  <strong>Double-clic</strong> sur un élément de la sidebar pour ouvrir un onglet permanent (non-italique).
                  Les onglets en italique sont temporaires et seront remplacés lors de votre prochaine navigation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Raccourcis utiles</h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Fermer un onglet</span>
              <div className="flex gap-2">
                <kbd className="px-2 py-1 text-xs bg-gray-100 border border-gray-300 rounded">Clic molette</kbd>
                <span className="text-gray-400">ou</span>
                <kbd className="px-2 py-1 text-xs bg-gray-100 border border-gray-300 rounded">Bouton ×</kbd>
              </div>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Ouvrir un onglet permanent</span>
              <kbd className="px-2 py-1 text-xs bg-gray-100 border border-gray-300 rounded">Double-clic</kbd>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Réorganiser les onglets</span>
              <kbd className="px-2 py-1 text-xs bg-gray-100 border border-gray-300 rounded">Glisser-déposer</kbd>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-600">Ouvrir permanent (avec raccourci)</span>
              <div className="flex gap-2">
                <kbd className="px-2 py-1 text-xs bg-gray-100 border border-gray-300 rounded">Ctrl</kbd>
                <span className="text-gray-400">+</span>
                <kbd className="px-2 py-1 text-xs bg-gray-100 border border-gray-300 rounded">Clic</kbd>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
