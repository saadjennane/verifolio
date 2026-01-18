'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BadgeSelector } from '@/components/ui/BadgeSelector';
import { TagColorPicker } from '@/components/ui/TagColorPicker';
import { StructureTemplateModal } from '@/components/modals/StructureTemplateModal';
import { CreateBriefModal } from '@/components/modals/CreateBriefModal';
import { CreateTaskModal } from '@/components/modals/CreateTaskModal';
import { DealContactsEditor } from '@/components/deals/DealContactsEditor';
import { DealPOUploader } from '@/components/deals/DealPOUploader';
import { AdminChecklist, type ChecklistItem } from '@/components/ui/AdminChecklist';
import { useTabsStore } from '@/lib/stores/tabs-store';
import { getCurrencySymbol } from '@/lib/utils/currency';
import { getTagColorClass, type TagColor } from '@/lib/constants/badges-tags';
import type { DealWithRelations } from '@/lib/deals';
import type { EntityDocument } from '@/lib/supabase/types';
import type { BriefListItem } from '@/lib/briefs/types';
import { BRIEF_STATUS_LABELS, BRIEF_STATUS_VARIANTS } from '@/lib/briefs/types';

const statusVariants: Record<string, 'gray' | 'blue' | 'green' | 'yellow' | 'red'> = {
  new: 'blue',
  draft: 'gray',
  sent: 'yellow',
  won: 'green',
  lost: 'red',
  archived: 'gray',
};

const statusLabels: Record<string, string> = {
  new: 'Nouveau',
  draft: 'Brouillon',
  sent: 'Envoyé',
  won: 'Gagné',
  lost: 'Perdu',
  archived: 'Archivé',
};

interface DealDetailTabProps {
  dealId: string;
}

export function DealDetailTab({ dealId }: DealDetailTabProps) {
  const { openTab, closeTab, activeTabId } = useTabsStore();
  const [deal, setDeal] = useState<DealWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [newTag, setNewTag] = useState('');
  const [tagColor, setTagColor] = useState<TagColor>('gray');
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [showBriefModal, setShowBriefModal] = useState(false);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);

  // Briefs linked to this deal
  const [briefs, setBriefs] = useState<BriefListItem[]>([]);

  // Checklist admin state
  const [hasPO, setHasPO] = useState(false);

  useEffect(() => {
    loadDeal();
    loadPOStatus();
    loadBriefs();
  }, [dealId]);

  async function loadDeal() {
    setLoading(true);
    try {
      const res = await fetch(`/api/deals/${dealId}`);
      if (!res.ok) throw new Error('Failed to load deal');

      const data = await res.json();
      setDeal(data.deal);
    } catch (error) {
      console.error('Error loading deal:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadPOStatus() {
    try {
      const res = await fetch(`/api/entity-documents?entityType=DEAL&entityId=${dealId}`);
      const data = await res.json();
      if (res.ok && data.data) {
        const poDocuments = data.data.filter((doc: EntityDocument) => doc.doc_kind === 'PO');
        setHasPO(poDocuments.length > 0);
      }
    } catch (error) {
      console.error('Error loading PO status:', error);
    }
  }

  async function loadBriefs() {
    try {
      const res = await fetch(`/api/briefs?deal_id=${dealId}`);
      const data = await res.json();
      if (res.ok && data.data) {
        setBriefs(data.data);
      }
    } catch (error) {
      console.error('Error loading briefs:', error);
    }
  }

  async function updateStatus(newStatus: string) {
    try {
      // Vérifier les documents si on passe en SENT
      if (newStatus === 'sent' && deal?.status !== 'sent') {
        const hasDocuments = await checkDocuments();
        if (!hasDocuments) {
          const confirmed = window.confirm(
            `Souhaitez-vous marquer ce deal comme envoyé même si vous n'avez pas envoyé de proposition ou devis ?`
          );
          if (!confirmed) {
            return;
          }
        }
      }

      const res = await fetch(`/api/deals/${dealId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || 'Erreur lors du changement de statut');
        return;
      }

      await loadDeal();

      // Si passage en WON, proposer de créer une mission
      if (newStatus === 'won') {
        const createMission = window.confirm(
          'Deal gagné ! Souhaitez-vous créer une mission pour ce deal ?\n\n' +
          'La mission permettra de suivre la réalisation du projet, de lier des factures et de demander des avis clients.'
        );

        if (createMission) {
          try {
            const missionRes = await fetch(`/api/deals/${dealId}/create-mission`, {
              method: 'POST',
            });

            const missionData = await missionRes.json();

            if (!missionRes.ok) {
              alert(missionData.error || 'Erreur lors de la création de la mission');
            } else {
              // Afficher un message selon si la mission était déjà créée ou non
              if (missionData.message) {
                alert(missionData.message); // "Une mission existe déjà pour ce deal"
              } else {
                alert('Mission créée avec succès !');
              }
              await loadDeal();
            }
          } catch (error) {
            console.error('Error creating mission:', error);
            alert('Erreur lors de la création de la mission');
          }
        }
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Erreur lors du changement de statut');
    }
  }

  async function checkDocuments(): Promise<boolean> {
    try {
      const res = await fetch(`/api/deals/${dealId}/check-documents`);
      if (!res.ok) return true;
      const data = await res.json();
      return data.hasAnyDocument;
    } catch (error) {
      console.error('Error checking documents:', error);
      return true;
    }
  }

  async function backToDraft() {
    try {
      const res = await fetch(`/api/deals/${dealId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ back_to_draft: true }),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || 'Erreur');
        return;
      }

      await loadDeal();
    } catch (error) {
      console.error('Error:', error);
      alert('Erreur');
    }
  }

  async function addTag() {
    if (!newTag.trim() || !deal) return;

    const tagToAdd = newTag.trim();
    const colorToAdd = tagColor;
    const tempId = `temp-${Date.now()}`;

    // Optimistic update - add tag to local state immediately
    setDeal(prev => prev ? {
      ...prev,
      tags: [...(prev.tags || []), {
        id: tempId,
        deal_id: dealId,
        tag: tagToAdd,
        color: colorToAdd,
        created_at: new Date().toISOString(),
      }]
    } : null);
    setNewTag('');
    setTagColor('gray');

    try {
      const res = await fetch(`/api/deals/${dealId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: tagToAdd, color: colorToAdd }),
      });

      if (!res.ok) {
        // Revert on error
        setDeal(prev => prev ? {
          ...prev,
          tags: (prev.tags || []).filter(t => t.tag !== tagToAdd)
        } : null);
        throw new Error('Failed to add tag');
      }
    } catch (error) {
      console.error('Error adding tag:', error);
    }
  }

  async function removeTag(tag: string) {
    if (!deal) return;

    // Save previous state for rollback
    const previousTags = deal.tags || [];

    // Optimistic update - remove tag from local state immediately
    setDeal(prev => prev ? {
      ...prev,
      tags: (prev.tags || []).filter(t => t.tag !== tag)
    } : null);

    try {
      const res = await fetch(`/api/deals/${dealId}/tags?tag=${encodeURIComponent(tag)}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        // Revert on error
        setDeal(prev => prev ? { ...prev, tags: previousTags } : null);
        throw new Error('Failed to remove tag');
      }
    } catch (error) {
      console.error('Error removing tag:', error);
    }
  }

  async function addBadge(badge: string, variant: string) {
    if (!deal) return;

    const tempId = `temp-${Date.now()}`;

    // Optimistic update - add badge to local state immediately
    setDeal(prev => prev ? {
      ...prev,
      badges: [...(prev.badges || []), {
        id: tempId,
        deal_id: dealId,
        badge,
        variant,
        created_at: new Date().toISOString(),
      }]
    } : null);

    try {
      const res = await fetch(`/api/deals/${dealId}/badges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ badge, variant }),
      });

      if (!res.ok) {
        // Revert on error
        setDeal(prev => prev ? {
          ...prev,
          badges: (prev.badges || []).filter(b => b.badge !== badge)
        } : null);
        throw new Error('Failed to add badge');
      }
    } catch (error) {
      console.error('Error adding badge:', error);
    }
  }

  async function removeBadge(badge: string) {
    if (!deal) return;

    // Save previous state for rollback
    const previousBadges = deal.badges || [];

    // Optimistic update - remove badge from local state immediately
    setDeal(prev => prev ? {
      ...prev,
      badges: (prev.badges || []).filter(b => b.badge !== badge)
    } : null);

    try {
      const res = await fetch(`/api/deals/${dealId}/badges?badge=${encodeURIComponent(badge)}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        // Revert on error
        setDeal(prev => prev ? { ...prev, badges: previousBadges } : null);
        throw new Error('Failed to remove badge');
      }
    } catch (error) {
      console.error('Error removing badge:', error);
    }
  }

  function formatDate(dateString: string | null) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatAmount(amount: number | null | undefined, currency: string = 'EUR') {
    if (!amount) return '-';
    const symbol = getCurrencySymbol(currency);
    return `${Number(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ${symbol}`;
  }

  function handleBack() {
    if (activeTabId) {
      closeTab(activeTabId);
    }
    openTab({ type: 'deals', path: '/deals', title: 'Deals' }, true);
  }

  function handleCreateQuote() {
    openTab(
      {
        type: 'new-quote-for-deal',
        path: `/deals/${dealId}/new-quote`,
        title: 'Nouveau devis',
        entityId: dealId,
      },
      true
    );
  }

  function handleProposalCreated(proposalId: string) {
    // Ouvrir la proposition dans un nouvel onglet
    openTab(
      {
        type: 'proposal',
        path: `/proposals/${proposalId}`,
        title: 'Proposition',
        entityId: proposalId,
      },
      true
    );

    // Recharger le deal pour voir le nouveau document
    loadDeal();
  }

  function handleBriefCreated(briefId: string) {
    // Ouvrir le brief dans un nouvel onglet
    openTab(
      {
        type: 'brief',
        path: `/briefs/${briefId}`,
        title: 'Brief',
        entityId: briefId,
      },
      true
    );

    // Recharger les briefs
    loadBriefs();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!deal) {
    return <div className="p-6">Deal introuvable</div>;
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{deal.title}</h1>
          <Badge variant={statusVariants[deal.status]}>
            {statusLabels[deal.status]}
          </Badge>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateTaskModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="Creer un todo"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            Todo
          </button>
          <Button variant="outline" onClick={handleBack}>
            Retour
          </Button>
          <Button onClick={() => openTab({
            type: 'edit-deal',
            path: `/deals/${dealId}/edit`,
            title: 'Modifier le deal',
            entityId: dealId,
          }, true)}>
            Modifier
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Informations principales */}
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations</h2>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-500">Client</div>
                <div className="font-medium text-gray-900">
                  {deal.client ? (
                    <button
                      onClick={() => openTab({
                        type: 'client',
                        path: `/clients/${deal.client!.id}`,
                        title: deal.client!.nom,
                        entityId: deal.client!.id,
                      })}
                      className="text-blue-600 hover:underline"
                    >
                      {deal.client.nom}
                    </button>
                  ) : '-'}
                </div>
              </div>
              {deal.mission && (
                <div>
                  <div className="text-sm text-gray-500">Mission</div>
                  <div className="font-medium text-gray-900">
                    <button
                      onClick={() => openTab({
                        type: 'mission',
                        path: `/missions/${deal.mission!.id}`,
                        title: deal.mission!.title,
                        entityId: deal.mission!.id,
                      })}
                      className="text-blue-600 hover:underline"
                    >
                      {deal.mission.title}
                    </button>
                  </div>
                </div>
              )}
              <div>
                <div className="text-sm text-gray-500">Montant estimé HT</div>
                <div className="font-medium text-gray-900">{formatAmount(deal.estimated_amount, deal.currency || 'EUR')}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Date de création</div>
                <div className="text-gray-900">{formatDate(deal.created_at)}</div>
              </div>
              {deal.sent_at && (
                <div>
                  <div className="text-sm text-gray-500">Date d'envoi</div>
                  <div className="text-gray-900">{formatDate(deal.sent_at)}</div>
                </div>
              )}
              {deal.won_at && (
                <div>
                  <div className="text-sm text-gray-500">Date de gain</div>
                  <div className="text-gray-900">{formatDate(deal.won_at)}</div>
                </div>
              )}
              {deal.lost_at && (
                <div>
                  <div className="text-sm text-gray-500">Date de perte</div>
                  <div className="text-gray-900">{formatDate(deal.lost_at)}</div>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Changement de statut */}
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Gestion du statut</h2>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {deal.status === 'new' && (
                  <>
                    <Button size="sm" onClick={() => updateStatus('draft')}>
                      Passer en brouillon
                    </Button>
                    <Button size="sm" onClick={() => updateStatus('sent')}>
                      Marquer envoyé
                    </Button>
                  </>
                )}
                {deal.status === 'draft' && (
                  <Button size="sm" onClick={() => updateStatus('sent')}>
                    Marquer envoyé
                  </Button>
                )}
                {deal.status === 'sent' && (
                  <>
                    <Button size="sm" variant="secondary" onClick={backToDraft}>
                      Retour brouillon
                    </Button>
                    <Button size="sm" onClick={() => updateStatus('won')}>
                      Marquer gagné
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => updateStatus('lost')}>
                      Marquer perdu
                    </Button>
                  </>
                )}
                {(deal.status === 'won' || deal.status === 'lost') && (
                  <Button size="sm" variant="secondary" onClick={() => updateStatus('archived')}>
                    Archiver
                  </Button>
                )}
              </div>
              {deal.status === 'sent' && (
                <p className="text-sm text-gray-600">
                  Un deal ne peut être gagné que depuis le statut ENVOYÉ
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Description */}
        {deal.description && (
          <Card className="lg:col-span-2">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Description</h2>
              <p className="whitespace-pre-wrap text-gray-900">{deal.description}</p>
            </div>
          </Card>
        )}

        {/* Checklist admin */}
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Checklist admin</h2>
            {(() => {
              // Vérifier si au moins un devis a été envoyé
              const hasQuoteSent = deal.documents?.some(
                (d) => d.document_type === 'quote' && d.quote?.status === 'envoye'
              ) || false;

              const checklistItems: ChecklistItem[] = [
                {
                  label: 'Devis envoyé',
                  checked: hasQuoteSent,
                  linkText: 'Voir',
                  onLinkClick: hasQuoteSent
                    ? () => {
                        const sentQuote = deal.documents?.find(
                          (d) => d.document_type === 'quote' && d.quote?.status === 'envoye'
                        );
                        if (sentQuote?.quote_id) {
                          openTab({
                            type: 'quote',
                            path: `/quotes/${sentQuote.quote_id}`,
                            title: `Devis ${sentQuote.quote?.numero || ''}`,
                            entityId: sentQuote.quote_id,
                          });
                        }
                      }
                    : undefined,
                },
                {
                  label: 'Bon de commande reçu',
                  checked: hasPO,
                  linkText: 'Voir',
                  onLinkClick: hasPO
                    ? () => {
                        // Scroll to PO section (or just focus on it)
                        const poSection = document.querySelector('[data-section="po"]');
                        poSection?.scrollIntoView({ behavior: 'smooth' });
                      }
                    : undefined,
                },
              ];

              return <AdminChecklist items={checklistItems} />;
            })()}
          </div>
        </Card>

        {/* Contacts */}
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Contacts</h2>
            <DealContactsEditor dealId={dealId} onUpdate={loadDeal} />
          </div>
        </Card>

        {/* Bon de commande (PO) */}
        <Card data-section="po">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Bon de commande</h2>
            <DealPOUploader dealId={dealId} onUploadComplete={loadPOStatus} />
          </div>
        </Card>

        {/* Documents */}
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Documents</h2>

            {/* Briefs */}
            {briefs.length > 0 && (
              <div className="mb-4">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Briefs</h3>
                <ul className="space-y-2">
                  {briefs.map((brief) => (
                    <li key={brief.id}>
                      <button
                        onClick={() => openTab({
                          type: 'brief',
                          path: `/briefs/${brief.id}`,
                          title: brief.title,
                          entityId: brief.id,
                        })}
                        className="w-full text-left p-2 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant={BRIEF_STATUS_VARIANTS[brief.status]}>
                            {BRIEF_STATUS_LABELS[brief.status]}
                          </Badge>
                          <span className="font-medium text-gray-900">{brief.title}</span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Devis et Propositions */}
            {deal.documents && deal.documents.length > 0 ? (
              <div className="space-y-4">
                {/* Devis */}
                {deal.documents.filter(d => d.document_type === 'quote').length > 0 && (
                  <div>
                    <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Devis</h3>
                    <ul className="space-y-2">
                      {deal.documents.filter(d => d.document_type === 'quote').map((d) => (
                        <li key={d.id}>
                          <button
                            onClick={() => d.quote_id && openTab({
                              type: 'quote',
                              path: `/quotes/${d.quote_id}`,
                              title: d.quote?.numero ? `Devis ${d.quote.numero}` : 'Devis',
                              entityId: d.quote_id,
                            })}
                            className="w-full text-left p-2 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <Badge variant={
                                d.quote?.status === 'envoye' ? 'yellow' :
                                d.quote?.status === 'accepte' ? 'green' :
                                d.quote?.status === 'refuse' ? 'red' : 'gray'
                              }>
                                {d.quote?.status === 'brouillon' ? 'Brouillon' :
                                 d.quote?.status === 'envoye' ? 'Envoyé' :
                                 d.quote?.status === 'accepte' ? 'Accepté' :
                                 d.quote?.status === 'refuse' ? 'Refusé' : 'Brouillon'}
                              </Badge>
                              <span className="font-medium text-gray-900">
                                {d.quote?.numero || `Devis #${d.quote_id?.slice(0, 8)}`}
                              </span>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Propositions */}
                {deal.documents.filter(d => d.document_type === 'proposal').length > 0 && (
                  <div>
                    <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Propositions</h3>
                    <ul className="space-y-2">
                      {deal.documents.filter(d => d.document_type === 'proposal').map((d) => (
                        <li key={d.id}>
                          <button
                            onClick={() => d.proposal_id && openTab({
                              type: 'proposal',
                              path: `/proposals/${d.proposal_id}`,
                              title: d.proposal?.title || 'Proposition',
                              entityId: d.proposal_id,
                            })}
                            className="w-full text-left p-2 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <Badge variant={
                                d.proposal?.status === 'SENT' ? 'yellow' :
                                d.proposal?.status === 'ACCEPTED' ? 'green' :
                                d.proposal?.status === 'REFUSED' ? 'red' : 'gray'
                              }>
                                {d.proposal?.status === 'DRAFT' ? 'Brouillon' :
                                 d.proposal?.status === 'SENT' ? 'Envoyé' :
                                 d.proposal?.status === 'ACCEPTED' ? 'Accepté' :
                                 d.proposal?.status === 'REFUSED' ? 'Refusé' : 'Brouillon'}
                              </Badge>
                              <span className="font-medium text-gray-900">
                                {d.proposal?.title || `Proposition #${d.proposal_id?.slice(0, 8)}`}
                              </span>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : briefs.length === 0 ? (
              <p className="text-sm text-gray-500">Aucun document</p>
            ) : null}

            <div className="flex flex-wrap gap-2 mt-4">
              <Button size="sm" onClick={handleCreateQuote}>
                + Créer un devis
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setShowProposalModal(true)}>
                + Créer une proposition
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setShowBriefModal(true)}>
                + Créer un brief
              </Button>
            </div>
          </div>
        </Card>

        {/* Tags */}
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Tags</h2>
            <div className="flex flex-wrap gap-2 mb-3">
              {deal.tags && deal.tags.length > 0 ? (
                deal.tags.map((t) => (
                  <span
                    key={t.tag}
                    className={`${getTagColorClass(t.color || 'gray')} px-3 py-1 rounded-full text-sm cursor-pointer`}
                    onClick={() => removeTag(t.tag)}
                  >
                    {t.tag} ×
                  </span>
                ))
              ) : (
                <p className="text-sm text-gray-500">Aucun tag</p>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTag()}
                placeholder="Nouveau tag"
                className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm"
              />
              <TagColorPicker selectedColor={tagColor} onColorChange={setTagColor} />
              <Button size="sm" onClick={addTag}>
                Ajouter
              </Button>
            </div>
          </div>
        </Card>

        {/* Badges */}
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Badges</h2>
            <div className="flex flex-wrap gap-2 mb-3">
              {deal.badges && deal.badges.length > 0 ? (
                deal.badges.map((b) => {
                  const isAutomatic = b.badge === 'EN RETARD';
                  return (
                    <Badge
                      key={b.badge}
                      variant={b.variant as any || 'gray'}
                      className={isAutomatic ? '' : 'cursor-pointer'}
                      onClick={isAutomatic ? undefined : () => removeBadge(b.badge)}
                    >
                      {b.badge} {!isAutomatic && '×'}
                    </Badge>
                  );
                })
              ) : (
                <p className="text-sm text-gray-500">Aucun badge</p>
              )}
            </div>
            <BadgeSelector
              onSelect={addBadge}
              existingBadges={deal.badges?.map(b => b.badge) || []}
            />
          </div>
        </Card>
      </div>

      {/* Modal de création de proposition */}
      <StructureTemplateModal
        isOpen={showProposalModal}
        onClose={() => setShowProposalModal(false)}
        dealId={dealId}
        clientId={deal.client_id || undefined}
        onCreated={handleProposalCreated}
      />

      {/* Modal de création de brief */}
      <CreateBriefModal
        isOpen={showBriefModal}
        onClose={() => setShowBriefModal(false)}
        dealId={dealId}
        dealTitle={deal.title}
        onCreated={handleBriefCreated}
      />

      {/* Modal creation todo */}
      <CreateTaskModal
        isOpen={showCreateTaskModal}
        onClose={() => setShowCreateTaskModal(false)}
        entityType="deal"
        entityId={dealId}
        entityName={deal.title}
      />
    </div>
  );
}
