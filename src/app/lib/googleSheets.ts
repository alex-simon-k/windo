import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

// Initialize Google Sheets client
const initializeGoogleSheets = async () => {
  try {
    const client = new JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
    });

    const sheets = google.sheets({ version: 'v4', auth: client });
    return sheets;
  } catch (error) {
    console.error('Error initializing Google Sheets:', error);
    throw error;
  }
};

export interface SheetData {
  date: string;
  values: string[];
  rowIndex: number;
}

export const fetchSheetData = async (
  spreadsheetId: string, 
  range: string,
  dateColumnIndex: number = 0
): Promise<SheetData[]> => {
  const sheets = await initializeGoogleSheets();
  
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values || [];
    
    // Transform data to include dates from specified column
    return rows.map((row: string[], index: number) => {
      const values = [...row];
      const date = values.splice(dateColumnIndex, 1)[0];
      return {
        date,
        values,
        rowIndex: index + 1
      };
    });
  } catch (error) {
    console.error('Error fetching sheet data:', error);
    throw error;
  }
}; 