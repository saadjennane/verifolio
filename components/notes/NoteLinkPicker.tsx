'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Search, Plus, Briefcase, Users, FileText, Building, Receipt, ClipboardList, Star, Truck, CheckSquare } from 'lucide-react';
import type { NoteEntityType, LinkedEntity } from '@/lib/notes/types';
import { NOTE_ENTITY_TYPE_LABELS } from '@/lib/notes/types';

// ============================================================================
// Types
// ============================================================================

interface Entity {
  id: string;
  title: string;
  subtitle?: string;
}

interface NoteLinkPickerProps {
  linkedEntities: LinkedEntity[];
  onAdd: (entityType: NoteEntityType, entityId: string) => void;
  onRemove: (entityType: NoteEntityType, entityId: string) => void;
}

// ============================================================================
// Entity Type Icons
// ============================================================================

const ENTITY_ICONS: Record<NoteEntityType, typeof Briefcase> = {
  deal: Briefcase,
  mission: ClipboardList,
  proposal: FileText,
  brief: FileText,
  client: Building,
  contact: Users,
  invoice: Receipt,
  quote: Receipt,
  review: Star,
  task: CheckSquare,
  supplier: Truck,
};

// ============================================================================
// Component
// ============================================================================

export function NoteLinkPicker({ linkedEntities, onAdd, onRemove }: NoteLinkPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<NoteEntityType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch entities when type is selected
  useEffect(() => {
    if (!selectedType) {
      setEntities([]);
      return;
    }

    async function fetchEntities() {
      setLoading(true);
      try {
        const endpoint = getEntityEndpoint(selectedType!);
        const res = await fetch(endpoint);
        const data = await res.json();
        const items = extractEntities(selectedType!, data);
        setEntities(items);
      } catch (error) {
        console.error('Error fetching entities:', error);
        setEntities([]);
      } finally {
        setLoading(false);
      }
    }

    fetchEntities();
  }, [selectedType]);

  // Filter entities by search query
  const filteredEntities = useMemo(() => {
    if (!searchQuery.trim()) return entities;
    const query = searchQuery.toLowerCase();
    return entities.filter(
      (e) =>
        e.title.toLowerCase().includes(query) ||
        e.subtitle?.toLowerCase().includes(query)
    );
  }, [entities, searchQuery]);

  // Check if entity is already linked
  const isLinked = (entityId: string) => {
    return linkedEntities.some(
      (e) => e.type === selectedType && e.id === entityId
    );
  };

  return (
    <div className="space-y-3">
      {/* Linked entities list */}
      {linkedEntities.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {linkedEntities.map((entity) => {
            const Icon = ENTITY_ICONS[entity.type];
            return (
              <div
                key={`${entity.type}-${entity.id}`}
                className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-sm"
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="text-xs text-blue-500">
                  {NOTE_ENTITY_TYPE_LABELS[entity.type]}:
                </span>
                <span className="font-medium">{entity.title}</span>
                <button
                  onClick={() => onRemove(entity.type, entity.id)}
                  className="ml-1 p-0.5 hover:bg-blue-100 rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add link button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Lier à une entité
        </button>
      )}

      {/* Picker modal */}
      {isOpen && (
        <div className="border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden">
          <div className="p-3 border-b border-gray-200 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-900">
              {selectedType
                ? `Sélectionner un(e) ${NOTE_ENTITY_TYPE_LABELS[selectedType].toLowerCase()}`
                : 'Choisir un type'}
            </span>
            <button
              onClick={() => {
                setIsOpen(false);
                setSelectedType(null);
                setSearchQuery('');
              }}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Type selector */}
          {!selectedType && (
            <div className="p-2 grid grid-cols-3 gap-1">
              {(Object.keys(NOTE_ENTITY_TYPE_LABELS) as NoteEntityType[]).map((type) => {
                const Icon = ENTITY_ICONS[type];
                return (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className="flex items-center gap-2 p-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
                  >
                    <Icon className="w-4 h-4 text-gray-500" />
                    {NOTE_ENTITY_TYPE_LABELS[type]}
                  </button>
                );
              })}
            </div>
          )}

          {/* Entity selector */}
          {selectedType && (
            <>
              {/* Search */}
              <div className="p-2 border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher..."
                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
              </div>

              {/* Back button */}
              <div className="px-2 pt-2">
                <button
                  onClick={() => {
                    setSelectedType(null);
                    setSearchQuery('');
                  }}
                  className="text-xs text-blue-600 hover:underline"
                >
                  ← Changer de type
                </button>
              </div>

              {/* Entity list */}
              <div className="max-h-48 overflow-y-auto p-2">
                {loading ? (
                  <div className="py-4 text-center text-sm text-gray-500">
                    Chargement...
                  </div>
                ) : filteredEntities.length === 0 ? (
                  <div className="py-4 text-center text-sm text-gray-500">
                    Aucun résultat
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredEntities.map((entity) => {
                      const linked = isLinked(entity.id);
                      return (
                        <button
                          key={entity.id}
                          onClick={() => {
                            if (!linked) {
                              onAdd(selectedType, entity.id);
                            }
                          }}
                          disabled={linked}
                          className={`
                            w-full text-left px-3 py-2 rounded text-sm transition-colors
                            ${linked
                              ? 'bg-blue-50 text-blue-600 cursor-default'
                              : 'hover:bg-gray-100 text-gray-700'
                            }
                          `}
                        >
                          <div className="font-medium">{entity.title}</div>
                          {entity.subtitle && (
                            <div className="text-xs text-gray-500">{entity.subtitle}</div>
                          )}
                          {linked && (
                            <div className="text-xs text-blue-500 mt-0.5">Déjà lié</div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function getEntityEndpoint(type: NoteEntityType): string {
  const endpoints: Record<NoteEntityType, string> = {
    deal: '/api/deals',
    mission: '/api/missions',
    proposal: '/api/proposals',
    brief: '/api/briefs',
    client: '/api/clients',
    contact: '/api/contacts',
    invoice: '/api/invoices',
    quote: '/api/quotes',
    review: '/api/reviews',
    task: '/api/tasks',
    supplier: '/api/suppliers',
  };
  return endpoints[type];
}

function extractEntities(type: NoteEntityType, data: Record<string, unknown>): Entity[] {
  // Different API responses have different structures
  const items = (data.deals ||
    data.missions ||
    data.proposals ||
    data.briefs ||
    data.clients ||
    data.contacts ||
    data.invoices ||
    data.quotes ||
    data.reviews ||
    data.tasks ||
    data.suppliers ||
    data.data ||
    []) as Array<Record<string, unknown>>;

  return items.map((item) => ({
    id: item.id as string,
    title: getEntityTitle(type, item),
    subtitle: getEntitySubtitle(type, item),
  }));
}

function getEntityTitle(type: NoteEntityType, item: Record<string, unknown>): string {
  switch (type) {
    case 'client':
    case 'contact':
    case 'supplier':
      return (item.nom as string) || (item.name as string) || 'Sans nom';
    case 'invoice':
    case 'quote':
      return (item.numero as string) || (item.number as string) || 'Sans numéro';
    default:
      return (item.title as string) || (item.nom as string) || 'Sans titre';
  }
}

function getEntitySubtitle(type: NoteEntityType, item: Record<string, unknown>): string | undefined {
  switch (type) {
    case 'deal':
    case 'mission': {
      const client = item.client as Record<string, unknown> | undefined;
      return client?.nom as string | undefined;
    }
    case 'invoice':
    case 'quote': {
      const client = item.client as Record<string, unknown> | undefined;
      return client?.nom as string | undefined;
    }
    case 'contact':
      return item.email as string | undefined;
    default:
      return undefined;
  }
}
