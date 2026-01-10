'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Badge } from '@/components/ui';
import type { ProposalWithDetails, ProposalStatus } from '@/lib/types/proposals';

const STATUS_LABELS: Record<ProposalStatus, { label: string; color: 'gray' | 'blue' | 'yellow' | 'green' | 'red' }> = {
  DRAFT: { label: 'Brouillon', color: 'gray' },
  SENT: { label: 'Envoyée', color: 'blue' },
  ACCEPTED: { label: 'Acceptée', color: 'green' },
  REFUSED: { label: 'Refusée', color: 'red' },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ProposalDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  const [proposal, setProposal] = useState<ProposalWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchProposal = async () => {
      try {
        const res = await fetch(`/api/proposals/${id}`);
        const data = await res.json();

        if (res.ok) {
          setProposal(data.data);
        } else {
          setError(data.error || 'Proposition non trouvée');
        }
      } catch {
        setError('Erreur de connexion');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProposal();
  }, [id]);

  const handleCopyLink = async () => {
    if (!proposal) return;

    const link = `${window.location.origin}/p/${proposal.public_token}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStatusChange = async (newStatus: ProposalStatus) => {
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/proposals/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        const data = await res.json();
        setProposal((prev) => prev ? { ...prev, ...data.data } : null);
      } else {
        const data = await res.json();
        setError(data.error || 'Erreur');
      }
    } catch {
      setError('Erreur de connexion');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/proposals/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        router.push('/proposals/templates');
      } else {
        const data = await res.json();
        setError(data.error || 'Erreur de suppression');
      }
    } catch {
      setError('Erreur de connexion');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">{error || 'Proposition non trouvée'}</p>
          <Button variant="secondary" onClick={() => router.push('/proposals/templates')}>
            Retour
          </Button>
        </div>
      </div>
    );
  }

  const statusInfo = STATUS_LABELS[proposal.status];

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/proposals/templates')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Proposition</h1>
              <p className="text-sm text-gray-500">pour {proposal.client?.nom}</p>
            </div>
          </div>
          <Badge variant={statusInfo.color}>{statusInfo.label}</Badge>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Quick actions */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleCopyLink}>
              {copied ? '✓ Copié !' : 'Copier le lien'}
            </Button>
            <Link href={`/p/${proposal.public_token}`} target="_blank">
              <Button variant="secondary">Voir la page publique →</Button>
            </Link>
            {proposal.status === 'DRAFT' && (
              <Button
                variant="secondary"
                onClick={() => handleStatusChange('SENT')}
                loading={isUpdatingStatus}
              >
                Marquer comme envoyée
              </Button>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Détails</h2>
          <dl className="space-y-4">
            <div className="flex justify-between">
              <dt className="text-gray-500">Client</dt>
              <dd className="font-medium text-gray-900">
                <Link href={`/clients/${proposal.client_id}`} className="text-blue-600 hover:underline">
                  {proposal.client?.nom}
                </Link>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Template</dt>
              <dd className="font-medium text-gray-900">
                <Link href={`/proposals/templates/${proposal.template_id}`} className="text-blue-600 hover:underline">
                  {proposal.template?.name}
                </Link>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Créée le</dt>
              <dd className="text-gray-900">
                {new Date(proposal.created_at).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </dd>
            </div>
            {proposal.sent_at && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Envoyée le</dt>
                <dd className="text-gray-900">
                  {new Date(proposal.sent_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </dd>
              </div>
            )}
            {proposal.accepted_at && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Acceptée le</dt>
                <dd className="text-green-600 font-medium">
                  {new Date(proposal.accepted_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </dd>
              </div>
            )}
            {proposal.refused_at && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Refusée le</dt>
                <dd className="text-red-600 font-medium">
                  {new Date(proposal.refused_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </dd>
              </div>
            )}
{proposal.deal && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Deal lié</dt>
                <dd className="text-blue-600">
                  <Link href={`/deals/${proposal.deal_id}`} className="hover:underline">
                    {proposal.deal.title} →
                  </Link>
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Recipients */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Destinataires ({proposal.recipients?.length || 0})
          </h2>
          {proposal.recipients && proposal.recipients.length > 0 ? (
            <ul className="space-y-3">
              {proposal.recipients.map((recipient) => (
                <li key={recipient.id} className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-600">
                      {recipient.contact?.prenom?.[0] || recipient.contact?.nom?.[0] || '?'}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {recipient.contact?.prenom
                        ? `${recipient.contact.prenom} ${recipient.contact.nom}`
                        : recipient.contact?.nom}
                    </p>
                    {recipient.contact?.email && (
                      <p className="text-sm text-gray-500">{recipient.contact.email}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">Aucun destinataire</p>
          )}
        </div>

        {/* Variables */}
        {proposal.variables && proposal.variables.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Variables</h2>
            <dl className="space-y-2">
              {proposal.variables.map((variable) => (
                <div key={variable.id} className="flex justify-between">
                  <dt className="text-gray-500 font-mono text-sm">{`{{${variable.key}}}`}</dt>
                  <dd className="text-gray-900">{variable.value || '(vide)'}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {/* Danger zone */}
        <div className="bg-white rounded-lg border border-red-200 p-6">
          <h2 className="text-lg font-semibold text-red-600 mb-4">Zone de danger</h2>
          <p className="text-sm text-gray-600 mb-4">
            La suppression de cette proposition est irréversible.
          </p>
          <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
            Supprimer la proposition
          </Button>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Supprimer cette proposition ?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Cette action est irréversible. Tous les commentaires et données associées seront supprimés.
            </p>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Annuler
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={handleDelete}
                loading={isDeleting}
              >
                Supprimer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
