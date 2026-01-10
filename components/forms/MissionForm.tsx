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
}

interface Mission {
  id: string;
  title: string;
  client_id: string;
  deal_id: string | null;
  description: string | null;
  estimated_amount: number | null;
  started_at: string | null;
  visible_on_verifolio: boolean;
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
  const [visibleOnVerifolio, setVisibleOnVerifolio] = useState(mission?.visible_on_verifolio ?? true);

  const [clients, setClients] = useState<Client[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showClientModal, setShowClientModal] = useState(false);
  const [currency, setCurrency] = useState('EUR');

  useEffect(() => {
    loadClients();
    loadCurrency();
  }, []);

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

  useEffect(() => {
    if (clientId) {
      loadDeals(clientId);
    } else {
      setDeals([]);
      setDealId('');
    }
  }, [clientId]);

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

  async function loadDeals(selectedClientId: string) {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('deals')
        .select('id, title, client_id')
        .eq('client_id', selectedClientId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading deals:', error);
      } else {
        setDeals(data as Deal[] || []);
      }
    } catch (error) {
      console.error('Error loading deals:', error);
    }
  }

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
        visible_on_verifolio: visibleOnVerifolio,
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

      {deals.length > 0 && (
        <Select
          label="Deal (optionnel)"
          value={dealId}
          onChange={(e) => setDealId(e.target.value)}
          options={[
            { value: '', label: 'Aucun deal lié' },
            ...deals.map((deal) => ({
              value: deal.id,
              label: deal.title,
            })),
          ]}
        />
      )}

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

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="visible_on_verifolio"
          checked={visibleOnVerifolio}
          onChange={(e) => setVisibleOnVerifolio(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="visible_on_verifolio" className="text-sm font-medium text-gray-700">
          Visible sur Verifolio (portfolio public)
        </label>
      </div>

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
