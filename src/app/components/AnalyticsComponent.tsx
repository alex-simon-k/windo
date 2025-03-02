'use client';

interface OpportunityData {
  id: string;
  primaryColumn: string;
  additionalColumn: string;
  // other fields...
}

export default function AnalyticsComponent({ opportunities }: { opportunities: OpportunityData[] }) {
  // Only use the primary column for analytics
  const analyticData = opportunities.map(opp => opp.primaryColumn);
  
  // Process the data for analytics
  // ...

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-medium mb-2">Analytics</h3>
      {/* Render your analytics based only on the primary column */}
    </div>
  );
} 