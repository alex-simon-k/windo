import { NextResponse } from 'next/server';
import { fetchSheetData } from '@/app/lib/googleSheets';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const spreadsheetId = searchParams.get('spreadsheetId');
    const range = searchParams.get('range');
    const dateColumn = searchParams.get('dateColumn');

    if (!spreadsheetId || !range) {
      return NextResponse.json(
        { error: 'Missing required parameters: spreadsheetId and range are required' },
        { status: 400 }
      );
    }

    // Validate environment variables
    if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      console.error('Missing Google Sheets credentials');
      return NextResponse.json(
        { error: 'Server configuration error: Missing Google Sheets credentials' },
        { status: 500 }
      );
    }

    try {
      const dateColumnIndex = dateColumn ? parseInt(dateColumn) - 1 : 0;
      const data = await fetchSheetData(spreadsheetId, range, dateColumnIndex);
      return NextResponse.json(data);
    } catch (error) {
      console.error('Sheet data fetch error:', error);
      return NextResponse.json(
        { 
          error: error instanceof Error ? error.message : 'Failed to fetch sheet data',
          details: process.env.NODE_ENV === 'development' ? error : undefined
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 