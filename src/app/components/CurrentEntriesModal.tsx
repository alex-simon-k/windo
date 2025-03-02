'use client';

import { useSettings } from '@/lib/contexts/SettingsContext';

interface CurrentEntriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: string[];
  additionalEntries?: string[]; // New prop for additional column data
  profileName: string;
  columnIndex: number;
}

export default function CurrentEntriesModal({ 
  isOpen, 
  onClose, 
  entries, 
  additionalEntries = [], 
  profileName, 
  columnIndex 
}: CurrentEntriesModalProps) {
  const { showAdditionalColumn } = useSettings();
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Current Entries for {profileName}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            Showing all current entries from column {columnIndex}
            <div className="text-xs mt-1">
              Total entries: {entries.length}
            </div>
          </div>
          
          <div className="mb-4">
            <AdditionalColumnToggle />
          </div>
          
          <div className="bg-white border rounded-lg">
            {entries.length > 0 ? (
              <div className="divide-y">
                {entries.map((entry, index) => (
                  <div key={index} className="p-2 hover:bg-gray-50 flex items-center">
                    <span className="text-gray-400 text-sm mr-2">{index + 1}.</span>
                    <div className="flex-1">
                      <span className="text-gray-800">{entry}</span>
                      
                      {/* Show additional column data if enabled and available */}
                      {showAdditionalColumn && additionalEntries[index] && (
                        <span className="ml-4 text-blue-600 border-l border-gray-300 pl-4">
                          {additionalEntries[index]}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic p-4">No entries found</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 