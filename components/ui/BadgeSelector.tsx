'use client';

import { useState } from 'react';
import { Badge } from './Badge';
import { Button } from './Button';
import { PREDEFINED_BADGES } from '@/lib/constants/badges-tags';

interface BadgeSelectorProps {
  onSelect: (badge: string, variant: string) => void;
  existingBadges?: string[];
}

export function BadgeSelector({ onSelect, existingBadges = [] }: BadgeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Filtrer les badges déjà existants et les badges automatiques
  const availableBadges = PREDEFINED_BADGES.filter(
    (badge) => !badge.isAutomatic && !existingBadges.includes(badge.label)
  );

  const handleSelect = (badge: typeof PREDEFINED_BADGES[number]) => {
    onSelect(badge.label, badge.variant);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
      >
        + Badge
      </Button>

      {isOpen && (
        <>
          {/* Overlay pour fermer au clic extérieur */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu déroulant */}
          <div className="absolute left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-96 overflow-y-auto">
            <div className="p-2">
              <div className="text-xs font-semibold text-gray-500 px-2 py-1 mb-1">
                Sélectionner un badge
              </div>
              {availableBadges.length === 0 ? (
                <div className="px-2 py-3 text-sm text-gray-500 text-center">
                  Tous les badges ont été ajoutés
                </div>
              ) : (
                availableBadges.map((badge) => (
                  <button
                    key={badge.id}
                    type="button"
                    onClick={() => handleSelect(badge)}
                    className="w-full flex items-center gap-2 px-2 py-2 rounded hover:bg-gray-50 transition-colors"
                  >
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
