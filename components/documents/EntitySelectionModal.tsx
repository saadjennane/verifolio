'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Search, Briefcase, FolderKanban, Truck, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useTabsStore } from '@/lib/stores/tabs-store';

type EntityType = 'mission' | 'deal' | 'supplier';

interface Mission {
  id: string;
  title: string;
  status: string;
  client: { nom: string } | null;
}

interface Deal {
  id: string;
  titre: string;
  statut: string;
  client: { nom: string } | null;
}

interface Supplier {
  id: string;
  nom: string;
  email: string | null;
}

interface EntitySelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: EntityType;
  onSelect: (entityId: string, entityTitle: string) => void;
}

const statusLabels: Record<string, string> = {
  // Mission statuses
  in_progress: 'En cours',
  delivered: 'Livrée',
  to_invoice: 'À facturer',
  invoiced: 'Facturée',
  paid: 'Payée',
  closed: 'Clôturée',
  cancelled: 'Annulée',
  // Deal statuses
  nouveau: 'Nouveau',
  qualification: 'Qualification',
  proposition: 'Proposition',
  negociation: 'Négociation',
  gagne: 'Gagné',
  perdu: 'Perdu',
};

export function EntitySelectionModal({
  isOpen,
  onClose,
  entityType,
  onSelect,
}: EntitySelectionModalProps) {
  const { openTab } = useTabsStore();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const title = entityType === 'mission'
    ? 'Sélectionner une mission'
    : entityType === 'deal'
    ? 'Sélectionner un deal'
    : 'Sélectionner un fournisseur';
  const emptyMessage = entityType === 'mission'
    ? 'Aucune mission disponible. Créez d\'abord une mission.'
    : entityType === 'deal'
    ? 'Aucun deal disponible. Créez d\'abord un deal.'
    : 'Aucun fournisseur disponible. Créez d\'abord un fournisseur.';

  useEffect(() => {
    if (!isOpen) return;

    async function loadEntities() {
      setLoading(true);
      const supabase = createClient();

      if (entityType === 'mission') {
        // Load missions that can have invoices
        // Valid statuses: in_progress, delivered, to_invoice, invoiced, paid, closed, cancelled
        const { data, error } = await supabase
          .from('missions')
          .select('id, title, status, client:clients(nom)')
          .in('status', ['in_progress', 'delivered', 'to_invoice', 'invoiced'])
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error loading missions:', error);
        }

        // Transform data to match Mission interface (client comes as object, not array)
        const transformed = (data || []).map(m => ({
          ...m,
          client: m.client as unknown as { nom: string } | null,
        }));
        setMissions(transformed);
      } else if (entityType === 'deal') {
        // Load deals that can have quotes (not lost)
        const { data, error } = await supabase
          .from('deals')
          .select('id, title, status, client:clients(nom)')
          .neq('status', 'lost')
          .is('deleted_at', null)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error loading deals:', error);
        }

        // Transform data to match Deal interface (map title->titre, status->statut for UI)
        const transformed = (data || []).map(d => ({
          id: d.id,
          titre: d.title,
          statut: d.status,
          client: d.client as unknown as { nom: string } | null,
        }));
        setDeals(transformed);
      } else {
        // Load suppliers (clients with is_supplier = true)
        const { data, error } = await supabase
          .from('clients')
          .select('id, nom, email')
          .eq('is_supplier', true)
          .is('deleted_at', null)
          .order('nom', { ascending: true });

        if (error) {
          console.error('Error loading suppliers:', error);
        }

        setSuppliers(data || []);
      }

      setLoading(false);
    }

    loadEntities();
  }, [isOpen, entityType]);

  // Reset search when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearch('');
    }
  }, [isOpen]);

  const filteredEntities = useMemo(() => {
    const searchLower = search.toLowerCase();

    if (entityType === 'mission') {
      return missions.filter(m =>
        m.title.toLowerCase().includes(searchLower) ||
        m.client?.nom.toLowerCase().includes(searchLower)
      );
    } else if (entityType === 'deal') {
      return deals.filter(d =>
        d.titre.toLowerCase().includes(searchLower) ||
        d.client?.nom.toLowerCase().includes(searchLower)
      );
    } else {
      return suppliers.filter(s =>
        s.nom.toLowerCase().includes(searchLower) ||
        (s.email && s.email.toLowerCase().includes(searchLower))
      );
    }
  }, [entityType, missions, deals, suppliers, search]);

  if (!isOpen) return null;

  const handleSelect = (entity: Mission | Deal | Supplier) => {
    const entityTitle = entityType === 'mission'
      ? (entity as Mission).title
      : entityType === 'deal'
      ? (entity as Deal).titre
      : (entity as Supplier).nom;
    onSelect(entity.id, entityTitle);
    onClose();
  };

  const handleCreateNew = () => {
    if (entityType === 'mission') {
      openTab({
        type: 'new-mission',
        path: '/missions/new',
        title: 'Nouvelle mission',
      }, true);
    } else if (entityType === 'deal') {
      openTab({
        type: 'new-deal',
        path: '/deals/new',
        title: 'Nouveau deal',
      }, true);
    } else {
      openTab({
        type: 'new-company',
        path: '/suppliers/new',
        title: 'Nouveau fournisseur',
      }, true);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {entityType === 'mission' ? (
              <Briefcase className="h-5 w-5 text-blue-600" />
            ) : entityType === 'deal' ? (
              <FolderKanban className="h-5 w-5 text-blue-600" />
            ) : (
              <Truck className="h-5 w-5 text-blue-600" />
            )}
            <h2 className="text-lg font-medium text-gray-900">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto" />
            </div>
          ) : filteredEntities.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500 mb-4">
                {search ? 'Aucun résultat' : emptyMessage}
              </p>
              {!search && (
                <button
                  onClick={handleCreateNew}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  {entityType === 'mission'
                    ? 'Créer une mission'
                    : entityType === 'deal'
                    ? 'Créer un deal'
                    : 'Créer un fournisseur'}
                </button>
              )}
            </div>
          ) : (
            <div className="py-2">
              {entityType === 'mission'
                ? (filteredEntities as Mission[]).map((mission) => (
                    <button
                      key={mission.id}
                      onClick={() => handleSelect(mission)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{mission.title}</p>
                          {mission.client && (
                            <p className="text-sm text-gray-500">{mission.client.nom}</p>
                          )}
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                          {statusLabels[mission.status] || mission.status}
                        </span>
                      </div>
                    </button>
                  ))
                : entityType === 'deal'
                ? (filteredEntities as Deal[]).map((deal) => (
                    <button
                      key={deal.id}
                      onClick={() => handleSelect(deal)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{deal.titre}</p>
                          {deal.client && (
                            <p className="text-sm text-gray-500">{deal.client.nom}</p>
                          )}
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                          {statusLabels[deal.statut] || deal.statut}
                        </span>
                      </div>
                    </button>
                  ))
                : (filteredEntities as Supplier[]).map((supplier) => (
                    <button
                      key={supplier.id}
                      onClick={() => handleSelect(supplier)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{supplier.nom}</p>
                        {supplier.email && (
                          <p className="text-sm text-gray-500">{supplier.email}</p>
                        )}
                      </div>
                    </button>
                  ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {entityType === 'mission'
                ? 'Une facture doit être liée à une mission'
                : entityType === 'deal'
                ? 'Un devis doit être lié à un deal'
                : 'Un document fournisseur doit être lié à un fournisseur'}
            </p>
            <button
              onClick={handleCreateNew}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Créer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
