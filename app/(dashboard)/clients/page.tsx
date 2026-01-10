import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/supabase/auth-helper';
import { Button, Badge } from '@/components/ui';

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  CHF: 'CHF',
  MAD: 'DH',
};

export default async function ClientsPage() {
  const supabase = await createClient();
  const userId = await getUserId(supabase);

  const { data: clients, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });

  // Récupérer les paramètres de l'entreprise pour la devise
  const { data: company } = await supabase
    .from('companies')
    .select('default_currency')
    .eq('user_id', userId)
    .single();

  const currency = company?.default_currency || 'EUR';
  const currencySymbol = CURRENCY_SYMBOLS[currency] || currency;

  // Récupérer les soldes clients
  const { data: balances } = await supabase
    .from('client_balances')
    .select('*');

  const balanceMap = new Map(
    balances?.map((b) => [b.client_id, b]) || []
  );

  if (error) {
    console.error('Erreur chargement clients:', error);
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <Link href="/clients/new">
            <Button>Nouveau client</Button>
          </Link>
        </div>

        {/* Liste */}
        {clients && clients.length > 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
            {clients.map((client) => {
              const balance = balanceMap.get(client.id);
              return (
                <Link
                  key={client.id}
                  href={`/clients/${client.id}`}
                  className="block p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{client.nom}</span>
                        <Badge variant={client.type === 'entreprise' ? 'blue' : 'gray'}>
                          {client.type === 'entreprise' ? 'Entreprise' : 'Particulier'}
                        </Badge>
                      </div>
                      {client.email && (
                        <p className="text-sm text-gray-500 mt-1">{client.email}</p>
                      )}
                    </div>
                    <div className="text-right">
                      {balance && balance.total_restant > 0 ? (
                        <p className="text-sm font-medium text-orange-600">
                          {balance.total_restant.toFixed(2)} {currencySymbol} dû
                        </p>
                      ) : (
                        <p className="text-sm text-gray-400">À jour</p>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-500 mb-4">Aucun client pour le moment</p>
            <Link href="/clients/new">
              <Button variant="secondary">Créer votre premier client</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
