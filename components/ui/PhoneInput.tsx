'use client';

import { forwardRef, useState, useRef, useEffect } from 'react';

// Liste des pays avec indicatifs (les plus courants en premier)
const COUNTRIES = [
  { code: 'MA', name: 'Maroc', dial: '+212', flag: '🇲🇦' },
  { code: 'FR', name: 'France', dial: '+33', flag: '🇫🇷' },
  { code: 'BE', name: 'Belgique', dial: '+32', flag: '🇧🇪' },
  { code: 'CH', name: 'Suisse', dial: '+41', flag: '🇨🇭' },
  { code: 'CA', name: 'Canada', dial: '+1', flag: '🇨🇦' },
  { code: 'US', name: 'États-Unis', dial: '+1', flag: '🇺🇸' },
  { code: 'GB', name: 'Royaume-Uni', dial: '+44', flag: '🇬🇧' },
  { code: 'DE', name: 'Allemagne', dial: '+49', flag: '🇩🇪' },
  { code: 'ES', name: 'Espagne', dial: '+34', flag: '🇪🇸' },
  { code: 'IT', name: 'Italie', dial: '+39', flag: '🇮🇹' },
  { code: 'PT', name: 'Portugal', dial: '+351', flag: '🇵🇹' },
  { code: 'NL', name: 'Pays-Bas', dial: '+31', flag: '🇳🇱' },
  { code: 'DZ', name: 'Algérie', dial: '+213', flag: '🇩🇿' },
  { code: 'TN', name: 'Tunisie', dial: '+216', flag: '🇹🇳' },
  { code: 'SN', name: 'Sénégal', dial: '+221', flag: '🇸🇳' },
  { code: 'CI', name: 'Côte d\'Ivoire', dial: '+225', flag: '🇨🇮' },
  { code: 'CM', name: 'Cameroun', dial: '+237', flag: '🇨🇲' },
  { code: 'AE', name: 'Émirats arabes unis', dial: '+971', flag: '🇦🇪' },
  { code: 'SA', name: 'Arabie saoudite', dial: '+966', flag: '🇸🇦' },
  { code: 'LU', name: 'Luxembourg', dial: '+352', flag: '🇱🇺' },
];

interface PhoneInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  defaultCountry?: string;
}

// Parse phone value to extract country code and number
function parsePhone(value: string): { countryCode: string; number: string } {
  if (!value) return { countryCode: 'MA', number: '' };

  // Try to find matching country by dial code
  const trimmed = value.trim();
  for (const country of COUNTRIES) {
    if (trimmed.startsWith(country.dial)) {
      return {
        countryCode: country.code,
        number: trimmed.slice(country.dial.length).trim(),
      };
    }
  }

  // If starts with +, unknown country code
  if (trimmed.startsWith('+')) {
    return { countryCode: 'MA', number: trimmed };
  }

  // Default to Morocco
  return { countryCode: 'MA', number: trimmed };
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ label, value, onChange, error, placeholder = '6 12 34 56 78', required, disabled, className = '', defaultCountry = 'MA' }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Parse current value
    const parsed = parsePhone(value);
    const [selectedCountry, setSelectedCountry] = useState(
      COUNTRIES.find(c => c.code === parsed.countryCode) ||
      COUNTRIES.find(c => c.code === defaultCountry) ||
      COUNTRIES[0]
    );
    const [phoneNumber, setPhoneNumber] = useState(parsed.number);

    // Update internal state when value prop changes
    useEffect(() => {
      const parsed = parsePhone(value);
      const country = COUNTRIES.find(c => c.code === parsed.countryCode) || selectedCountry;
      setSelectedCountry(country);
      setPhoneNumber(parsed.number);
    }, [value]);

    // Close dropdown on outside click
    useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      }
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    function handleCountrySelect(country: typeof COUNTRIES[0]) {
      setSelectedCountry(country);
      setIsOpen(false);
      // Update full value
      const fullNumber = phoneNumber ? `${country.dial} ${phoneNumber}` : '';
      onChange(fullNumber);
    }

    function handleNumberChange(e: React.ChangeEvent<HTMLInputElement>) {
      const newNumber = e.target.value;
      setPhoneNumber(newNumber);
      // Update full value
      const fullNumber = newNumber ? `${selectedCountry.dial} ${newNumber}` : '';
      onChange(fullNumber);
    }

    return (
      <div className={`w-full ${className}`}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}

        <div className="relative flex">
          {/* Country selector */}
          <div ref={dropdownRef} className="relative">
            <button
              type="button"
              onClick={() => !disabled && setIsOpen(!isOpen)}
              disabled={disabled}
              className={`
                flex items-center gap-1 px-2 py-2 text-sm border rounded-l-lg
                bg-gray-50 hover:bg-gray-100 transition-colors
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:z-10
                disabled:opacity-50 disabled:cursor-not-allowed
                ${error ? 'border-red-500' : 'border-gray-300'}
                border-r-0
              `}
            >
              <span className="text-base">{selectedCountry.flag}</span>
              <span className="text-gray-600 text-xs font-medium">{selectedCountry.dial}</span>
              <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown */}
            {isOpen && (
              <div className="absolute z-50 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 max-h-60 overflow-auto">
                {COUNTRIES.map(country => (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => handleCountrySelect(country)}
                    className={`
                      w-full flex items-center gap-2 px-3 py-2 text-sm text-left
                      hover:bg-gray-50 transition-colors
                      ${country.code === selectedCountry.code ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}
                    `}
                  >
                    <span className="text-base">{country.flag}</span>
                    <span className="flex-1">{country.name}</span>
                    <span className="text-gray-400 text-xs">{country.dial}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Phone number input */}
          <input
            ref={ref}
            type="tel"
            value={phoneNumber}
            onChange={handleNumberChange}
            placeholder={placeholder}
            disabled={disabled}
            className={`
              flex-1 min-w-0 rounded-r-lg border px-3 py-2 text-sm
              placeholder:text-gray-400
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
              ${error ? 'border-red-500' : 'border-gray-300'}
            `}
          />
        </div>

        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }
);

PhoneInput.displayName = 'PhoneInput';
