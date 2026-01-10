'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { CompanySettings } from '@/components/settings/CompanySettings';
import { ActivitiesSettings } from '@/components/settings/ActivitiesSettings';
import { CustomFieldsSettings } from '@/components/settings/CustomFieldsSettings';
import { TemplateSettings } from '@/components/settings/TemplateSettings';
import { BriefTemplatesSettings } from '@/components/settings/BriefTemplatesSettings';
import { ReviewTemplatesSettings } from '@/components/settings/ReviewTemplatesSettings';
import { VerifolioSettings } from '@/components/settings/VerifolioSettings';
import { NavigationSettings } from '@/components/settings/NavigationSettings';
import { TrashSettings } from '@/components/settings/TrashSettings';

type SettingsTabType = 'company' | 'activities' | 'fields' | 'template' | 'brief-templates' | 'review-templates' | 'verifolio' | 'navigation' | 'trash';

export function SettingsTab() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<SettingsTabType>('company');

  // Handle URL param for tab selection
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'brief-templates') {
      setActiveTab('brief-templates');
    }
  }, [searchParams]);

  return (
    <div className="h-full overflow-auto p-6">
      <div className={activeTab === 'template' ? 'max-w-full' : 'max-w-4xl mx-auto'}>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
          <p className="text-gray-500 mt-1">Configurez votre entreprise et vos documents</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex gap-6">
            <button
              onClick={() => setActiveTab('company')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'company'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Entreprise
            </button>
            <button
              onClick={() => setActiveTab('activities')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'activities'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Mes activités
            </button>
            <button
              onClick={() => setActiveTab('fields')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'fields'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Champs personnalisés
            </button>
            <button
              onClick={() => setActiveTab('template')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'template'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Modèle de document
            </button>
            <button
              onClick={() => setActiveTab('brief-templates')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'brief-templates'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Templates de briefs
            </button>
            <button
              onClick={() => setActiveTab('review-templates')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'review-templates'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Templates de reviews
            </button>
            <button
              onClick={() => setActiveTab('verifolio')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'verifolio'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Mon Verifolio
            </button>
            <button
              onClick={() => setActiveTab('navigation')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'navigation'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Navigation
            </button>
            <button
              onClick={() => setActiveTab('trash')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'trash'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Corbeille
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'company' && <CompanySettings />}
        {activeTab === 'activities' && <ActivitiesSettings />}
        {activeTab === 'fields' && <CustomFieldsSettings />}
        {activeTab === 'template' && <TemplateSettings />}
        {activeTab === 'brief-templates' && <BriefTemplatesSettings />}
        {activeTab === 'review-templates' && <ReviewTemplatesSettings />}
        {activeTab === 'verifolio' && <VerifolioSettings />}
        {activeTab === 'navigation' && <NavigationSettings />}
        {activeTab === 'trash' && <TrashSettings />}
      </div>
    </div>
  );
}
