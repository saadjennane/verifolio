'use client';

interface DocTypeSelectorProps {
  onSelect: (type: 'invoice' | 'quote') => void;
}

// Invoice icon (document with lines)
function InvoiceIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

// Quote icon (clipboard with list)
function QuoteIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  );
}

export function DocTypeSelector({ onSelect }: DocTypeSelectorProps) {
  const docTypes = [
    {
      type: 'invoice' as const,
      label: 'Facture',
      description: 'Configurez le modèle de vos factures',
      Icon: InvoiceIcon,
    },
    {
      type: 'quote' as const,
      label: 'Devis',
      description: 'Configurez le modèle de vos devis',
      Icon: QuoteIcon,
    },
  ];

  return (
    <div className="py-8">
      <h2 className="text-lg font-medium text-gray-900 mb-2">
        Sélectionnez un type de document
      </h2>
      <p className="text-sm text-gray-500 mb-8">
        Choisissez le type de document à personnaliser
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
        {docTypes.map(({ type, label, description, Icon }) => (
          <button
            key={type}
            onClick={() => onSelect(type)}
            className="group p-6 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all text-left"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                <Icon className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{label}</h3>
            </div>
            <p className="text-sm text-gray-500">{description}</p>
            <div className="mt-4 text-sm font-medium text-blue-600 group-hover:text-blue-700">
              Configurer →
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
