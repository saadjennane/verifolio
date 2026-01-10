'use client';

import { useState, useEffect } from 'react';
import { Button, Select, Checkbox } from '@/components/ui';
import { Card } from '@/components/ui/Card';
import { useTabsStore } from '@/lib/stores/tabs-store';
import type { BriefTemplate } from '@/lib/briefs/types';

interface Deal {
  id: string;
  title: string;
  status: string;
  client_id: string | null;
  client?: {
    id: string;
    nom: string;
    type: string;
  } | null;
}

interface Contact {
  id: string;
  nom: string;
  prenom: string | null;
  email: string | null;
  telephone: string | null;
}

interface ClientContact {
  contact_id: string;
  contact: Contact;
  role: string | null;
  is_primary: boolean;
}

type Step = 'deal' | 'template';

export function NewBriefTab() {
  const { openTab, closeTab, tabs, activeTabId } = useTabsStore();

  // Data
  const [deals, setDeals] = useState<Deal[]>([]);
  const [templates, setTemplates] = useState<BriefTemplate[]>([]);
  const [clientContacts, setClientContacts] = useState<ClientContact[]>([]);

  // Selection state
  const [selectedDealId, setSelectedDealId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);

  // UI state
  const [step, setStep] = useState<Step>('deal');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  // Derived data
  const selectedDeal = deals.find((d) => d.id === selectedDealId);

  // Load deals and templates on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [dealsRes, templatesRes] = await Promise.all([
          fetch('/api/deals'),
          fetch('/api/briefs/templates'),
        ]);

        const [dealsData, templatesData] = await Promise.all([
          dealsRes.json(),
          templatesRes.json(),
        ]);

        // Check for API errors
        if (!dealsRes.ok) {
          setError(dealsData.error || `Erreur deals: ${dealsRes.status}`);
          return;
        }
        if (!templatesRes.ok) {
          setError(templatesData.error || `Erreur templates: ${templatesRes.status}`);
          return;
        }

        // Filter active deals only (like proposals)
        const activeDeals = (dealsData.deals || []).filter(
          (d: Deal) => !['lost', 'archived'].includes(d.status)
        );
        setDeals(activeDeals);
        setTemplates(templatesData.data || []);

        // Auto-select default template if one exists
        const defaultTemplate = (templatesData.data || []).find(
          (t: BriefTemplate) => t.is_default
        );
        if (defaultTemplate) {
          setSelectedTemplateId(defaultTemplate.id);
        }
      } catch (err) {
        console.error('Error loading brief data:', err);
        setError('Erreur de chargement');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Load client contacts when deal changes
  useEffect(() => {
    const clientId = selectedDeal?.client_id;
    if (!clientId) {
      setClientContacts([]);
      setSelectedContactIds([]);
      return;
    }

    const loadClientContacts = async () => {
      try {
        const res = await fetch(`/api/clients/${clientId}/contacts`);
        const data = await res.json();
        const contacts = data.data || [];
        setClientContacts(contacts);
        // All contacts pre-checked by default
        setSelectedContactIds(contacts.map((cc: ClientContact) => cc.contact_id));
      } catch {
        console.error('Erreur chargement contacts');
      }
    };

    loadClientContacts();
  }, [selectedDeal?.client_id]);

  const handleDealChange = (dealId: string) => {
    setSelectedDealId(dealId);
  };

  const toggleContact = (contactId: string) => {
    setSelectedContactIds((prev) =>
      prev.includes(contactId)
        ? prev.filter((id) => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleNextStep = () => {
    if (step === 'deal' && selectedDealId) {
      setStep('template');
    }
  };

  const handlePrevStep = () => {
    if (step === 'template') {
      setStep('deal');
    }
  };

  const handleCreate = async () => {
    if (!selectedDealId || !selectedTemplateId) return;

    setIsCreating(true);
    setError('');

    try {
      const res = await fetch('/api/briefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deal_id: selectedDealId,
          template_id: selectedTemplateId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erreur de creation');
        return;
      }

      const createdBrief = data.data;

      // Close current tab and open brief detail
      const currentTab = tabs.find((t) => t.id === activeTabId);
      if (currentTab) {
        closeTab(currentTab.id);
      }

      openTab({
        type: 'brief',
        path: `/briefs/${createdBrief.id}`,
        title: createdBrief.title,
        entityId: createdBrief.id,
      }, true);
    } catch {
      setError('Erreur de connexion');
    } finally {
      setIsCreating(false);
    }
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
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Nouveau brief</h1>
          <p className="text-gray-500 mt-1">
            Creez un brief pour collecter des informations aupres de votre client.
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {['deal', 'template'].map((s, idx) => {
            const isActive = step === s;
            const isPast = step === 'template' && s === 'deal';

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
                  {isPast ? '✓' : idx + 1}
                </div>
                {idx < 1 && <div className="w-12 h-0.5 bg-gray-200" />}
              </div>
            );
          })}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Step: Deal */}
        {step === 'deal' && (
          <div className="space-y-6">
            {/* Section Deal */}
            <Card>
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">1. Choisir le deal</h2>
                <p className="text-sm text-gray-500 mb-4">
                  Le brief sera lie a ce deal et au client associe.
                </p>

                {deals.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">Aucun deal disponible.</p>
                    <Button
                      variant="secondary"
                      onClick={() => openTab({ type: 'new-deal', path: '/deals/new', title: 'Nouveau deal' })}
                    >
                      Creer un deal
                    </Button>
                  </div>
                ) : (
                  <>
                    <Select
                      label="Deal"
                      value={selectedDealId}
                      onChange={(e) => handleDealChange(e.target.value)}
                      options={[
                        { value: '', label: 'Selectionnez un deal...' },
                        ...deals.map((d) => ({
                          value: d.id,
                          label: `${d.title}${d.client?.nom ? ` (${d.client.nom})` : ''}`,
                        })),
                      ]}
                    />

                    {selectedDeal && (
                      <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-100">
                        <p className="text-sm text-green-800 font-medium">{selectedDeal.title}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </Card>

            {/* Section Client */}
            {selectedDeal && (
              <Card>
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">2. Client</h2>

                  {selectedDeal.client ? (
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <p className="text-sm text-blue-800">
                        <span className="font-medium">Client du deal :</span> {selectedDeal.client.nom}
                        <span className="text-blue-600 ml-2">({selectedDeal.client.type})</span>
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 bg-orange-50 rounded-lg border border-orange-100">
                      <p className="text-sm text-orange-800">
                        Ce deal n'a pas de client associe. Veuillez d'abord associer un client au deal.
                      </p>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="mt-2"
                        onClick={() => openTab({
                          type: 'deal',
                          path: `/deals/${selectedDeal.id}`,
                          title: selectedDeal.title,
                          entityId: selectedDeal.id,
                        })}
                      >
                        Ouvrir le deal
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Section Contacts */}
            {selectedDeal?.client && (
              <Card>
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">3. Contacts</h2>

                  {clientContacts.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-gray-500 mb-2">Aucun contact pour ce client.</p>
                      <p className="text-sm text-gray-400">
                        Le brief pourra quand meme etre envoye au client.
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-gray-500 mb-4">
                        Selectionnez les contacts qui recevront le brief.
                      </p>
                      <div className="space-y-2 max-h-48 overflow-auto">
                        {clientContacts.map((cc) => (
                          <label
                            key={cc.contact_id}
                            className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                              selectedContactIds.includes(cc.contact_id)
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <Checkbox
                              label=""
                              checked={selectedContactIds.includes(cc.contact_id)}
                              onChange={() => toggleContact(cc.contact_id)}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">
                                  {cc.contact.prenom ? `${cc.contact.prenom} ${cc.contact.nom}` : cc.contact.nom}
                                </span>
                                {cc.is_primary && (
                                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                                    Principal
                                  </span>
                                )}
                              </div>
                              {cc.contact.email && (
                                <p className="text-sm text-gray-500">{cc.contact.email}</p>
                              )}
                            </div>
                          </label>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </Card>
            )}

            {/* Navigation */}
            <div className="flex justify-end">
              <Button onClick={handleNextStep} disabled={!selectedDealId || !selectedDeal?.client}>
                Suivant
              </Button>
            </div>
          </div>
        )}

        {/* Step: Template */}
        {step === 'template' && (
          <div className="space-y-6">
            <Card>
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">2. Choisir le template</h2>
                <p className="text-sm text-gray-500 mb-4">
                  Les questions du template seront copiees dans votre brief.
                </p>

                {templates.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">Aucun template disponible.</p>
                    <p className="text-sm text-gray-400 mb-4">
                      Creez un template pour commencer a utiliser les briefs.
                    </p>
                    <Button
                      variant="primary"
                      onClick={() => openTab({
                        type: 'settings',
                        path: '/settings?tab=brief-templates',
                        title: 'Parametres',
                      })}
                    >
                      Creer un template
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {templates.map((template) => (
                      <label
                        key={template.id}
                        className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
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
                          className={`w-4 h-4 mt-0.5 rounded-full border-2 flex-shrink-0 ${
                            selectedTemplateId === template.id
                              ? 'border-blue-500 bg-blue-500'
                              : 'border-gray-300'
                          }`}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{template.name}</span>
                            {template.is_default && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                Par defaut
                              </span>
                            )}
                          </div>
                          {template.description && (
                            <p className="text-sm text-gray-500 mt-0.5">{template.description}</p>
                          )}
                        </div>
                      </label>
                    ))}

                    {/* Link to create new template */}
                    <div className="pt-4 border-t mt-4 flex items-center justify-between">
                      <p className="text-sm text-gray-500">
                        Aucun template ne vous convient ?
                      </p>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openTab({
                          type: 'settings',
                          path: '/settings?tab=brief-templates',
                          title: 'Parametres',
                        })}
                      >
                        Creer une template
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Resume */}
            <Card>
              <div className="p-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Resume</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Deal :</span>
                    <span className="text-gray-900 font-medium">{selectedDeal?.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Client :</span>
                    <span className="text-gray-900 font-medium">{selectedDeal?.client?.nom}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Contacts :</span>
                    <span className="text-gray-900 font-medium">{selectedContactIds.length} selectionne(s)</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Navigation */}
            <div className="flex justify-between">
              <Button variant="secondary" onClick={handlePrevStep}>
                Precedent
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!selectedTemplateId}
                loading={isCreating}
              >
                Creer le brief
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
