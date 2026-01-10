import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ContactForm } from '@/components/forms/ContactForm';

interface ContactPageProps {
  params: Promise<{ id: string }>;
}

export default async function ContactPage({ params }: ContactPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: contact, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !contact) {
    notFound();
  }

  // Recuperer les clients lies a ce contact
  const { data: clientContacts } = await supabase
    .from('client_contacts')
    .select(`
      *,
      client:clients(id, nom, type)
    `)
    .eq('contact_id', id);

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-xl mx-auto">
        <div className="mb-6">
          <Link href="/contacts" className="text-sm text-gray-500 hover:text-gray-700">
            ← Retour aux contacts
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">{contact.nom}</h1>
          {(contact.email || contact.telephone) && (
            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
              {contact.email && <span>{contact.email}</span>}
              {contact.telephone && <span>{contact.telephone}</span>}
            </div>
          )}
        </div>

        {/* Clients lies */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <h2 className="text-sm font-medium text-gray-500 mb-3">Clients lies</h2>
          {clientContacts && clientContacts.length > 0 ? (
            <div className="space-y-3">
              {clientContacts.map((cc) => {
                const client = cc.client as { id: string; nom: string; type: string } | null;
                if (!client) return null;

                const flags: string[] = [];
                if (cc.is_primary) flags.push('Principal');
                if (cc.handles_billing) flags.push('Facturation');
                if (cc.handles_ops) flags.push('Operations');
                if (cc.handles_management) flags.push('Direction');

                return (
                  <Link
                    key={cc.id}
                    href={`/clients/${client.id}`}
                    className="block p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{client.nom}</span>
                          <span className="text-xs text-gray-400">
                            {client.type === 'entreprise' ? 'Entreprise' : 'Particulier'}
                          </span>
                        </div>
                        {cc.role && (
                          <p className="text-sm text-gray-500 mt-1">{cc.role}</p>
                        )}
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
            <p className="text-sm text-gray-400">Ce contact n&apos;est lie a aucun client</p>
          )}
        </div>

        {/* Formulaire d'edition */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Modifier le contact</h2>
          <ContactForm contact={contact} />
        </div>
      </div>
    </div>
  );
}
