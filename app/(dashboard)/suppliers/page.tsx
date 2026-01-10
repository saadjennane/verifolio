'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useTabsStore } from '@/lib/stores/tabs-store';

interface Supplier {
  id: string;
  nom: string;
  type: string;
  email: string | null;
  telephone: string | null;
  vat_enabled: boolean;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const { openTab } = useTabsStore();

  useEffect(() => {
    loadSuppliers();
  }, []);

  async function loadSuppliers() {
    setLoading(true);
    try {
      const res = await fetch('/api/suppliers');
      if (res.ok) {
        const data = await res.json();
        setSuppliers(data.data || []);
      }
    } catch (error) {
      console.error('Error loading suppliers:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleRowClick = (supplier: Supplier) => {
    openTab({
      type: 'supplier',
      path: `/suppliers/${supplier.id}`,
      title: supplier.nom,
      entityId: supplier.id,
    }, false);
  };

  const handleNewSupplier = () => {
    openTab({
      type: 'new-supplier',
      path: '/suppliers/new',
      title: 'Nouveau fournisseur',
    }, false);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fournisseurs</h1>
          <p className="text-gray-500 text-sm mt-1">Gérez vos fournisseurs et leurs informations</p>
        </div>
        <Button onClick={handleNewSupplier}>
          Nouveau fournisseur
        </Button>
      </div>

      <Card>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Chargement...</div>
        ) : suppliers.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 mb-4">Aucun fournisseur</p>
            <Button onClick={handleNewSupplier}>Ajouter un fournisseur</Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>TVA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((supplier) => (
                <TableRow
                  key={supplier.id}
                  onClick={() => handleRowClick(supplier)}
                  className="cursor-pointer hover:bg-gray-50"
                >
                  <TableCell className="font-medium">{supplier.nom}</TableCell>
                  <TableCell>
                    <Badge variant={supplier.type === 'entreprise' ? 'blue' : 'gray'}>
                      {supplier.type === 'entreprise' ? 'Entreprise' : 'Particulier'}
                    </Badge>
                  </TableCell>
                  <TableCell>{supplier.email || '-'}</TableCell>
                  <TableCell>{supplier.telephone || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={supplier.vat_enabled ? 'green' : 'gray'}>
                      {supplier.vat_enabled ? 'Oui' : 'Non'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Quick links */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => openTab({
            type: 'supplier-consultations',
            path: '/suppliers/consultations',
            title: 'Consultations',
          }, false)}
        >
          <div className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Consultations</h3>
              <p className="text-sm text-gray-500">Comparer les devis fournisseurs</p>
            </div>
          </div>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => openTab({
            type: 'supplier-quotes',
            path: '/suppliers/quotes',
            title: 'Devis fournisseurs',
          }, false)}
        >
          <div className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Devis reçus</h3>
              <p className="text-sm text-gray-500">Voir tous les devis fournisseurs</p>
            </div>
          </div>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => openTab({
            type: 'supplier-invoices',
            path: '/suppliers/invoices',
            title: 'Factures fournisseurs',
          }, false)}
        >
          <div className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Factures reçues</h3>
              <p className="text-sm text-gray-500">Voir toutes les factures fournisseurs</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
