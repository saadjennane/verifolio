'use client';

import { useState, useEffect } from 'react';
import { isValidHexColor } from '@/lib/utils/color';

interface ColorPickerProps {
  label?: string;
  value: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  const [inputValue, setInputValue] = useState(value);

  // Sync input with external value
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleColorInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setInputValue(color);
    onChange(color);
  };

  const handleTextInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    let color = e.target.value;

    // Add # if missing
    if (color && !color.startsWith('#')) {
      color = '#' + color;
    }

    setInputValue(color);

    // Only update parent if valid hex
    if (isValidHexColor(color)) {
      onChange(color);
    }
  };

  const handleTextBlur = () => {
    // Reset to valid value on blur if invalid
    if (!isValidHexColor(inputValue)) {
      setInputValue(value);
    }
  };

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={handleColorInput}
          className="w-10 h-10 rounded cursor-pointer border border-gray-300 bg-white p-0.5"
        />
        <input
          type="text"
          value={inputValue}
          onChange={handleTextInput}
          onBlur={handleTextBlur}
          className="w-28 font-mono text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="#1e40af"
          maxLength={7}
        />
      </div>
    </div>
  );
}
