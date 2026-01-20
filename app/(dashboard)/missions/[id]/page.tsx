'use client';

import { useEffect, useState, use } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Switch } from '@/components/ui/switch';
import { MissionTasksView } from '@/components/missions/MissionTasksView';
import { PaymentsTab } from '@/components/missions/PaymentsTab';
import type { MissionWithRelations } from '@/lib/missions';

const statusVariants: Record<string, 'gray' | 'blue' | 'green' | 'yellow' | 'red'> = {
  in_progress: 'blue',
  delivered: 'yellow',
  to_invoice: 'yellow',
  invoiced: 'blue',
  paid: 'green',
  closed: 'gray',
  cancelled: 'red',
};

const statusLabels: Record<string, string> = {
  in_progress: 'En cours',
  delivered: 'Livrée',
  to_invoice: 'À facturer',
  invoiced: 'Facturée',
  paid: 'Payée',
  closed: 'Clôturée',
  cancelled: 'Annulée',
};

export default function MissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [mission, setMission] = useState<MissionWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [newTag, setNewTag] = useState('');
  const [newBadge, setNewBadge] = useState('');
  const [newBadgeVariant, setNewBadgeVariant] = useState<'gray' | 'blue' | 'green' | 'yellow' | 'red'>('gray');
  const [editingContext, setEditingContext] = useState(false);
  const [missionContext, setMissionContext] = useState('');

  useEffect(() => {
    loadMission();
  }, [id]);

  async function loadMission() {
    setLoading(true);
    try {
      const res = await fetch(`/api/missions/${id}`);
      if (!res.ok) throw new Error('Failed to load mission');

      const data = await res.json();
      setMission(data.mission);
      setMissionContext(data.mission.mission_context || '');
    } catch (error) {
      console.error('Error loading mission:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(newStatus: string) {
    try {
      const res = await fetch(`/api/missions/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || 'Erreur lors du changement de statut');
        return;
      }

      await loadMission();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Erreur lors du changement de statut');
    }
  }

  async function toggleVerifolioVisibility() {
    if (!mission) return;

    try {
      const res = await fetch(`/api/missions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visible_on_verifolio: !mission.visible_on_verifolio }),
      });

      if (!res.ok) throw new Error('Failed to update visibility');

      await loadMission();
    } catch (error) {
      console.error('Error updating visibility:', error);
    }
  }

  async function addTag() {
    if (!newTag.trim()) return;

    try {
      const res = await fetch(`/api/missions/${id}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: newTag.trim() }),
      });

      if (!res.ok) throw new Error('Failed to add tag');

      setNewTag('');
      await loadMission();
    } catch (error) {
      console.error('Error adding tag:', error);
    }
  }

  async function removeTag(tag: string) {
    try {
      const res = await fetch(`/api/missions/${id}/tags?tag=${encodeURIComponent(tag)}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to remove tag');

      await loadMission();
    } catch (error) {
      console.error('Error removing tag:', error);
    }
  }

  async function addBadge() {
    if (!newBadge.trim()) return;

    try {
      const res = await fetch(`/api/missions/${id}/badges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ badge: newBadge.trim(), variant: newBadgeVariant }),
      });

      if (!res.ok) throw new Error('Failed to add badge');

      setNewBadge('');
      setNewBadgeVariant('gray');
      await loadMission();
    } catch (error) {
      console.error('Error adding badge:', error);
    }
  }

  async function removeBadge(badge: string) {
    try {
      const res = await fetch(`/api/missions/${id}/badges?badge=${encodeURIComponent(badge)}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to remove badge');

      await loadMission();
    } catch (error) {
      console.error('Error removing badge:', error);
    }
  }

  async function saveMissionContext() {
    try {
      const res = await fetch(`/api/missions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mission_context: missionContext }),
      });

      if (!res.ok) throw new Error('Failed to update mission context');

      await loadMission();
      setEditingContext(false);
      alert('Contexte mission sauvegardé');
    } catch (error) {
      console.error('Error updating mission context:', error);
      alert('Erreur lors de la sauvegarde du contexte');
    }
  }

  function checkVerifolioEligibility() {
    if (!mission) return { eligible: false, reasons: [] };

    const reasons: string[] = [];

    if (!mission.visible_on_verifolio) {
      reasons.push('Mission non marquée comme visible sur Verifolio');
    }

    if (!mission.mission_context || mission.mission_context.trim().length < 50) {
      reasons.push('Contexte mission requis (minimum 50 caractères)');
    }

    // Check for published reviews - we'll add this check via API later
    // For now, just check the context

    return {
      eligible: reasons.length === 0,
      reasons,
    };
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

  if (!mission) {
    return <div className="p-6">Mission introuvable</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">{mission.title}</h1>
          <Badge variant={statusVariants[mission.status]}>
            {statusLabels[mission.status]}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.location.href = '/missions'}>
            Retour
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
                  {mission.client ? mission.client.nom : '-'}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Deal origine</div>
                <div className="font-medium">
                  {mission.deal ? (
                    <a href={`/deals/${mission.deal_id}`} className="text-blue-600 hover:underline">
                      {mission.deal.title}
                    </a>
                  ) : '-'}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Montant estimé HT</div>
                <div className="font-medium">{formatAmount(mission.estimated_amount)}</div>
              </div>
              {mission.final_amount && (
                <div>
                  <div className="text-sm text-gray-500">Montant final HT</div>
                  <div className="font-medium">{formatAmount(mission.final_amount)}</div>
                </div>
              )}
              <div>
                <div className="text-sm text-gray-500">Date de création</div>
                <div>{formatDate(mission.created_at)}</div>
              </div>
              {mission.started_at && (
                <div>
                  <div className="text-sm text-gray-500">Date de début</div>
                  <div>{formatDate(mission.started_at)}</div>
                </div>
              )}
              {mission.delivered_at && (
                <div>
                  <div className="text-sm text-gray-500">Date de livraison</div>
                  <div>{formatDate(mission.delivered_at)}</div>
                </div>
              )}
              {mission.paid_at && (
                <div>
                  <div className="text-sm text-gray-500">Date de paiement complet</div>
                  <div>{formatDate(mission.paid_at)}</div>
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
                {mission.status === 'in_progress' && (
                  <Button size="sm" onClick={() => updateStatus('delivered')}>
                    Marquer livrée
                  </Button>
                )}
                {mission.status === 'to_invoice' && (
                  <p className="text-sm text-gray-600">
                    Lier une facture pour passer au statut FACTURÉE
                  </p>
                )}
                {['in_progress', 'delivered', 'to_invoice'].includes(mission.status) && (
                  <Button size="sm" variant="danger" onClick={() => updateStatus('cancelled')}>
                    Annuler la mission
                  </Button>
                )}
                {['invoiced', 'paid'].includes(mission.status) && (
                  <Button size="sm" variant="secondary" onClick={() => updateStatus('closed')}>
                    Clôturer
                  </Button>
                )}
              </div>
              <p className="text-sm text-gray-600">
                Note: DELIVERED → TO_INVOICE est automatique. INVOICED et PAID sont gérés automatiquement via les factures liées.
              </p>
            </div>
          </div>
        </Card>

        {/* Visibilité Verifolio */}
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Visibilité Verifolio</h2>
            <div className="flex items-center gap-3">
              <Switch
                checked={mission.visible_on_verifolio}
                onCheckedChange={toggleVerifolioVisibility}
              />
              <span className="text-sm">
                {mission.visible_on_verifolio ? 'Visible sur le Verifolio public' : 'Non visible sur le Verifolio'}
              </span>
            </div>
          </div>
        </Card>

        {/* Contexte Mission (pour Verifolio) */}
        <Card className="lg:col-span-2">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Contexte Mission (Verifolio)</h2>
              {!editingContext && (
                <Button size="sm" variant="outline" onClick={() => setEditingContext(true)}>
                  {mission.mission_context ? 'Modifier' : 'Ajouter'}
                </Button>
              )}
            </div>

            {editingContext ? (
              <div className="space-y-3">
                <textarea
                  value={missionContext}
                  onChange={(e) => setMissionContext(e.target.value)}
                  placeholder="Décrivez le contexte de cette mission pour votre Verifolio public (minimum 50 caractères)..."
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm min-h-[120px]"
                  rows={6}
                />
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${missionContext.length < 50 ? 'text-red-500' : 'text-gray-500'}`}>
                    {missionContext.length} / 50 caractères minimum
                  </span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => {
                      setMissionContext(mission?.mission_context || '');
                      setEditingContext(false);
                    }}>
                      Annuler
                    </Button>
                    <Button
                      size="sm"
                      onClick={saveMissionContext}
                      disabled={missionContext.length < 50}
                    >
                      Enregistrer
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                {mission.mission_context ? (
                  <p className="whitespace-pre-wrap text-sm">{mission.mission_context}</p>
                ) : (
                  <p className="text-sm text-gray-500 italic">
                    Aucun contexte défini. Ce contexte sera affiché sur votre page Verifolio publique pour décrire cette mission.
                  </p>
                )}
              </div>
            )}

            {/* Eligibility Indicator */}
            {(() => {
              const { eligible, reasons } = checkVerifolioEligibility();
              return (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  {eligible ? (
                    <div className="flex items-center gap-2 text-green-600 text-sm">
                      <span className="font-semibold">✓</span>
                      <span>Cette mission peut être affichée sur votre Verifolio</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-orange-600 text-sm font-semibold">
                        <span>⚠</span>
                        <span>Critères manquants pour affichage Verifolio:</span>
                      </div>
                      <ul className="list-disc list-inside text-sm text-gray-600 ml-4">
                        {reasons.map((reason, idx) => (
                          <li key={idx}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </Card>

        {/* Description */}
        {mission.description && (
          <Card className="lg:col-span-2">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">Description</h2>
              <p className="whitespace-pre-wrap">{mission.description}</p>
            </div>
          </Card>
        )}

        {/* Contacts */}
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Contacts</h2>
            {mission.contacts && mission.contacts.length > 0 ? (
              <ul className="space-y-2">
                {mission.contacts.map((c) => (
                  <li key={c.contact_id} className="text-sm flex items-center gap-2">
                    {c.is_primary && <Badge variant="blue">Principal</Badge>}
                    {c.contact?.nom || 'Contact inconnu'}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">Aucun contact</p>
            )}
          </div>
        </Card>

        {/* Factures */}
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Factures liées</h2>
            {mission.invoices && mission.invoices.length > 0 ? (
              <ul className="space-y-2">
                {mission.invoices.map((inv) => (
                  <li key={inv.invoice_id} className="text-sm flex items-center gap-2">
                    <Badge variant="gray">
                      {inv.invoice?.status === 'paid' ? 'Payée' : inv.invoice?.status === 'sent' ? 'Envoyée' : 'Brouillon'}
                    </Badge>
                    <span>{inv.invoice?.numero || `#${inv.invoice_id.slice(0, 8)}`}</span>
                    <span className="text-gray-500">{formatAmount(inv.invoice?.total_ttc)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">Aucune facture liée</p>
            )}
          </div>
        </Card>

        {/* Paiements */}
        <div className="lg:col-span-2">
          <PaymentsTab
            missionId={id}
            clientId={mission.client_id || undefined}
          />
        </div>

        {/* Tags */}
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Tags</h2>
            <div className="flex flex-wrap gap-2 mb-3">
              {mission.tags && mission.tags.length > 0 ? (
                mission.tags.map((t) => (
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
              {mission.badges && mission.badges.length > 0 ? (
                mission.badges.map((b) => (
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
      </div>

      {/* Section Taches Projet */}
      <div className="mt-6">
        <MissionTasksView
          missionId={id}
          missionClientId={mission.client_id || undefined}
        />
      </div>
    </div>
  );
}
