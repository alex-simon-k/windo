// CSV Export Utility Functions

/**
 * Convert array data to CSV format
 */
export function arrayToCSV(data: any[][]): string {
  return data.map(row => 
    row.map(cell => {
      // Handle cells that might contain commas or quotes
      if (cell === null || cell === undefined) {
        return '';
      }
      const cellStr = String(cell);
      if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
      }
      return cellStr;
    }).join(',')
  ).join('\n');
}

/**
 * Create a downloadable CSV file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Format date for filename
 */
export function formatDateForFilename(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
} 