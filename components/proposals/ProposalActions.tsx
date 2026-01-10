'use client';

import { useState } from 'react';
import type { ProposalStatus } from '@/lib/types/proposals';

interface ProposalActionsProps {
  token: string;
  status: ProposalStatus;
  accentColor: string;
  onStatusChange: (newStatus: ProposalStatus) => void;
}

export function ProposalActions({
  token,
  status,
  accentColor,
  onStatusChange,
}: ProposalActionsProps) {
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRefusing, setIsRefusing] = useState(false);
  const [showRefuseModal, setShowRefuseModal] = useState(false);
  const [refuseReason, setRefuseReason] = useState('');
  const [error, setError] = useState('');

  // Don't show actions if already decided
  if (status === 'ACCEPTED' || status === 'REFUSED') {
    return null;
  }

  const handleAccept = async () => {
    setIsAccepting(true);
    setError('');

    try {
      const res = await fetch(`/api/public/proposals/${token}/accept`, {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erreur lors de l\'acceptation');
        return;
      }

      onStatusChange('ACCEPTED');
    } catch {
      setError('Erreur de connexion');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleRefuse = async () => {
    setIsRefusing(true);
    setError('');

    try {
      const res = await fetch(`/api/public/proposals/${token}/refuse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: refuseReason.trim() || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erreur lors du refus');
        return;
      }

      onStatusChange('REFUSED');
      setShowRefuseModal(false);
    } catch {
      setError('Erreur de connexion');
    } finally {
      setIsRefusing(false);
    }
  };

  return (
    <>
      {/* Action buttons */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Votre décision
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Après avoir examiné cette proposition, vous pouvez l&apos;accepter ou la refuser.
        </p>

        {error && (
          <p className="text-sm text-red-600 mb-4">{error}</p>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleAccept}
            disabled={isAccepting || isRefusing}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{ backgroundColor: accentColor }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            {isAccepting ? 'Acceptation...' : 'Accepter la proposition'}
          </button>

          <button
            onClick={() => setShowRefuseModal(true)}
            disabled={isAccepting || isRefusing}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
            Refuser
          </button>
        </div>
      </div>

      {/* Refuse modal */}
      {showRefuseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Refuser la proposition
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Vous pouvez indiquer une raison pour aider à améliorer les futures propositions.
            </p>

            <textarea
              placeholder="Raison du refus (optionnel)..."
              value={refuseReason}
              onChange={(e) => setRefuseReason(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-gray-300 mb-4"
              rows={3}
              maxLength={500}
            />

            {error && (
              <p className="text-sm text-red-600 mb-4">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRefuseModal(false);
                  setRefuseReason('');
                  setError('');
                }}
                disabled={isRefusing}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleRefuse}
                disabled={isRefusing}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg disabled:opacity-50 transition-colors"
              >
                {isRefusing ? 'Refus...' : 'Confirmer le refus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
