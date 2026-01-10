'use client';

import { useState, useRef, useEffect } from 'react';

export interface EntityOption {
  id: string;
  label: string;
  description?: string;
}

interface EntityAutocompleteProps {
  label?: string;
  value: string; // ID de l'entité sélectionnée
  onChange: (id: string) => void;
  options: EntityOption[];
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
}

export function EntityAutocomplete({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
  loading,
}: EntityAutocompleteProps) {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Trouver le label de l'entité sélectionnée
  const selectedEntity = options.find((opt) => opt.id === value);

  // Synchroniser inputValue avec l'entité sélectionnée
  useEffect(() => {
    if (selectedEntity) {
      setInputValue(selectedEntity.label);
    } else if (!value) {
      setInputValue('');
    }
  }, [value, selectedEntity]);

  // Filter options based on input value
  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(inputValue.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        // Restore selected entity label if user clicked outside
        if (selectedEntity) {
          setInputValue(selectedEntity.label);
        } else {
          setInputValue('');
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedEntity]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        // Restore selected entity label
        if (selectedEntity) {
          setInputValue(selectedEntity.label);
        } else {
          setInputValue('');
        }
        break;
    }
  };

  const handleSelect = (option: EntityOption) => {
    onChange(option.id);
    setInputValue(option.label);
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const handleClear = () => {
    onChange('');
    setInputValue('');
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={loading ? 'Chargement...' : placeholder}
          disabled={disabled || loading}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
        />
        {value && !disabled && !loading && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            title="Effacer"
          >
            ✕
          </button>
        )}
      </div>
      {isOpen && !loading && filteredOptions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-auto"
        >
          {filteredOptions.map((option, index) => (
            <button
              key={option.id}
              type="button"
              onClick={() => handleSelect(option)}
              className={`w-full px-3 py-2 text-left text-sm ${
                index === highlightedIndex
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="font-medium">{option.label}</div>
              {option.description && (
                <div className="text-xs text-gray-500 mt-0.5">{option.description}</div>
              )}
            </button>
          ))}
        </div>
      )}
      {isOpen && !loading && inputValue && filteredOptions.length === 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3"
        >
          <p className="text-sm text-gray-500">Aucun résultat trouvé</p>
        </div>
      )}
    </div>
  );
}
