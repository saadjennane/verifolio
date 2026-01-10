'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';

interface WaitReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  initialReason?: string;
}

const PREDEFINED_REASONS = [
  'Attente retour client',
  'Attente paiement',
  'Attente validation interne',
  'Attente documents/informations',
];

export function WaitReasonModal({
  isOpen,
  onClose,
  onSubmit,
  initialReason
}: WaitReasonModalProps) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [isCustom, setIsCustom] = useState(false);
  const [customReason, setCustomReason] = useState('');

  // Initialize state when modal opens or initialReason changes
  useEffect(() => {
    if (isOpen && initialReason) {
      if (PREDEFINED_REASONS.includes(initialReason)) {
        setSelectedReason(initialReason);
        setIsCustom(false);
        setCustomReason('');
      } else {
        setSelectedReason(null);
        setIsCustom(true);
        setCustomReason(initialReason);
      }
    } else if (isOpen && !initialReason) {
      setSelectedReason(null);
      setIsCustom(false);
      setCustomReason('');
    }
  }, [isOpen, initialReason]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    const reason = isCustom ? customReason.trim() : selectedReason;
    if (reason) {
      onSubmit(reason);
      handleClose();
    }
  };

  const handleClose = () => {
    // Reset state for next opening
    setSelectedReason(null);
    setIsCustom(false);
    setCustomReason('');
    onClose();
  };

  const handleReasonSelect = (reason: string) => {
    if (reason === 'custom') {
      setIsCustom(true);
      setSelectedReason(null);
    } else {
      setIsCustom(false);
      setSelectedReason(reason);
      setCustomReason('');
    }
  };

  const isValid = (isCustom && customReason.trim()) || (!isCustom && selectedReason);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Raison d'attente
        </h2>

        <div className="space-y-3 mb-6">
          {PREDEFINED_REASONS.map((reason) => (
            <label
              key={reason}
              className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="radio"
                name="wait_reason"
                checked={!isCustom && selectedReason === reason}
                onChange={() => handleReasonSelect(reason)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{reason}</span>
            </label>
          ))}

          <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
            <input
              type="radio"
              name="wait_reason"
              checked={isCustom}
              onChange={() => handleReasonSelect('custom')}
              className="h-4 w-4 mt-1 text-blue-600 focus:ring-blue-500"
            />
            <div className="flex-1">
              <span className="text-sm text-gray-700 block mb-2">Autre raison</span>
              {isCustom && (
                <textarea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Précisez la raison d'attente..."
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  rows={3}
                  autoFocus
                />
              )}
            </div>
          </label>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleSubmit}
            disabled={!isValid}
          >
            Valider
          </Button>
          <Button variant="outline" onClick={handleClose}>
            Annuler
          </Button>
        </div>
      </div>
    </div>
  );
}
