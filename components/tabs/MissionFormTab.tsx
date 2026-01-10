'use client';

import { useState, useEffect } from 'react';
import { MissionForm } from '@/components/forms/MissionForm';
import { useTabsStore } from '@/lib/stores/tabs-store';

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

interface MissionFormTabProps {
  missionId?: string;
}

export function MissionFormTab({ missionId }: MissionFormTabProps) {
  const { closeTab, openTab, activeTabId } = useTabsStore();
  const [mission, setMission] = useState<Mission | undefined>(undefined);
  const [loading, setLoading] = useState(!!missionId);

  useEffect(() => {
    if (missionId) {
      loadMission();
    }
  }, [missionId]);

  async function loadMission() {
    if (!missionId) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/missions/${missionId}`);
      const json = await res.json();

      if (res.ok && json.mission) {
        setMission(json.mission);
      }
    } catch (error) {
      console.error('Error loading mission:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleSuccess = (updatedMission: Mission) => {
    // Fermer l'onglet de création/édition
    if (activeTabId) {
      closeTab(activeTabId);
    }

    if (missionId) {
      // En mode édition, retourner au détail de la mission
      openTab({
        type: 'mission',
        path: `/missions/${missionId}`,
        title: updatedMission.title || 'Mission',
        entityId: missionId,
      });
    } else {
      // En mode création, ouvrir le détail de la nouvelle mission
      openTab({
        type: 'mission',
        path: `/missions/${updatedMission.id}`,
        title: updatedMission.title,
        entityId: updatedMission.id,
      });
    }
  };

  const handleCancel = () => {
    if (activeTabId) {
      closeTab(activeTabId);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {missionId ? 'Modifier la mission' : 'Nouvelle mission'}
        </h1>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <MissionForm
            mission={mission}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
            embedded
          />
        </div>
      </div>
    </div>
  );
}
