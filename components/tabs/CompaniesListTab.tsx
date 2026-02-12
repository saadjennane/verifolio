'use client';

import { useEffect, useState, useMemo } from 'react';
import { Button, Badge, Input } from '@/components/ui';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useTabsStore } from '@/lib/stores/tabs-store';
import { createClient } from '@/lib/supabase/client';
import { Building2 } from 'lucide-react';

interface Company {
  id: string;
  nom: string;
  type: string;
  email: string | null;
  telephone: string | null;
  is_client: boolean;
  is_supplier: boolean;
  vat_enabled: boolean;
  logo_url: string | null;
  activeDealsCount?: number;
  activeMissionsCount?: number;
}

type TabId = 'clients' | 'suppliers';
type FilterType = 'all' | 'particulier' | 'entreprise';
type FilterActivity = 'all' | 'active-deals' | 'active-missions';

interface CompaniesListTabProps {
  initialTab?: TabId;
}

export function CompaniesListTab({ initialTab }: CompaniesListTabProps) {
  const { openTab } = useTabsStore();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>(initialTab || 'clients');

  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterActivity, setFilterActivity] = useState<FilterActivity>('all');

  useEffect(() => {
    loadCompanies();
  }, []);

  async function loadCompanies() {
    setLoading(true);
    try {
      const supabase = createClient();

      // Load companies
      const res = await fetch('/api/companies');
      let companiesData: Company[] = [];
      if (res.ok) {
        const data = await res.json();
        companiesData = data.data || [];
      }

      // Load deals and missions counts in parallel
      const [dealsRes, missionsRes] = await Promise.all([
        supabase
          .from('deals')
          .select('client_id')
          .is('deleted_at', null)
          .not('status', 'in', '("gagne","perdu","archive")'),
        supabase
          .from('missions')
          .select('client_id')
          .is('deleted_at', null)
          .not('status', 'in', '("cloture","annule")'),
      ]);

      // Count deals per company
      const dealsCountMap = new Map<string, number>();
      if (dealsRes.data) {
        for (const deal of dealsRes.data) {
          if (deal.client_id) {
            dealsCountMap.set(deal.client_id, (dealsCountMap.get(deal.client_id) || 0) + 1);
          }
        }
      }

      // Count missions per company
      const missionsCountMap = new Map<string, number>();
      if (missionsRes.data) {
        for (const mission of missionsRes.data) {
          if (mission.client_id) {
            missionsCountMap.set(mission.client_id, (missionsCountMap.get(mission.client_id) || 0) + 1);
          }
        }
      }

      // Enrich companies with counts
      setCompanies(companiesData.map(c => ({
        ...c,
        activeDealsCount: dealsCountMap.get(c.id) || 0,
        activeMissionsCount: missionsCountMap.get(c.id) || 0,
      })));
    } catch (error) {
      console.error('Error loading companies:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
  };

  const handleRowClick = (company: Company) => {
    // Always use client detail tab since it's the same entity
    openTab({
      type: 'client',
      path: `/clients/${company.id}`,
      title: company.nom,
      entityId: company.id,
    }, false);
  };

  const handleNewCompany = () => {
    openTab({
      type: 'new-company',
      path: '/companies/new',
      title: 'Nouveau',
    }, false);
  };

  // Filter companies based on active tab, search and filters
  const filteredCompanies = useMemo(() => {
    return companies.filter(company => {
      // Tab filter (clients vs suppliers)
      if (activeTab === 'clients' && !company.is_client) return false;
      if (activeTab === 'suppliers' && !company.is_supplier) return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = company.nom.toLowerCase().includes(query);
        const matchesEmail = company.email?.toLowerCase().includes(query);
        if (!matchesName && !matchesEmail) return false;
      }

      // Type filter
      if (filterType !== 'all' && company.type !== filterType) {
        return false;
      }

      // Activity filter
      if (filterActivity === 'active-deals' && (company.activeDealsCount || 0) === 0) {
        return false;
      }
      if (filterActivity === 'active-missions' && (company.activeMissionsCount || 0) === 0) {
        return false;
      }

      return true;
    });
  }, [companies, activeTab, searchQuery, filterType, filterActivity]);

  const tabs = [
    { id: 'clients' as TabId, label: 'Clients', count: companies.filter(c => c.is_client).length },
    { id: 'suppliers' as TabId, label: 'Fournisseurs', count: companies.filter(c => c.is_supplier).length },
  ];

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Entreprises</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              Gérez vos clients et fournisseurs
            </p>
          </div>
          <Button onClick={handleNewCompany}>
            Nouveau
          </Button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
          <nav className="-mb-px flex gap-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`
                  py-3 px-1 border-b-2 text-sm font-medium transition-colors
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }
                `}
              >
                {tab.label}
                <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Search and Filters */}
        <div className="mb-4 space-y-3">
          {/* Search bar */}
          <Input
            type="text"
            placeholder="Rechercher par nom ou email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            {/* Type filter */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  filterType === 'all'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                Tous
              </button>
              <button
                onClick={() => setFilterType('entreprise')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  filterType === 'entreprise'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                Entreprises
              </button>
              <button
                onClick={() => setFilterType('particulier')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  filterType === 'particulier'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                Particuliers
              </button>
            </div>

            {/* Activity filter */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setFilterActivity('all')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  filterActivity === 'all'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                Tous
              </button>
              <button
                onClick={() => setFilterActivity('active-deals')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  filterActivity === 'active-deals'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                Deals actifs
              </button>
              <button
                onClick={() => setFilterActivity('active-missions')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  filterActivity === 'active-missions'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                Missions actives
              </button>
            </div>
          </div>

          {/* Results count */}
          {(searchQuery || filterType !== 'all' || filterActivity !== 'all') && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {filteredCompanies.length} {activeTab === 'clients' ? 'client' : 'fournisseur'}{filteredCompanies.length !== 1 ? 's' : ''} trouvé{filteredCompanies.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
            {(searchQuery || filterType !== 'all' || filterActivity !== 'all') ? (
              <p className="text-gray-500 dark:text-gray-400">
                Aucun {activeTab === 'clients' ? 'client' : 'fournisseur'} ne correspond aux filtres
              </p>
            ) : (
              <>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  {activeTab === 'clients'
                    ? 'Aucun client pour le moment'
                    : 'Aucun fournisseur pour le moment'
                  }
                </p>
                <Button variant="secondary" onClick={handleNewCompany}>
                  {activeTab === 'clients'
                    ? 'Créer votre premier client'
                    : 'Ajouter un fournisseur'
                  }
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14"></TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompanies.map((company) => (
                  <TableRow
                    key={company.id}
                    onClick={() => handleRowClick(company)}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <TableCell className="py-2">
                      <div className="w-10 h-10 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                        {company.logo_url ? (
                          <img
                            src={company.logo_url}
                            alt=""
                            className="w-full h-full object-contain p-0.5"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div className={`flex flex-col items-center text-gray-400 dark:text-gray-500 ${company.logo_url ? 'hidden' : ''}`}>
                          <Building2 className="w-4 h-4" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{company.nom}</TableCell>
                    <TableCell>
                      <Badge variant={company.type === 'entreprise' ? 'blue' : 'gray'}>
                        {company.type === 'entreprise' ? 'Entreprise' : 'Particulier'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-500">{company.email || '-'}</TableCell>
                    <TableCell className="text-gray-500">{company.telephone || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {company.is_client && company.is_supplier ? (
                          <Badge variant="green">Client & Fournisseur</Badge>
                        ) : company.is_client ? (
                          <Badge variant="blue">Client</Badge>
                        ) : (
                          <Badge variant="yellow">Fournisseur</Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
