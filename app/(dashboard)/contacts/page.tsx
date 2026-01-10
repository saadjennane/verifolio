import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button, Badge } from '@/components/ui';

export default async function ContactsPage() {
  const supabase = await createClient();

  // Recuperer tous les contacts avec le nombre de clients lies
  const { data: contacts, error } = await supabase
    .from('contacts')
    .select(`
      *,
      client_links:client_contacts(
        id,
        role,
        is_primary,
        handles_billing,
        handles_ops,
        handles_management,
        client:clients(id, nom)
      )
    `)
    .order('nom');

  if (error) {
    console.error('Erreur chargement contacts:', error);
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <Link href="/contacts/new">
            <Button>Nouveau contact</Button>
          </Link>
        </div>

        {/* Liste */}
        {contacts && contacts.length > 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
            {contacts.map((contact) => {
              const clientLinks = contact.client_links || [];
              const clientCount = clientLinks.length;

              return (
                <Link
                  key={contact.id}
                  href={`/contacts/${contact.id}`}
                  className="block p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{contact.nom}</span>
                        {clientCount > 0 && (
                          <Badge variant="blue">
                            {clientCount} client{clientCount > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                        {contact.email && <span>{contact.email}</span>}
                        {contact.telephone && <span>{contact.telephone}</span>}
                      </div>
                      {clientCount > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {clientLinks.slice(0, 3).map((link: { id: string; client: { nom: string } | null; role: string | null }) => (
                            <span
                              key={link.id}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600"
                            >
                              {link.client?.nom}
                              {link.role && ` (${link.role})`}
                            </span>
                          ))}
                          {clientCount > 3 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-400">
                              +{clientCount - 3} autre{clientCount - 3 > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      {clientCount === 0 && (
                        <p className="text-sm text-gray-400">Non lie</p>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-500 mb-4">Aucun contact pour le moment</p>
            <Link href="/contacts/new">
              <Button variant="secondary">Creer votre premier contact</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
