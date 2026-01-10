'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Select, Input, Checkbox } from '@/components/ui';
import type { ProposalTemplate } from '@/lib/types/proposals';

interface Client {
  id: string;
  nom: string;
  type: string;
}

interface ClientContact {
  id: string;
  nom: string;
  prenom: string | null;
  email: string | null;
  telephone: string | null;
  role: string | null;
  is_primary: boolean;
}

interface Quote {
  id: string;
  numero: string;
  date_emission: string;
  total_ttc: number;
  status: string;
}

interface CreatedProposal {
  id: string;
  public_token: string;
}

// Steps
type Step = 'client' | 'template' | 'variables' | 'recipients' | 'quote' | 'done';

export default function NewProposalPage() {
  const router = useRouter();

  // Data
  const [clients, setClients] = useState<Client[]>([]);
  const [templates, setTemplates] = useState<ProposalTemplate[]>([]);
  const [contacts, setContacts] = useState<ClientContact[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);

  // Selection state
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);

  // UI state
  const [step, setStep] = useState<Step>('client');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [createdProposal, setCreatedProposal] = useState<CreatedProposal | null>(null);
  const [copied, setCopied] = useState(false);
  const [isMarkingSent, setIsMarkingSent] = useState(false);

  // Load clients and templates on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [clientsRes, templatesRes] = await Promise.all([
          fetch('/api/clients'),
          fetch('/api/proposals/templates'),
        ]);

        const [clientsData, templatesData] = await Promise.all([
          clientsRes.json(),
          templatesRes.json(),
        ]);

        setClients(clientsData.data || []);
        setTemplates(templatesData.data || []);
      } catch {
        setError('Erreur de chargement');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Load contacts and quotes when client is selected
  useEffect(() => {
    if (!selectedClientId) {
      setContacts([]);
      setQuotes([]);
      return;
    }

    const loadClientData = async () => {
      try {
        const [contactsRes, quotesRes] = await Promise.all([
          fetch(`/api/proposals/client/${selectedClientId}/contacts`),
          fetch(`/api/proposals/client/${selectedClientId}/quotes`),
        ]);

        const [contactsData, quotesData] = await Promise.all([
          contactsRes.json(),
          quotesRes.json(),
        ]);

        const loadedContacts = contactsData.data || [];
        setContacts(loadedContacts);
        // Pre-select all contacts by default
        setSelectedContactIds(loadedContacts.map((c: ClientContact) => c.id));
        setQuotes(quotesData.data || []);
      } catch {
        console.error('Error loading client data');
      }
    };

    loadClientData();
  }, [selectedClientId]);

  // Detect variables in template sections
  const detectedVariables = useMemo(() => {
    const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
    if (!selectedTemplate) return [];

    // We need to fetch the full template with sections
    return [];
  }, [selectedTemplateId, templates]);

  // Load template sections to detect variables
  const [templateSections, setTemplateSections] = useState<{ body: string }[]>([]);

  useEffect(() => {
    if (!selectedTemplateId) {
      setTemplateSections([]);
      return;
    }

    const loadTemplate = async () => {
      try {
        const res = await fetch(`/api/proposals/templates/${selectedTemplateId}`);
        const data = await res.json();
        if (data.data?.sections) {
          setTemplateSections(data.data.sections);
        }
      } catch {
        console.error('Error loading template');
      }
    };

    loadTemplate();
  }, [selectedTemplateId]);

  // Extract variables from template sections
  const extractedVariables = useMemo(() => {
    const varSet = new Set<string>();
    const varRegex = /\{\{([^}]+)\}\}/g;

    for (const section of templateSections) {
      let match;
      while ((match = varRegex.exec(section.body)) !== null) {
        varSet.add(match[1].trim());
      }
    }

    return Array.from(varSet);
  }, [templateSections]);

  // Initialize variables when extracted
  useEffect(() => {
    const newVars: Record<string, string> = {};
    for (const v of extractedVariables) {
      newVars[v] = variables[v] || '';
    }
    setVariables(newVars);
  }, [extractedVariables]);

  const handleNextStep = () => {
    if (step === 'client' && selectedClientId) {
      setStep('template');
    } else if (step === 'template' && selectedTemplateId) {
      if (extractedVariables.length > 0) {
        setStep('variables');
      } else {
        setStep('recipients');
      }
    } else if (step === 'variables') {
      setStep('recipients');
    } else if (step === 'recipients') {
      setStep('quote');
    }
  };

  const handlePrevStep = () => {
    if (step === 'template') {
      setStep('client');
    } else if (step === 'variables') {
      setStep('template');
    } else if (step === 'recipients') {
      if (extractedVariables.length > 0) {
        setStep('variables');
      } else {
        setStep('template');
      }
    } else if (step === 'quote') {
      setStep('recipients');
    }
  };

  const handleCreate = async () => {
    setIsCreating(true);
    setError('');

    try {
      // 1. Create the proposal
      const createRes = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: selectedClientId,
          template_id: selectedTemplateId,
          variables,
          linked_quote_id: selectedQuoteId,
        }),
      });

      const createData = await createRes.json();

      if (!createRes.ok) {
        setError(createData.error || 'Erreur de création');
        return;
      }

      const proposal = createData.data;

      // 2. Set recipients
      if (selectedContactIds.length > 0) {
        await fetch(`/api/proposals/${proposal.id}/recipients`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contactIds: selectedContactIds }),
        });
      }

      setCreatedProposal({
        id: proposal.id,
        public_token: proposal.public_token,
      });
      setStep('done');
    } catch {
      setError('Erreur de connexion');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyLink = async () => {
    if (!createdProposal) return;

    const link = `${window.location.origin}/p/${createdProposal.public_token}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMarkAsSent = async () => {
    if (!createdProposal) return;

    setIsMarkingSent(true);
    try {
      const res = await fetch(`/api/proposals/${createdProposal.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'SENT' }),
      });

      if (res.ok) {
        router.push(`/proposals/${createdProposal.id}`);
      } else {
        const data = await res.json();
        setError(data.error || 'Erreur');
      }
    } catch {
      setError('Erreur de connexion');
    } finally {
      setIsMarkingSent(false);
    }
  };

  const toggleContact = (contactId: string) => {
    setSelectedContactIds((prev) =>
      prev.includes(contactId)
        ? prev.filter((id) => id !== contactId)
        : [...prev, contactId]
    );
  };

  const selectAllContacts = () => {
    setSelectedContactIds(contacts.map((c) => c.id));
  };

  const deselectAllContacts = () => {
    setSelectedContactIds([]);
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.push('/proposals/templates')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Nouvelle proposition</h1>
        </div>

        {/* Progress */}
        {step !== 'done' && (
          <div className="flex items-center gap-2 mb-8">
            {['client', 'template', 'variables', 'recipients', 'quote'].map((s, idx) => {
              // Skip variables step if no variables
              if (s === 'variables' && extractedVariables.length === 0) return null;

              const stepOrder = ['client', 'template', ...(extractedVariables.length > 0 ? ['variables'] : []), 'recipients', 'quote'];
              const currentIdx = stepOrder.indexOf(step);
              const thisIdx = stepOrder.indexOf(s);
              const isActive = step === s;
              const isPast = thisIdx < currentIdx;

              return (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : isPast
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {isPast ? '✓' : thisIdx + 1}
                  </div>
                  {idx < 4 && <div className="w-8 h-0.5 bg-gray-200" />}
                </div>
              );
            })}
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Step: Client */}
        {step === 'client' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">1. Choisir le client</h2>
            {clients.length === 0 ? (
              <p className="text-gray-500">Aucun client disponible.</p>
            ) : (
              <Select
                label="Client"
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                options={[
                  { value: '', label: 'Sélectionner un client...' },
                  ...clients.map((c) => ({
                    value: c.id,
                    label: `${c.nom} (${c.type})`,
                  })),
                ]}
              />
            )}
            <div className="mt-6 flex justify-end">
              <Button onClick={handleNextStep} disabled={!selectedClientId}>
                Suivant
              </Button>
            </div>
          </div>
        )}

        {/* Step: Template */}
        {step === 'template' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">2. Choisir le template</h2>
            {templates.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-gray-500 mb-4">Aucun template disponible.</p>
                <Button variant="secondary" onClick={() => router.push('/proposals/templates')}>
                  Créer un template
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {templates.map((template) => (
                  <label
                    key={template.id}
                    className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedTemplateId === template.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="template"
                      value={template.id}
                      checked={selectedTemplateId === template.id}
                      onChange={(e) => setSelectedTemplateId(e.target.value)}
                      className="sr-only"
                    />
                    <div
                      className="w-4 h-4 rounded-full border"
                      style={{ backgroundColor: template.theme?.accentColor || '#3B82F6' }}
                    />
                    <span className="font-medium text-gray-900">{template.name}</span>
                  </label>
                ))}
              </div>
            )}
            <div className="mt-6 flex justify-between">
              <Button variant="secondary" onClick={handlePrevStep}>
                Précédent
              </Button>
              <Button onClick={handleNextStep} disabled={!selectedTemplateId}>
                Suivant
              </Button>
            </div>
          </div>
        )}

        {/* Step: Variables */}
        {step === 'variables' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">3. Remplir les variables</h2>
            <p className="text-sm text-gray-600 mb-4">
              Ces variables seront remplacées dans le contenu de la proposition.
            </p>
            <div className="space-y-4">
              {extractedVariables.map((varName) => (
                <Input
                  key={varName}
                  label={varName}
                  value={variables[varName] || ''}
                  onChange={(e) =>
                    setVariables((prev) => ({ ...prev, [varName]: e.target.value }))
                  }
                  placeholder={`Valeur pour {{${varName}}}`}
                />
              ))}
            </div>
            <div className="mt-6 flex justify-between">
              <Button variant="secondary" onClick={handlePrevStep}>
                Précédent
              </Button>
              <Button onClick={handleNextStep}>Suivant</Button>
            </div>
          </div>
        )}

        {/* Step: Recipients */}
        {step === 'recipients' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {extractedVariables.length > 0 ? '4' : '3'}. Destinataires
            </h2>
            {contacts.length === 0 ? (
              <p className="text-gray-500">Aucun contact lié à ce client.</p>
            ) : (
              <>
                <div className="flex gap-2 mb-4">
                  <Button size="sm" variant="secondary" onClick={selectAllContacts}>
                    Tout sélectionner
                  </Button>
                  <Button size="sm" variant="secondary" onClick={deselectAllContacts}>
                    Tout désélectionner
                  </Button>
                </div>
                <div className="space-y-2 max-h-64 overflow-auto">
                  {contacts.map((contact) => (
                    <label
                      key={contact.id}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedContactIds.includes(contact.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <Checkbox
                        label=""
                        checked={selectedContactIds.includes(contact.id)}
                        onChange={() => toggleContact(contact.id)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {contact.prenom ? `${contact.prenom} ${contact.nom}` : contact.nom}
                          </span>
                          {contact.is_primary && (
                            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                              Principal
                            </span>
                          )}
                          {contact.role && (
                            <span className="text-xs text-gray-500">({contact.role})</span>
                          )}
                        </div>
                        {contact.email && (
                          <p className="text-sm text-gray-500">{contact.email}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  {selectedContactIds.length} contact(s) sélectionné(s)
                </p>
              </>
            )}
            <div className="mt-6 flex justify-between">
              <Button variant="secondary" onClick={handlePrevStep}>
                Précédent
              </Button>
              <Button onClick={handleNextStep}>Suivant</Button>
            </div>
          </div>
        )}

        {/* Step: Quote */}
        {step === 'quote' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {extractedVariables.length > 0 ? '5' : '4'}. Lier un devis (optionnel)
            </h2>
            {quotes.length === 0 ? (
              <p className="text-gray-500">Aucun devis pour ce client.</p>
            ) : (
              <div className="space-y-2">
                <label
                  className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedQuoteId === null
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="quote"
                    checked={selectedQuoteId === null}
                    onChange={() => setSelectedQuoteId(null)}
                    className="sr-only"
                  />
                  <div
                    className={`w-4 h-4 rounded-full border-2 ${
                      selectedQuoteId === null ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                    }`}
                  />
                  <span className="text-gray-700">Aucun devis</span>
                </label>
                {quotes.map((quote) => (
                  <label
                    key={quote.id}
                    className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedQuoteId === quote.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="quote"
                      value={quote.id}
                      checked={selectedQuoteId === quote.id}
                      onChange={() => setSelectedQuoteId(quote.id)}
                      className="sr-only"
                    />
                    <div
                      className={`w-4 h-4 rounded-full border-2 ${
                        selectedQuoteId === quote.id ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                      }`}
                    />
                    <div>
                      <span className="font-medium text-gray-900">{quote.numero}</span>
                      <span className="text-sm text-gray-500 ml-2">
                        {new Date(quote.date_emission).toLocaleDateString('fr-FR')} - {quote.total_ttc.toFixed(2)} €
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            )}
            <div className="mt-6 flex justify-between">
              <Button variant="secondary" onClick={handlePrevStep}>
                Précédent
              </Button>
              <Button onClick={handleCreate} loading={isCreating}>
                Créer la proposition
              </Button>
            </div>
          </div>
        )}

        {/* Step: Done */}
        {step === 'done' && createdProposal && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Proposition créée</h2>
            <p className="text-gray-600 mb-6">
              Votre proposition est prête. Copiez le lien pour le partager avec votre client.
            </p>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-500 mb-2">Lien public</p>
              <p className="font-mono text-sm text-gray-900 break-all">
                {window.location.origin}/p/{createdProposal.public_token}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={handleCopyLink}>
                {copied ? '✓ Copié !' : 'Copier le lien'}
              </Button>
              <Button
                variant="secondary"
                onClick={handleMarkAsSent}
                loading={isMarkingSent}
              >
                Marquer comme envoyée
              </Button>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <Button
                variant="ghost"
                onClick={() => router.push(`/proposals/${createdProposal.id}`)}
              >
                Voir la proposition →
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
