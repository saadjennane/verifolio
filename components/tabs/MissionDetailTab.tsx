'use client';

import { useEffect, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BadgeSelector } from '@/components/ui/BadgeSelector';
import { TagColorPicker } from '@/components/ui/TagColorPicker';
import { MissionContactsEditor } from '@/components/missions/MissionContactsEditor';
import { AdminChecklist, type ChecklistItem } from '@/components/ui/AdminChecklist';
import { EntityTasksSection } from '@/components/tasks/EntityTasksSection';
import { useTabsStore } from '@/lib/stores/tabs-store';
import { getCurrencySymbol } from '@/lib/utils/currency';
import { getTagColorClass, type TagColor } from '@/lib/constants/badges-tags';
import type { MissionWithRelations } from '@/lib/missions/types';
import type { DeliveryNote, EntityDocument } from '@/lib/supabase/types';

interface MissionDetailTabProps {
  missionId: string;
}

const statusLabels: Record<string, string> = {
  in_progress: 'En cours',
  delivered: 'Livrée',
  to_invoice: 'À facturer',
  invoiced: 'Facturée',
  paid: 'Payée',
  closed: 'Fermée',
  cancelled: 'Annulée',
};

const statusVariants: Record<string, 'gray' | 'blue' | 'green' | 'yellow' | 'red'> = {
  in_progress: 'blue',
  delivered: 'green',
  to_invoice: 'yellow',
  invoiced: 'yellow',
  paid: 'green',
  closed: 'gray',
  cancelled: 'red',
};

const invoiceStatusLabels: Record<string, string> = {
  brouillon: 'Brouillon',
  envoyee: 'Envoyée',
  payee: 'Payée',
  annulee: 'Annulée',
  supprimee: 'Supprimée',
};

const invoiceStatusVariants: Record<string, 'gray' | 'blue' | 'green' | 'yellow' | 'red'> = {
  brouillon: 'gray',
  envoyee: 'blue',
  payee: 'green',
  annulee: 'gray',
  supprimee: 'gray',
};

const deliveryNoteStatusLabels: Record<string, string> = {
  DRAFT: 'Brouillon',
  SENT: 'Envoyé',
  CANCELLED: 'Annulé',
};

const deliveryNoteStatusVariants: Record<string, 'gray' | 'blue' | 'green' | 'yellow' | 'red'> = {
  DRAFT: 'gray',
  SENT: 'green',
  CANCELLED: 'gray',
};

export function MissionDetailTab({ missionId }: MissionDetailTabProps) {
  const { closeTab, activeTabId, openTab } = useTabsStore();
  const [mission, setMission] = useState<MissionWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState('EUR');
  const [newTag, setNewTag] = useState('');
  const [tagColor, setTagColor] = useState<TagColor>('gray');

  // Bon de livraison state
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);
  const [loadingBL, setLoadingBL] = useState(false);
  const [creatingBL, setCreatingBL] = useState(false);
  const [blTitle, setBLTitle] = useState('');
  const [showBLForm, setShowBLForm] = useState(false);
  const [downloadingBL, setDownloadingBL] = useState<string | null>(null);

  // Pièces jointes (PO du deal)
  const [dealPO, setDealPO] = useState<EntityDocument | null>(null);
  const [loadingPO, setLoadingPO] = useState(false);

  useEffect(() => {
    loadMission();
    loadCurrency();
    loadDeliveryNotes();
  }, [missionId]);

  // Load PO when mission is loaded (need deal_id)
  useEffect(() => {
    if (mission?.deal_id) {
      loadDealPO(mission.deal_id);
    }
  }, [mission?.deal_id]);

  async function loadMission() {
    setLoading(true);
    try {
      const res = await fetch(`/api/missions/${missionId}`);
      const data = await res.json();

      if (res.ok && data.mission) {
        setMission(data.mission);
      } else {
        console.error('Error loading mission:', data.error);
      }
    } catch (error) {
      console.error('Error loading mission:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadCurrency() {
    try {
      const res = await fetch('/api/settings/currency');
      const json = await res.json();

      if (res.ok && json.data?.currency) {
        setCurrency(json.data.currency);
      }
    } catch (error) {
      console.error('Error loading currency:', error);
    }
  }

  async function loadDeliveryNotes() {
    setLoadingBL(true);
    try {
      const res = await fetch(`/api/missions/${missionId}/delivery-notes`);
      const data = await res.json();
      if (res.ok && data.data) {
        setDeliveryNotes(data.data);
      }
    } catch (error) {
      console.error('Error loading delivery notes:', error);
    } finally {
      setLoadingBL(false);
    }
  }

  async function loadDealPO(dealId: string) {
    setLoadingPO(true);
    try {
      const res = await fetch(`/api/entity-documents?entityType=DEAL&entityId=${dealId}`);
      const data = await res.json();
      if (res.ok && data.data) {
        // Filter PO documents and get the most recent one
        const poDocuments = data.data.filter((doc: EntityDocument) => doc.doc_kind === 'PO');
        if (poDocuments.length > 0) {
          poDocuments.sort(
            (a: EntityDocument, b: EntityDocument) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          setDealPO(poDocuments[0]);
        }
      }
    } catch (error) {
      console.error('Error loading deal PO:', error);
    } finally {
      setLoadingPO(false);
    }
  }

  async function createDeliveryNote() {
    if (!blTitle.trim()) return;
    setCreatingBL(true);
    try {
      const res = await fetch(`/api/missions/${missionId}/delivery-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: blTitle.trim() }),
      });
      if (res.ok) {
        setBLTitle('');
        setShowBLForm(false);
        await loadDeliveryNotes();
      } else {
        const data = await res.json();
        alert(data.error || 'Erreur lors de la création');
      }
    } catch (error) {
      console.error('Error creating delivery note:', error);
      alert('Erreur lors de la création');
    } finally {
      setCreatingBL(false);
    }
  }

  async function updateDeliveryNoteStatus(id: string, status: string) {
    try {
      const res = await fetch(`/api/delivery-notes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        await loadDeliveryNotes();
      } else {
        const data = await res.json();
        alert(data.error || 'Erreur');
      }
    } catch (error) {
      console.error('Error updating delivery note:', error);
    }
  }

  async function downloadDeliveryNotePDF(dn: DeliveryNote) {
    setDownloadingBL(dn.id);
    try {
      const response = await fetch(`/api/pdf/delivery-note/${dn.id}`);
      if (!response.ok) {
        throw new Error('Erreur lors du téléchargement');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${dn.delivery_note_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      alert('Erreur lors du téléchargement du PDF');
    } finally {
      setDownloadingBL(null);
    }
  }

  async function viewDealPO() {
    if (!dealPO) return;
    try {
      const res = await fetch(`/api/entity-documents/${dealPO.id}`);
      const data = await res.json();
      if (res.ok && data.url) {
        window.open(data.url, '_blank');
      } else {
        alert(data.error || 'Erreur');
      }
    } catch (error) {
      console.error('Error getting PO URL:', error);
    }
  }

  async function updateStatus(newStatus: string) {
    try {
      const res = await fetch(`/api/missions/${missionId}/status`, {
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

  async function addTag() {
    if (!newTag.trim()) return;

    try {
      const res = await fetch(`/api/missions/${missionId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: newTag.trim(), color: tagColor }),
      });

      if (!res.ok) throw new Error('Failed to add tag');

      setNewTag('');
      setTagColor('gray');
      await loadMission();
    } catch (error) {
      console.error('Error adding tag:', error);
    }
  }

  async function removeTag(tag: string) {
    try {
      const res = await fetch(`/api/missions/${missionId}/tags?tag=${encodeURIComponent(tag)}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to remove tag');

      await loadMission();
    } catch (error) {
      console.error('Error removing tag:', error);
    }
  }

  async function addBadge(badge: string, variant: string) {
    try {
      const res = await fetch(`/api/missions/${missionId}/badges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ badge, variant }),
      });

      if (!res.ok) throw new Error('Failed to add badge');

      await loadMission();
    } catch (error) {
      console.error('Error adding badge:', error);
    }
  }

  async function removeBadge(badge: string) {
    try {
      const res = await fetch(`/api/missions/${missionId}/badges?badge=${encodeURIComponent(badge)}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to remove badge');

      await loadMission();
    } catch (error) {
      console.error('Error removing badge:', error);
    }
  }

  function handleBack() {
    if (activeTabId) {
      closeTab(activeTabId);
    }
    openTab({ type: 'missions', path: '/missions', title: 'Missions' }, true);
  }

  function handleCreateInvoice() {
    openTab(
      {
        type: 'new-invoice-for-mission',
        path: `/missions/${missionId}/new-invoice`,
        title: 'Nouvelle facture',
        entityId: missionId,
      },
      true
    );
  }

  function formatAmount(amount: number | null | undefined, curr: string = 'EUR') {
    if (!amount) return '-';
    const symbol = getCurrencySymbol(curr);
    return `${Number(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ${symbol}`;
  }

  function formatDate(dateString: string | null) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!mission) {
    return (
      <div className="h-full overflow-auto p-6">
        <Card>
          <div className="p-6 text-center text-gray-500">
            Mission introuvable
          </div>
        </Card>
      </div>
    );
  }

  const hasInvoices = mission.invoices && mission.invoices.length > 0;

  return (
    <div className="h-full overflow-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{mission.title}</h1>
          <div className="flex gap-2 mt-2">
            <Badge variant={statusVariants[mission.status] || 'gray'}>
              {statusLabels[mission.status] || mission.status}
            </Badge>
            {mission.visible_on_verifolio && (
              <Badge variant="blue">Visible Verifolio</Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleBack}>
            Retour
          </Button>
          <Button onClick={() => openTab({ type: 'edit-mission', path: `/missions/${missionId}/edit`, title: 'Modifier la mission', entityId: missionId }, true)}>
            Modifier
          </Button>
        </div>
      </div>

      {/* Ligne 1: Informations + Gestion du statut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Client</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {mission.client ? (
                    <button
                      onClick={() => openTab({
                        type: 'client',
                        path: `/clients/${mission.client!.id}`,
                        title: mission.client!.nom,
                        entityId: mission.client!.id,
                      })}
                      className="text-blue-600 hover:underline"
                    >
                      {mission.client.nom}
                    </button>
                  ) : (
                    '-'
                  )}
                </dd>
              </div>
              {mission.deal && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Deal</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    <button
                      onClick={() => openTab({
                        type: 'deal',
                        path: `/deals/${mission.deal!.id}`,
                        title: mission.deal!.title,
                        entityId: mission.deal!.id,
                      })}
                      className="text-blue-600 hover:underline"
                    >
                      {mission.deal.title}
                    </button>
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-gray-500">Montant estimé HT</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatAmount(mission.estimated_amount, currency)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Montant final HT</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatAmount(mission.final_amount, currency)}
                </dd>
              </div>
            </dl>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Gestion du statut</h2>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {mission.status === 'in_progress' && (
                  <Button size="sm" onClick={() => updateStatus('delivered')}>
                    Marquer livrée
                  </Button>
                )}
                {mission.status === 'to_invoice' && !hasInvoices && (
                  <Button size="sm" variant="danger" onClick={() => updateStatus('cancelled')}>
                    Annuler la mission
                  </Button>
                )}
                {mission.status === 'paid' && (
                  <Button size="sm" onClick={() => updateStatus('closed')}>
                    Fermer la mission
                  </Button>
                )}
                {(mission.status === 'in_progress' || mission.status === 'delivered') && (
                  <Button size="sm" variant="danger" onClick={() => updateStatus('cancelled')}>
                    Annuler
                  </Button>
                )}
              </div>
              <p className="text-sm text-gray-600">
                {mission.status === 'in_progress' && 'La mission est en cours de réalisation.'}
                {mission.status === 'delivered' && 'La mission a été livrée, elle passe automatiquement en "À facturer".'}
                {mission.status === 'to_invoice' && 'La mission est prête à être facturée.'}
                {mission.status === 'invoiced' && 'Une facture a été émise pour cette mission.'}
                {mission.status === 'paid' && 'La mission a été payée. Vous pouvez la fermer.'}
                {mission.status === 'closed' && 'Cette mission est fermée.'}
                {mission.status === 'cancelled' && 'Cette mission a été annulée.'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Ligne 2: Dates + Contacts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Dates</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Démarrage</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDate(mission.started_at)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Livraison</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDate(mission.delivered_at)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Facturation</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDate(mission.invoiced_at)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Paiement</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDate(mission.paid_at)}</dd>
              </div>
            </dl>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Contacts</h2>
            <MissionContactsEditor missionId={missionId} onUpdate={loadMission} />
          </div>
        </Card>
      </div>

      {/* Checklist admin */}
      <Card className="mb-6">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Checklist admin</h2>
          {(() => {
            // Vérifier si un PO existe (attaché au deal lié)
            const hasPO = dealPO !== null;

            // Vérifier si un bon de livraison a été envoyé
            const hasBLSent = deliveryNotes.some((dn) => dn.status === 'SENT');

            // Vérifier les factures (exclure supprimées et annulées)
            const invoices = mission.invoices || [];
            const activeInvoices = invoices.filter(
              (mi) => mi.invoice && mi.invoice.status !== 'annulee' && !mi.invoice.deleted_at
            );
            const hasInvoiceSent = activeInvoices.some(
              (mi) => mi.invoice && ['envoyee', 'payee'].includes(mi.invoice.status)
            );
            const hasInvoicePaid = activeInvoices.some(
              (mi) => mi.invoice?.status === 'payee'
            );

            // Trouver la première facture envoyée ou payée pour le lien
            const sentInvoice = activeInvoices.find(
              (mi) => mi.invoice && ['envoyee', 'payee'].includes(mi.invoice.status)
            );
            const paidInvoice = activeInvoices.find(
              (mi) => mi.invoice?.status === 'payee'
            );

            const checklistItems: ChecklistItem[] = [
              {
                label: 'Bon de commande reçu',
                checked: hasPO,
                linkText: 'Voir',
                onLinkClick: hasPO
                  ? () => {
                      const poSection = document.querySelector('[data-section="attachments"]');
                      poSection?.scrollIntoView({ behavior: 'smooth' });
                    }
                  : undefined,
              },
              {
                label: 'Bon de livraison envoyé',
                checked: hasBLSent,
                linkText: 'Voir',
                onLinkClick: hasBLSent
                  ? () => {
                      const blSection = document.querySelector('[data-section="delivery-notes"]');
                      blSection?.scrollIntoView({ behavior: 'smooth' });
                    }
                  : undefined,
              },
              {
                label: 'Facture envoyée',
                checked: hasInvoiceSent,
                linkText: 'Voir',
                onLinkClick: hasInvoiceSent && sentInvoice
                  ? () => {
                      openTab({
                        type: 'invoice',
                        path: `/invoices/${sentInvoice.invoice_id}`,
                        title: sentInvoice.invoice?.numero || 'Facture',
                        entityId: sentInvoice.invoice_id,
                      });
                    }
                  : undefined,
              },
              {
                label: 'Facture payée',
                checked: hasInvoicePaid,
                linkText: 'Voir',
                onLinkClick: hasInvoicePaid && paidInvoice
                  ? () => {
                      openTab({
                        type: 'invoice',
                        path: `/invoices/${paidInvoice.invoice_id}`,
                        title: paidInvoice.invoice?.numero || 'Facture',
                        entityId: paidInvoice.invoice_id,
                      });
                    }
                  : undefined,
              },
            ];

            return <AdminChecklist items={checklistItems} />;
          })()}
        </div>
      </Card>

      {/* Description */}
      {mission.description && (
        <Card className="mb-6">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Description</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{mission.description}</p>
          </div>
        </Card>
      )}

      {/* Contexte mission */}
      {mission.mission_context && (
        <Card className="mb-6">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Contexte</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{mission.mission_context}</p>
          </div>
        </Card>
      )}

      {/* Bloc 1: Bon de livraison */}
      <Card className="mb-6" data-section="delivery-notes">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Bon de livraison</h2>

          {loadingBL ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400" />
              Chargement...
            </div>
          ) : deliveryNotes.length > 0 ? (
            <div className="space-y-3">
              {deliveryNotes.map((dn) => (
                <div
                  key={dn.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant={deliveryNoteStatusVariants[dn.status] || 'gray'}>
                      {deliveryNoteStatusLabels[dn.status] || dn.status}
                    </Badge>
                    <div>
                      <p className="font-medium text-gray-900">{dn.delivery_note_number}</p>
                      <p className="text-sm text-gray-500">{dn.title}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {dn.status === 'DRAFT' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => updateDeliveryNoteStatus(dn.id, 'SENT')}
                      >
                        Envoyer
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadDeliveryNotePDF(dn)}
                      disabled={downloadingBL === dn.id}
                    >
                      {downloadingBL === dn.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      <span className="ml-1">PDF</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : !showBLForm ? (
            <div>
              <p className="text-sm text-gray-500 mb-3">Aucun bon de livraison</p>
              <Button size="sm" onClick={() => setShowBLForm(true)}>
                + Créer un bon de livraison
              </Button>
            </div>
          ) : null}

          {showBLForm && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Nouveau bon de livraison</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={blTitle}
                  onChange={(e) => setBLTitle(e.target.value)}
                  placeholder="Désignation / objet"
                  className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
                />
                <Button size="sm" onClick={createDeliveryNote} loading={creatingBL}>
                  Créer
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setShowBLForm(false); setBLTitle(''); }}>
                  Annuler
                </Button>
              </div>
            </div>
          )}

          {deliveryNotes.length > 0 && !showBLForm && (
            <div className="mt-4">
              <Button size="sm" variant="secondary" onClick={() => setShowBLForm(true)}>
                + Ajouter un bon de livraison
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Bloc 2: Factures */}
      <Card className="mb-6">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Factures</h2>

          {/* Bloc récapitulatif financier */}
          {(() => {
            const invoices = mission.invoices || [];
            // Exclure les factures supprimées et annulées des calculs
            const activeInvoices = invoices.filter(
              (mi) => mi.invoice && mi.invoice.status !== 'annulee' && !mi.invoice.deleted_at
            );
            const totalFacture = activeInvoices
              .filter((mi) => mi.invoice && ['envoyee', 'payee'].includes(mi.invoice.status))
              .reduce((sum, mi) => sum + (mi.invoice?.total_ttc || 0), 0);
            const totalPaye = activeInvoices
              .filter((mi) => mi.invoice?.status === 'payee')
              .reduce((sum, mi) => sum + (mi.invoice?.total_ttc || 0), 0);
            const resteAPayer = totalFacture - totalPaye;
            const montantPrevu = mission.final_amount || mission.estimated_amount || 0;

            return (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Montant prévu HT</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatAmount(montantPrevu, currency)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Total facturé TTC</p>
                  <p className="text-lg font-semibold text-blue-600">
                    {formatAmount(totalFacture, currency)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Total payé TTC</p>
                  <p className="text-lg font-semibold text-green-600">
                    {formatAmount(totalPaye, currency)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Reste à payer TTC</p>
                  <p className={`text-lg font-semibold ${resteAPayer > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
                    {formatAmount(resteAPayer, currency)}
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Tableau des factures */}
          {hasInvoices ? (
            <div className="overflow-hidden border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Numéro
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Désignation
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Montant
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {mission.invoices!.map((mi) => {
                    const isDeleted = !!mi.invoice?.deleted_at;
                    const displayStatus = isDeleted ? 'supprimee' : mi.invoice?.status;

                    return (
                      <tr key={mi.id} className={`hover:bg-gray-50 ${isDeleted ? 'opacity-50' : ''}`}>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {isDeleted ? (
                            <span className="text-gray-400 font-medium text-sm line-through">
                              {mi.invoice?.numero || 'Facture'}
                            </span>
                          ) : (
                            <button
                              onClick={() => openTab({
                                type: 'invoice',
                                path: `/invoices/${mi.invoice_id}`,
                                title: mi.invoice?.numero || 'Facture',
                                entityId: mi.invoice_id,
                              })}
                              className="text-blue-600 hover:underline font-medium text-sm"
                            >
                              {mi.invoice?.numero || 'Facture'}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-sm truncate block max-w-xs ${isDeleted ? 'text-gray-400' : 'text-gray-700'}`}>
                            {mi.invoice?.notes
                              ? mi.invoice.notes.length > 50
                                ? `${mi.invoice.notes.slice(0, 50)}...`
                                : mi.invoice.notes
                              : '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <span className={`text-sm font-medium ${isDeleted ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                            {formatAmount(mi.invoice?.total_ttc, currency)}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          {displayStatus && (
                            <Badge variant={invoiceStatusVariants[displayStatus] || 'gray'}>
                              {invoiceStatusLabels[displayStatus] || displayStatus}
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500 mb-4">Aucune facture</p>
          )}

          <div className="flex gap-2 mt-4">
            <Button size="sm" onClick={handleCreateInvoice}>
              + Créer une facture
            </Button>
          </div>
        </div>
      </Card>

      {/* Bloc 3: Pièces jointes */}
      <Card className="mb-6" data-section="attachments">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pièces jointes</h2>

          {loadingPO ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400" />
              Chargement...
            </div>
          ) : mission.deal_id ? (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Bon de commande (du deal)</h3>
              {dealPO ? (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-3">
                    <Badge variant="green">Reçu</Badge>
                    <span className="text-sm text-gray-700">{dealPO.file_name}</span>
                  </div>
                  <Button size="sm" variant="outline" onClick={viewDealPO}>
                    Voir
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  Aucun bon de commande attaché au deal.{' '}
                  <button
                    onClick={() => openTab({
                      type: 'deal',
                      path: `/deals/${mission.deal_id}`,
                      title: mission.deal?.title || 'Deal',
                      entityId: mission.deal_id!,
                    })}
                    className="text-blue-600 hover:underline"
                  >
                    Voir le deal
                  </button>
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              Cette mission n'est pas liée à un deal.
            </p>
          )}
        </div>
      </Card>

      {/* Tags et Badges */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Tags</h2>
            <div className="flex flex-wrap gap-2 mb-3">
              {mission.tags && mission.tags.length > 0 ? (
                mission.tags.map((t) => (
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

        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Badges</h2>
            <div className="flex flex-wrap gap-2 mb-3">
              {mission.badges && mission.badges.length > 0 ? (
                mission.badges.map((b) => {
                  const isAutomatic = b.badge === 'EN RETARD';
                  return (
                    <Badge
                      key={b.badge}
                      variant={(b.variant as 'gray' | 'blue' | 'green' | 'yellow' | 'red') || 'gray'}
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
              existingBadges={mission.badges?.map(b => b.badge) || []}
            />
          </div>
        </Card>

        {/* Taches */}
        <Card className="lg:col-span-2">
          <div className="p-6">
            <EntityTasksSection
              entityType="mission"
              entityId={missionId}
              entityName={mission.title}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
