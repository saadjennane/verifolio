'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface Client {
  id: string;
  nom: string;
  type: string;
  email: string;
}

export default function NewDealPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    client_id: '',
    description: '',
    estimated_amount: '',
  });

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    try {
      const res = await fetch('/api/clients');
      if (!res.ok) throw new Error('Failed to load clients');

      const data = await res.json();
      setClients(data.data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.title.trim() || !formData.client_id) {
      alert('Veuillez remplir le titre et sélectionner un client');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title: formData.title.trim(),
        client_id: formData.client_id,
        description: formData.description.trim() || undefined,
        estimated_amount: formData.estimated_amount ? parseFloat(formData.estimated_amount) : undefined,
      };

      const res = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || 'Erreur lors de la création du deal');
        return;
      }

      const data = await res.json();
      window.location.href = `/deals/${data.deal.id}`;
    } catch (error) {
      console.error('Error creating deal:', error);
      alert('Erreur lors de la création du deal');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Nouveau Deal</h1>
        <Button variant="outline" onClick={() => window.location.href = '/deals'}>
          Annuler
        </Button>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Titre <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Refonte site web"
              className="w-full border border-gray-300 rounded px-3 py-2"
              required
            />
          </div>

          <div>
            <label htmlFor="client_id" className="block text-sm font-medium text-gray-700 mb-2">
              Client <span className="text-red-500">*</span>
            </label>
            <select
              id="client_id"
              value={formData.client_id}
              onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2"
              required
            >
              <option value="">Sélectionner un client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.nom} ({client.type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="estimated_amount" className="block text-sm font-medium text-gray-700 mb-2">
              Montant estimé HT (€)
            </label>
            <input
              id="estimated_amount"
              type="number"
              step="0.01"
              min="0"
              value={formData.estimated_amount}
              onChange={(e) => setFormData({ ...formData, estimated_amount: e.target.value })}
              placeholder="Ex: 5000"
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Détails du deal..."
              rows={6}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => window.location.href = '/deals'}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Création...' : 'Créer le deal'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
