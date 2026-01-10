'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { TaskOwnerScope } from '@/lib/tasks/types';

interface OwnerSelectorProps {
  missionId: string | null;
  ownerScope: TaskOwnerScope;
  ownerEntityId: string | null;
  onOwnerScopeChange: (scope: TaskOwnerScope) => void;
  onOwnerEntityIdChange: (id: string | null) => void;
}

interface OwnerOption {
  id: string;
  nom: string;
  type: 'client' | 'supplier';
}

/**
 * Sélecteur "Dépend de" pour les tâches liées à une mission
 * Affiche: Moi | Client de la mission | Fournisseurs de la mission
 */
export function OwnerSelector({
  missionId,
  ownerScope,
  ownerEntityId,
  onOwnerScopeChange,
  onOwnerEntityIdChange,
}: OwnerSelectorProps) {
  const [client, setClient] = useState<{ id: string; nom: string } | null>(null);
  const [suppliers, setSuppliers] = useState<{ id: string; nom: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!missionId) {
      setClient(null);
      setSuppliers([]);
      return;
    }

    async function loadOwnerOptions() {
      setLoading(true);
      const supabase = createClient();

      // Charger la mission avec son client
      const { data: mission } = await supabase
        .from('missions')
        .select(`
          client_id,
          client:clients!client_id(id, nom)
        `)
        .eq('id', missionId)
        .single();

      if (mission?.client && typeof mission.client === 'object' && !Array.isArray(mission.client)) {
        setClient(mission.client as { id: string; nom: string });
      }

      // Charger les fournisseurs de la mission
      const { data: missionSuppliers } = await supabase
        .from('mission_suppliers')
        .select(`
          supplier:clients!supplier_id(id, nom)
        `)
        .eq('mission_id', missionId);

      if (missionSuppliers) {
        setSuppliers(
          missionSuppliers
            .map((ms) => {
              const supplier = ms.supplier;
              if (supplier && typeof supplier === 'object' && !Array.isArray(supplier)) {
                return supplier as { id: string; nom: string };
              }
              return null;
            })
            .filter((s): s is { id: string; nom: string } => s !== null)
        );
      }

      setLoading(false);
    }

    loadOwnerOptions();
  }, [missionId]);

  // Ne pas afficher si pas de mission
  if (!missionId) {
    return null;
  }

  const handleScopeChange = (scope: TaskOwnerScope, entityId: string | null = null) => {
    onOwnerScopeChange(scope);
    onOwnerEntityIdChange(entityId);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Dépend de
      </label>

      {loading ? (
        <div className="text-sm text-gray-500">Chargement...</div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {/* Option: Moi */}
          <button
            type="button"
            onClick={() => handleScopeChange('me', null)}
            className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
              ownerScope === 'me'
                ? 'bg-blue-50 border-blue-500 text-blue-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Moi
          </button>

          {/* Option: Client */}
          {client && (
            <button
              type="button"
              onClick={() => handleScopeChange('client', client.id)}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                ownerScope === 'client' && ownerEntityId === client.id
                  ? 'bg-yellow-50 border-yellow-500 text-yellow-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Client: {client.nom}
            </button>
          )}

          {/* Options: Fournisseurs */}
          {suppliers.map((supplier) => (
            <button
              key={supplier.id}
              type="button"
              onClick={() => handleScopeChange('supplier', supplier.id)}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                ownerScope === 'supplier' && ownerEntityId === supplier.id
                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Fournisseur: {supplier.nom}
            </button>
          ))}

          {suppliers.length === 0 && (
            <span className="text-xs text-gray-400 italic self-center">
              (Aucun fournisseur lié à cette mission)
            </span>
          )}
        </div>
      )}
    </div>
  );
}
