'use client';

import { useSettings } from '@/lib/contexts/SettingsContext';

export default function SettingsToggle() {
  const { showAdditionalColumn, toggleAdditionalColumn } = useSettings();

  return (
    <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-gray-200">
      <span className="text-sm font-medium text-gray-700">
        {showAdditionalColumn ? 'Hide Additional Data' : 'Show Additional Data'}
      </span>
      <button
        onClick={toggleAdditionalColumn}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          showAdditionalColumn ? 'bg-blue-600' : 'bg-gray-200'
        }`}
        aria-label={showAdditionalColumn ? 'Hide additional column' : 'Show additional column'}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            showAdditionalColumn ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
} 