import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import { GaxiosError } from 'gaxios';
import { SheetProfile, FilterConfig, FilterGroup } from './firebase/profilesDB';

// Function to properly format the private key
const formatPrivateKey = (key: string): string => {
  try {
    // Remove any extra quotes and spaces
    let formattedKey = key.trim();
    
    // Remove wrapping quotes if they exist
    if (formattedKey.startsWith('"') && formattedKey.endsWith('"')) {
      formattedKey = formattedKey.slice(1, -1);
    }

    // If the key doesn't have proper line breaks, add them
    if (!formattedKey.includes('\n')) {
      formattedKey = formattedKey
        .replace(/\\n/g, '\n') // Replace literal \n with actual newlines
        .replace(/\s+/g, '\n') // Replace any remaining whitespace with newlines
        .trim(); // Remove any leading/trailing whitespace
    }

    // Ensure the key has the correct format
    const lines = formattedKey.split('\n').map(line => line.trim()).filter(Boolean);
    
    if (!lines[0]?.includes('-----BEGIN PRIVATE KEY-----')) {
      lines.unshift('-----BEGIN PRIVATE KEY-----');
    }
    
    if (!lines[lines.length - 1]?.includes('-----END PRIVATE KEY-----')) {
      lines.push('-----END PRIVATE KEY-----');
    }

    // Filter out any duplicate headers/footers in the middle
    const filteredLines = lines.filter((line, index) => {
      if (index === 0 || index === lines.length - 1) return true;
      return !line.includes('PRIVATE KEY');
    });

    // Join with newlines and ensure proper spacing
    return filteredLines.join('\n');
  } catch (error) {
    console.error('Error formatting private key:', error);
    throw new Error(
      'Failed to format private key: ' + 
      (error instanceof Error ? error.message : 'Unknown error')
    );
  }
};

// Initialize Google Sheets client
const initializeGoogleSheets = async () => {
  if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    throw new Error('Missing required environment variables: GOOGLE_CLIENT_EMAIL or GOOGLE_PRIVATE_KEY');
  }

  try {
    // Format the private key properly
    const privateKey = formatPrivateKey(process.env.GOOGLE_PRIVATE_KEY);
    
    // Log key format details for debugging (without exposing the actual key)
    console.log('Private key validation:', {
      length: privateKey.length,
      hasHeader: privateKey.includes('-----BEGIN PRIVATE KEY-----'),
      hasFooter: privateKey.includes('-----END PRIVATE KEY-----'),
      lineCount: privateKey.split('\n').length,
      firstLine: privateKey.split('\n')[0],
      lastLine: privateKey.split('\n').slice(-1)[0],
      containsNewlines: privateKey.includes('\n'),
    });
    
    const client = new JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
    });

    return google.sheets({ version: 'v4', auth: client });
  } catch (error) {
    console.error('Error initializing Google Sheets client:', error);
    throw new Error(
      'Failed to initialize Google Sheets client: ' + 
      (error instanceof Error ? error.message : 'Unknown error')
    );
  }
};

export interface SheetData {
  date: string;
  values: string[];
  rowIndex: number;
  matchesFilters: boolean;
}

const applyFilters = (row: string[], filterGroups?: SheetProfile['filterGroups']): boolean => {
  if (!filterGroups || filterGroups.length === 0) return true;

  // Each group is connected with AND by default
  return filterGroups.every(group => {
    // Within each group, filters are connected with the specified logical operator
    if (group.logicalOperator === 'AND') {
      return group.filters.every(filter => {
        const value = row[filter.column - 1] || '';
        return applyFilter(value, filter);
      });
    } else { // OR
      return group.filters.some(filter => {
        const value = row[filter.column - 1] || '';
        return applyFilter(value, filter);
      });
    }
  });
};

const applyFilter = (value: string, filter: FilterConfig): boolean => {
  switch (filter.operator) {
    case 'equals':
      return value.toLowerCase() === filter.value.toLowerCase();
    case 'contains':
      return value.toLowerCase().includes(filter.value.toLowerCase());
    case 'startsWith':
      return value.toLowerCase().startsWith(filter.value.toLowerCase());
    case 'endsWith':
      return value.toLowerCase().endsWith(filter.value.toLowerCase());
    default:
      return true;
  }
};

export const fetchSheetData = async (
  spreadsheetId: string, 
  range: string,
  dateColumnIndex: number = 0,
  filterGroups?: SheetProfile['filterGroups']
): Promise<SheetData[]> => {
  if (!spreadsheetId || !range) {
    throw new Error('Missing required parameters: spreadsheetId and range are required');
  }

  // Add range validation and cleanup
  try {
    // Clean up the range string
    const cleanRange = range.trim().replace(/\s+/g, '');
    
    // Validate range format
    if (!cleanRange.includes('!')) {
      throw new Error(`Invalid range format: missing '!' separator. Range: ${range}`);
    }

    const [sheetName, cellRange] = cleanRange.split('!');
    if (!sheetName || !cellRange) {
      throw new Error(`Invalid range format: could not parse sheet name or cell range. Range: ${range}`);
    }

    if (!cellRange.includes(':')) {
      throw new Error(`Invalid range format: missing ':' in cell range. Range: ${range}`);
    }

    console.log('Range validation:', {
      original: range,
      cleaned: cleanRange,
      sheetName,
      cellRange,
    });

    try {
      console.log('Initializing Google Sheets client...');
      const sheets = await initializeGoogleSheets();
      
      console.log(`Fetching data from spreadsheet: ${spreadsheetId}, range: ${cleanRange}`);
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: cleanRange, // Use the cleaned range
      });

      if (!response.data.values) {
        console.log('No data found in sheet');
        return [];
      }

      console.log(`Retrieved ${response.data.values.length} rows of data`);
      const rows = response.data.values;
      
      // Transform data to include dates from specified column and apply filters
      return rows.map((row: string[], index: number) => {
        if (!Array.isArray(row)) {
          console.warn(`Invalid row data at index ${index}:`, row);
          return {
            date: '',
            values: [],
            rowIndex: index + 1,
            matchesFilters: false
          };
        }

        const values = [...row];
        const date = values.length > dateColumnIndex ? values.splice(dateColumnIndex, 1)[0] : '';
        const matchesFilters = applyFilters(row, filterGroups);
        
        return {
          date: date || '',
          values,
          rowIndex: index + 1,
          matchesFilters
        };
      });
    } catch (error: unknown) {
      console.error('Error fetching sheet data:', {
        error,
        spreadsheetId,
        range: cleanRange,
        dateColumnIndex
      });
      
      // Check for specific Google Sheets API errors
      if (error instanceof GaxiosError) {
        if (error.response?.status === 403) {
          throw new Error('Access denied. Please check if the service account has access to this spreadsheet.');
        }
        if (error.response?.status === 404) {
          throw new Error('Spreadsheet not found. Please check the spreadsheet ID.');
        }
      }
      
      throw error;
    }
  } catch (error) {
    throw new Error(
      'Failed to fetch sheet data: ' + 
      (error instanceof Error ? error.message : 'Unknown error')
    );
  }
}; 