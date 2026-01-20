import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/supabase/auth-helper';
import { ClientForm } from '@/components/forms/ClientForm';
import { ClientPaymentsSection } from '@/components/clients/ClientPaymentsSection';
import { ClientDealsMissionsSection } from '@/components/clients/ClientDealsMissionsSection';
import { TasksSection } from '@/components/tasks';
import { Badge } from '@/components/ui';

interface ClientPageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientPage({ params }: ClientPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const userId = await getUserId(supabase);

  const { data: client, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !client) {
    notFound();
  }

  // Récupérer les paramètres de l'entreprise pour la devise
  const { data: company } = await supabase
    .from('companies')
    .select('default_currency')
    .eq('user_id', userId)
    .single();

  const currency = company?.default_currency || 'EUR';

  // Récupérer les contacts liés à ce client
  const { data: clientContacts } = await supabase
    .from('client_contacts')
    .select(`
      *,
      contact:contacts(id, nom, email, telephone)
    `)
    .eq('client_id', id);

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-xl mx-auto">
        <div className="mb-6">
          <Link href="/clients" className="text-sm text-gray-500 hover:text-gray-700">
            ← Retour aux clients
          </Link>
          <div className="flex items-center gap-3 mt-2">
            <h1 className="text-2xl font-bold text-gray-900">{client.nom}</h1>
            <Badge variant={client.type === 'entreprise' ? 'blue' : 'gray'}>
              {client.type === 'entreprise' ? 'Entreprise' : 'Particulier'}
            </Badge>
          </div>
        </div>

        {/* Paiements & Avances */}
        <div className="mb-6">
          <ClientPaymentsSection clientId={id} currency={currency} />
        </div>

        {/* Deals & Missions */}
        <div className="mb-6">
          <ClientDealsMissionsSection clientId={id} currency={currency} />
        </div>

        {/* Tâches */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <TasksSection entityType="client" entityId={id} />
        </div>

        {/* Contacts liés */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-gray-500">Contacts</h2>
            <Link
              href={`/contacts/new?client_id=${id}`}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              + Ajouter
            </Link>
          </div>
          {clientContacts && clientContacts.length > 0 ? (
            <div className="space-y-3">
              {clientContacts.map((cc) => {
                const contact = cc.contact as { id: string; nom: string; email: string | null; telephone: string | null } | null;
                if (!contact) return null;

                const flags: string[] = [];
                if (cc.is_primary) flags.push('Principal');
                if (cc.handles_billing) flags.push('Facturation');
                if (cc.handles_ops) flags.push('Operations');
                if (cc.handles_management) flags.push('Direction');

                return (
                  <Link
                    key={cc.id}
                    href={`/contacts/${contact.id}`}
                    className="block p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{contact.nom}</span>
                          {cc.role && (
                            <span className="text-xs text-gray-500">({cc.role})</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                          {contact.email && <span>{contact.email}</span>}
                          {contact.telephone && <span>{contact.telephone}</span>}
                        </div>
                      </div>
                      {flags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {flags.map((flag) => (
                            <span
                              key={flag}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700"
                            >
                              {flag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400">Aucun contact lie</p>
          )}
        </div>

        {/* Formulaire d'édition */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Modifier le client</h2>
          <ClientForm client={client} />
        </div>
      </div>
    </div>
  );
}
