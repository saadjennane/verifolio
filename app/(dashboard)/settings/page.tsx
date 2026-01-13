'use client';

import { useState } from 'react';
import { ProfileSettings } from '@/components/settings/ProfileSettings';
import { CompanySettings } from '@/components/settings/CompanySettings';
import { CustomFieldsSettings } from '@/components/settings/CustomFieldsSettings';
import { TemplateSettings } from '@/components/settings/TemplateSettings';
import { NavigationSettings } from '@/components/settings/NavigationSettings';
import { TrashSettings } from '@/components/settings/TrashSettings';
import { ReviewTemplatesSettings } from '@/components/settings/ReviewTemplatesSettings';
import { VerifolioSettings } from '@/components/settings/VerifolioSettings';

type SettingsTab = 'profile' | 'company' | 'fields' | 'template' | 'reviews' | 'verifolio' | 'navigation' | 'trash';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

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
          <nav className="flex gap-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab('profile')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'profile'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Mon profil
            </button>
            <button
              onClick={() => setActiveTab('company')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'company'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Entreprise
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
              onClick={() => setActiveTab('reviews')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'reviews'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Reviews
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
        {activeTab === 'profile' && <ProfileSettings />}
        {activeTab === 'company' && <CompanySettings />}
        {activeTab === 'fields' && <CustomFieldsSettings />}
        {activeTab === 'template' && <TemplateSettings />}
        {activeTab === 'reviews' && <ReviewTemplatesSettings />}
        {activeTab === 'verifolio' && <VerifolioSettings />}
        {activeTab === 'navigation' && <NavigationSettings />}
        {activeTab === 'trash' && <TrashSettings />}
      </div>
    </div>
  );
}
