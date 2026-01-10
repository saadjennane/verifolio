'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { EntityAutocomplete, type EntityOption } from '@/components/ui/EntityAutocomplete';

interface EntitySelectorProps {
  entityType: 'client' | 'deal' | 'mission' | 'contact' | '';
  entityId: string;
  onEntityTypeChange: (type: 'client' | 'deal' | 'mission' | 'contact' | '') => void;
  onEntityIdChange: (id: string) => void;
  disabled?: boolean;
}

export function EntitySelector({
  entityType,
  entityId,
  onEntityTypeChange,
  onEntityIdChange,
  disabled = false,
}: EntitySelectorProps) {
  const [entityOptions, setEntityOptions] = useState<EntityOption[]>([]);
  const [loadingEntities, setLoadingEntities] = useState(false);

  // Charger les entités quand le type change
  useEffect(() => {
    if (!entityType) {
      setEntityOptions([]);
      return;
    }

    loadEntitiesOfType(entityType);
  }, [entityType]);

  async function loadEntitiesOfType(type: 'client' | 'deal' | 'mission' | 'contact') {
    setLoadingEntities(true);
    try {
      const supabase = createClient();

      let query;
      switch (type) {
        case 'client':
          query = supabase.from('clients').select('id, nom').order('nom');
          break;
        case 'deal':
          query = supabase.from('deals').select('id, title').order('title');
          break;
        case 'mission':
          query = supabase.from('missions').select('id, title').order('title');
          break;
        case 'contact':
          query = supabase.from('contacts').select('id, prenom, nom').order('nom');
          break;
      }

      const { data, error } = await query;

      if (error) {
        console.error(`Error loading ${type}s:`, error);
        setEntityOptions([]);
      } else {
        const options: EntityOption[] = (data || []).map((item: any) => ({
          id: item.id,
          label: formatEntityLabel(type, item),
        }));
        setEntityOptions(options);
      }
    } catch (error) {
      console.error('Error loading entities:', error);
      setEntityOptions([]);
    } finally {
      setLoadingEntities(false);
    }
  }

  function formatEntityLabel(type: string, item: any): string {
    switch (type) {
      case 'client':
        return item.nom;
      case 'deal':
      case 'mission':
        return item.title;
      case 'contact':
        return `${item.prenom} ${item.nom}`;
      default:
        return '';
    }
  }

  function getEntityTypeLabel(type: string): string {
    switch (type) {
      case 'client':
        return 'Client';
      case 'deal':
        return 'Deal';
      case 'mission':
        return 'Mission';
      case 'contact':
        return 'Contact';
      default:
        return '';
    }
  }

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as 'client' | 'deal' | 'mission' | 'contact' | '';
    onEntityTypeChange(newType);
    // Reset entity ID quand le type change
    onEntityIdChange('');
  };

  return (
    <div className="space-y-3">
      {/* Étape 1: Sélection du type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Type d'entité (optionnel)
        </label>
        <select
          value={entityType}
          onChange={handleTypeChange}
          disabled={disabled}
          className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
        >
          <option value="">Aucune entité liée</option>
          <option value="client">Client</option>
          <option value="deal">Deal</option>
          <option value="mission">Mission</option>
          <option value="contact">Contact</option>
        </select>
      </div>

      {/* Étape 2: Autocomplete de l'entité (affiché uniquement si type sélectionné) */}
      {entityType && (
        <EntityAutocomplete
          label={getEntityTypeLabel(entityType)}
          value={entityId}
          onChange={onEntityIdChange}
          options={entityOptions}
          placeholder={`Rechercher un(e) ${getEntityTypeLabel(entityType).toLowerCase()}...`}
          loading={loadingEntities}
          disabled={disabled}
        />
      )}
    </div>
  );
}
