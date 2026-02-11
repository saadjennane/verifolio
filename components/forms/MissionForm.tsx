'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button, Input, Select, Textarea } from '@/components/ui';
import { ClientFormModal } from '@/components/modals/ClientFormModal';
import { getCurrencySymbol } from '@/lib/utils/currency';
import type { Client } from '@/lib/supabase/types';

interface Deal {
  id: string;
  title: string;
  client_id: string;
  estimated_amount?: number | null;
  description?: string | null;
}

interface Mission {
  id: string;
  title: string;
  client_id: string;
  deal_id: string | null;
  description: string | null;
  estimated_amount: number | null;
  started_at: string | null;
}

interface MissionFormProps {
  mission?: Mission;
  onSuccess?: (mission: Mission) => void;
  onCancel?: () => void;
  embedded?: boolean;
}

export function MissionForm({ mission, onSuccess, onCancel, embedded }: MissionFormProps) {
  const router = useRouter();
  const isEditing = !!mission;

  const [title, setTitle] = useState(mission?.title || '');
  const [clientId, setClientId] = useState(mission?.client_id || '');
  const [dealId, setDealId] = useState(mission?.deal_id || '');
  const [description, setDescription] = useState(mission?.description || '');
  const [estimatedAmount, setEstimatedAmount] = useState(mission?.estimated_amount?.toString() || '');
  const [startedAt, setStartedAt] = useState(mission?.started_at || '');

  const [clients, setClients] = useState<Client[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showClientModal, setShowClientModal] = useState(false);
  const [currency, setCurrency] = useState('EUR');

  useEffect(() => {
    loadClients();
    loadCurrency();
    loadAllDeals(); // Charger tous les deals dès le départ
  }, []);

  async function loadAllDeals() {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('deals')
        .select('id, title, client_id, estimated_amount, description')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading all deals:', error);
      } else {
        setDeals(data as Deal[] || []);
      }
    } catch (error) {
      console.error('Error loading all deals:', error);
    }
  }

  async function loadCurrency() {
    try {
      const res = await fetch('/api/settings/currency');
      const json = await res.json();

      if (res.ok && json.data?.currency) {
        setCurrency(json.data.currency);
      } else {
        console.error('Error loading currency:', json.error);
      }
    } catch (error) {
      console.error('Error loading currency:', error);
    }
  }

  // Quand un deal est sélectionné, auto-remplir le client et potentiellement d'autres champs
  const handleDealChange = (selectedDealId: string) => {
    setDealId(selectedDealId);

    if (selectedDealId) {
      const selectedDeal = deals.find(d => d.id === selectedDealId);
      if (selectedDeal) {
        // Auto-remplir le client
        if (selectedDeal.client_id && selectedDeal.client_id !== clientId) {
          setClientId(selectedDeal.client_id);
        }

        // Si le titre est vide, suggérer celui du deal
        if (!title && selectedDeal.title) {
          setTitle(selectedDeal.title);
        }

        // Si la description est vide, suggérer celle du deal
        if (!description && selectedDeal.description) {
          setDescription(selectedDeal.description);
        }

        // Si le montant estimé est vide, suggérer celui du deal
        if (!estimatedAmount && selectedDeal.estimated_amount) {
          setEstimatedAmount(selectedDeal.estimated_amount.toString());
        }
      }
    }
  };

  async function loadClients() {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('clients')
        .select('id, nom, type')
        .order('nom', { ascending: true });

      if (error) {
        console.error('Error loading clients:', error);
      } else {
        setClients(data as Client[] || []);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  }

  // Filtrer les deals par client si un client est sélectionné
  const filteredDeals = clientId
    ? deals.filter(d => d.client_id === clientId)
    : deals;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const missionData = {
        title: title.trim(),
        client_id: clientId,
        deal_id: dealId || null,
        description: description.trim() || null,
        estimated_amount: estimatedAmount ? parseFloat(estimatedAmount) : null,
        started_at: startedAt || null,
        user_id: user?.id || null,
      };

      let savedMission;

      if (isEditing && mission) {
        const { data, error } = await supabase
          .from('missions')
          .update(missionData)
          .eq('id', mission.id)
          .select()
          .single();

        if (error) {
          throw new Error(error.message || 'Erreur lors de la mise à jour');
        }
        savedMission = data;
      } else {
        const { data, error } = await supabase
          .from('missions')
          .insert(missionData)
          .select()
          .single();

        if (error) {
          throw new Error(error.message || 'Erreur lors de la création');
        }
        savedMission = data;
      }

      if (onSuccess && savedMission) {
        onSuccess(savedMission);
      } else {
        router.push('/missions');
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.back();
    }
  };

  async function handleClientCreated(newClient: Client) {
    // Recharger la liste des clients
    await loadClients();
    // Sélectionner automatiquement le nouveau client
    setClientId(newClient.id);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Titre"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Ex: Développement site web"
        required
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Client <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2">
          <Select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            options={[
              { value: '', label: 'Sélectionner un client' },
              ...clients.map((client) => ({
                value: client.id,
                label: `${client.nom} (${client.type})`,
              })),
            ]}
            required
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowClientModal(true)}
          >
            + Nouveau
          </Button>
        </div>
      </div>

      <Select
        label={`Deal lié (optionnel)${!clientId && deals.length > 0 ? ' - Sélectionner un deal pré-remplit le client' : ''}`}
        value={dealId}
        onChange={(e) => handleDealChange(e.target.value)}
        options={[
          { value: '', label: 'Aucun deal lié' },
          ...filteredDeals.map((deal) => {
            // Trouver le nom du client pour l'afficher si pas de client sélectionné
            const client = !clientId ? clients.find(c => c.id === deal.client_id) : null;
            const clientSuffix = client ? ` (${client.nom})` : '';
            return {
              value: deal.id,
              label: `${deal.title}${clientSuffix}`,
            };
          }),
        ]}
      />

      <Input
        label={`Montant estimé HT (${getCurrencySymbol(currency)})`}
        type="number"
        step="0.01"
        min="0"
        value={estimatedAmount}
        onChange={(e) => setEstimatedAmount(e.target.value)}
        placeholder="Ex: 5000"
      />

      <Input
        label="Date de début"
        type="date"
        value={startedAt}
        onChange={(e) => setStartedAt(e.target.value)}
      />

      <Textarea
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Détails de la mission..."
        rows={4}
      />

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <div className="flex gap-3 pt-4">
        <Button type="submit" loading={loading}>
          {isEditing ? 'Enregistrer' : 'Créer la mission'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={handleCancel}
        >
          Annuler
        </Button>
      </div>

      <ClientFormModal
        isOpen={showClientModal}
        onClose={() => setShowClientModal(false)}
        onSuccess={handleClientCreated}
      />
    </form>
  );
}
