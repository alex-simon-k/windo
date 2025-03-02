'use client';

import { useSettings } from '@/lib/contexts/SettingsContext';
import SettingsToggle from './SettingsToggle';

// Assuming you have a type for your data
interface OpportunityData {
  id: string;
  primaryColumn: string;
  additionalColumn: string;
  // other fields...
}

export default function ProfileView({ opportunities }: { opportunities: OpportunityData[] }) {
  const { showAdditionalColumn } = useSettings();

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Profile View</h1>
        <SettingsToggle />
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded-lg overflow-hidden">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Primary Column
              </th>
              {showAdditionalColumn && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Additional Column
                </th>
              )}
              {/* Other column headers */}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {opportunities.map((opportunity) => (
              <tr key={opportunity.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {opportunity.id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {opportunity.primaryColumn}
                </td>
                {showAdditionalColumn && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {opportunity.additionalColumn}
                  </td>
                )}
                {/* Other cells */}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Analytics section that only uses the primary column */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Analytics</h2>
        {/* Your analytics components that only use the primary column data */}
      </div>
    </div>
  );
} 