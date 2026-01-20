'use client';

import { useEffect, useState, use } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TasksSection } from '@/components/tasks';
import type { DealWithRelations } from '@/lib/deals';

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

export default function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [deal, setDeal] = useState<DealWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [newTag, setNewTag] = useState('');
  const [newBadge, setNewBadge] = useState('');
  const [newBadgeVariant, setNewBadgeVariant] = useState<'gray' | 'blue' | 'green' | 'yellow' | 'red'>('gray');

  useEffect(() => {
    loadDeal();
  }, [id]);

  async function loadDeal() {
    setLoading(true);
    try {
      const res = await fetch(`/api/deals/${id}`);
      if (!res.ok) throw new Error('Failed to load deal');

      const data = await res.json();
      setDeal(data.deal);
    } catch (error) {
      console.error('Error loading deal:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(newStatus: string) {
    try {
      const res = await fetch(`/api/deals/${id}/status`, {
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
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Erreur lors du changement de statut');
    }
  }

  async function backToDraft() {
    try {
      const res = await fetch(`/api/deals/${id}/status`, {
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
    if (!newTag.trim()) return;

    const tagToAdd = newTag.trim();
    const tempId = `temp-${Date.now()}`;

    // Optimistic update with full DealTag shape
    setDeal(prev => prev ? {
      ...prev,
      tags: [...(prev.tags || []), {
        id: tempId,
        deal_id: id,
        tag: tagToAdd,
        color: 'gray',
        created_at: new Date().toISOString(),
      }]
    } : null);
    setNewTag('');

    try {
      const res = await fetch(`/api/deals/${id}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: tagToAdd }),
      });

      if (!res.ok) {
        // Rollback on error
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
    // Store for rollback
    const previousTags = deal?.tags || [];

    // Optimistic update
    setDeal(prev => prev ? {
      ...prev,
      tags: (prev.tags || []).filter(t => t.tag !== tag)
    } : null);

    try {
      const res = await fetch(`/api/deals/${id}/tags?tag=${encodeURIComponent(tag)}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        // Rollback on error
        setDeal(prev => prev ? { ...prev, tags: previousTags } : null);
        throw new Error('Failed to remove tag');
      }
    } catch (error) {
      console.error('Error removing tag:', error);
    }
  }

  async function addBadge() {
    if (!newBadge.trim()) return;

    const badgeToAdd = newBadge.trim();
    const variantToAdd = newBadgeVariant;
    const tempId = `temp-${Date.now()}`;

    // Optimistic update with full DealBadge shape
    setDeal(prev => prev ? {
      ...prev,
      badges: [...(prev.badges || []), {
        id: tempId,
        deal_id: id,
        badge: badgeToAdd,
        variant: variantToAdd,
        created_at: new Date().toISOString(),
      }]
    } : null);
    setNewBadge('');
    setNewBadgeVariant('gray');

    try {
      const res = await fetch(`/api/deals/${id}/badges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ badge: badgeToAdd, variant: variantToAdd }),
      });

      if (!res.ok) {
        // Rollback on error
        setDeal(prev => prev ? {
          ...prev,
          badges: (prev.badges || []).filter(b => b.badge !== badgeToAdd)
        } : null);
        throw new Error('Failed to add badge');
      }
    } catch (error) {
      console.error('Error adding badge:', error);
    }
  }

  async function removeBadge(badge: string) {
    // Store for rollback
    const previousBadges = deal?.badges || [];

    // Optimistic update
    setDeal(prev => prev ? {
      ...prev,
      badges: (prev.badges || []).filter(b => b.badge !== badge)
    } : null);

    try {
      const res = await fetch(`/api/deals/${id}/badges?badge=${encodeURIComponent(badge)}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        // Rollback on error
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

  function formatAmount(amount: number | null | undefined) {
    if (!amount) return '-';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  }

  if (loading) {
    return <div className="p-6">Chargement...</div>;
  }

  if (!deal) {
    return <div className="p-6">Deal introuvable</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">{deal.title}</h1>
          <Badge variant={statusVariants[deal.status]}>
            {statusLabels[deal.status]}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.location.href = '/deals'}>
            Retour
          </Button>
          <Button onClick={() => window.location.href = `/deals/${id}/edit`}>
            Modifier
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Informations principales */}
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Informations</h2>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-500">Client</div>
                <div className="font-medium">
                  {deal.client ? deal.client.nom : '-'}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Montant estimé HT</div>
                <div className="font-medium">{formatAmount(deal.estimated_amount)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Date de création</div>
                <div>{formatDate(deal.created_at)}</div>
              </div>
              {deal.sent_at && (
                <div>
                  <div className="text-sm text-gray-500">Date d'envoi</div>
                  <div>{formatDate(deal.sent_at)}</div>
                </div>
              )}
              {deal.won_at && (
                <div>
                  <div className="text-sm text-gray-500">Date de gain</div>
                  <div>{formatDate(deal.won_at)}</div>
                </div>
              )}
              {deal.lost_at && (
                <div>
                  <div className="text-sm text-gray-500">Date de perte</div>
                  <div>{formatDate(deal.lost_at)}</div>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Changement de statut */}
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Gestion du statut</h2>
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
              <h2 className="text-lg font-semibold mb-4">Description</h2>
              <p className="whitespace-pre-wrap">{deal.description}</p>
            </div>
          </Card>
        )}

        {/* Contacts */}
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Contacts</h2>
            {deal.contacts && deal.contacts.length > 0 ? (
              <ul className="space-y-2">
                {deal.contacts.map((c) => (
                  <li key={c.contact_id} className="text-sm">
                    {c.contact?.nom || 'Contact inconnu'}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">Aucun contact</p>
            )}
          </div>
        </Card>

        {/* Documents */}
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Documents</h2>
            {deal.documents && deal.documents.length > 0 ? (
              <ul className="space-y-2">
                {deal.documents.map((d) => (
                  <li key={d.id} className="text-sm flex items-center gap-2">
                    <Badge variant="gray">{d.document_type}</Badge>
                    <span>
                      {d.document_type === 'quote' && d.quote_id && `Devis #${d.quote_id.slice(0, 8)}`}
                      {d.document_type === 'proposal' && d.proposal_id && `Proposition #${d.proposal_id.slice(0, 8)}`}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">Aucun document</p>
            )}
          </div>
        </Card>

        {/* Tags */}
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Tags</h2>
            <div className="flex flex-wrap gap-2 mb-3">
              {deal.tags && deal.tags.length > 0 ? (
                deal.tags.map((t) => (
                  <Badge
                    key={t.tag}
                    variant="gray"
                    className="cursor-pointer"
                    onClick={() => removeTag(t.tag)}
                  >
                    {t.tag} ×
                  </Badge>
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
              <Button size="sm" onClick={addTag}>
                Ajouter
              </Button>
            </div>
          </div>
        </Card>

        {/* Badges */}
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Badges</h2>
            <div className="flex flex-wrap gap-2 mb-3">
              {deal.badges && deal.badges.length > 0 ? (
                deal.badges.map((b) => (
                  <Badge
                    key={b.badge}
                    variant={b.variant as any || 'gray'}
                    className="cursor-pointer"
                    onClick={() => removeBadge(b.badge)}
                  >
                    {b.badge} ×
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-gray-500">Aucun badge</p>
              )}
            </div>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newBadge}
                onChange={(e) => setNewBadge(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addBadge()}
                placeholder="Nouveau badge"
                className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm"
              />
              <select
                value={newBadgeVariant}
                onChange={(e) => setNewBadgeVariant(e.target.value as any)}
                className="border border-gray-300 rounded px-3 py-1.5 text-sm"
              >
                <option value="gray">Gris</option>
                <option value="blue">Bleu</option>
                <option value="green">Vert</option>
                <option value="yellow">Jaune</option>
                <option value="red">Rouge</option>
              </select>
              <Button size="sm" onClick={addBadge}>
                Ajouter
              </Button>
            </div>
          </div>
        </Card>

        {/* Tâches */}
        <Card className="lg:col-span-2">
          <div className="p-6">
            <TasksSection entityType="deal" entityId={id} />
          </div>
        </Card>
      </div>
    </div>
  );
}
