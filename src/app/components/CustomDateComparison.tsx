'use client';

import { useState } from 'react';
import { format } from 'date-fns';

interface CustomDateComparisonProps {
  onCustomDateSelected: (date: string | null) => void;
  currentCustomDate: string | null;
}

export default function CustomDateComparison({
  onCustomDateSelected,
  currentCustomDate
}: CustomDateComparisonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(
    currentCustomDate || format(new Date(), 'yyyy-MM-dd')
  );

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  const applyCustomDate = () => {
    onCustomDateSelected(selectedDate);
    setIsOpen(false);
  };

  const resetToYesterday = () => {
    onCustomDateSelected(null);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 px-3 py-1 text-sm rounded border
          ${currentCustomDate ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-gray-100 border-gray-300 text-gray-800'}
          hover:bg-opacity-80 transition-colors`}
        title={currentCustomDate ? `Currently comparing with ${currentCustomDate}` : "Compare with a custom date"}
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span>
          {currentCustomDate 
            ? `Custom: ${currentCustomDate}` 
            : "Custom Date"}
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 p-4 right-0">
          <div className="space-y-4">
            <div className="text-sm font-medium">Compare today with:</div>
            
            <div>
              <label className="text-sm text-gray-600 block mb-1">Select date:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                className="w-full p-2 border rounded text-black"
                max={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
            
            <div className="flex justify-between">
              <button
                onClick={resetToYesterday}
                className="px-3 py-1 text-sm bg-gray-100 rounded border border-gray-300 hover:bg-gray-200"
              >
                Reset to Yesterday
              </button>
              
              <button
                onClick={applyCustomDate}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 