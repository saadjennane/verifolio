'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Badge } from '@/components/ui';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useTabsStore } from '@/lib/stores/tabs-store';

interface Company {
  id: string;
  nom: string;
  type: string;
  email: string | null;
  telephone: string | null;
  is_client: boolean;
  is_supplier: boolean;
  vat_enabled: boolean;
}

type TabId = 'clients' | 'suppliers';

interface CompaniesListTabProps {
  initialTab?: TabId;
}

export function CompaniesListTab({ initialTab }: CompaniesListTabProps) {
  const { openTab } = useTabsStore();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>(initialTab || 'clients');

  useEffect(() => {
    loadCompanies();
  }, []);

  async function loadCompanies() {
    setLoading(true);
    try {
      const res = await fetch('/api/companies');
      if (res.ok) {
        const data = await res.json();
        setCompanies(data.data || []);
      }
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
    if (activeTab === 'clients') {
      openTab({
        type: 'client',
        path: `/clients/${company.id}`,
        title: company.nom,
        entityId: company.id,
      }, false);
    } else {
      openTab({
        type: 'supplier',
        path: `/suppliers/${company.id}`,
        title: company.nom,
        entityId: company.id,
      }, false);
    }
  };

  const handleNewCompany = () => {
    openTab({
      type: 'new-company',
      path: '/companies/new',
      title: 'Nouveau',
    }, false);
  };

  // Filter companies based on active tab
  const filteredCompanies = companies.filter(c =>
    activeTab === 'clients' ? c.is_client : c.is_supplier
  );

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
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
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

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
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
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <Table>
              <TableHeader>
                <TableRow>
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
