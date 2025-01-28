import { NextRequest, NextResponse } from 'next/server';
import { fetchSheetData } from '@/app/lib/googleSheets';
import { SheetProfile } from '@/app/lib/firebase/profilesDB';

export const dynamic = 'force-dynamic'; // This is important for dynamic API routes

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const spreadsheetId = searchParams.get('spreadsheetId');
    const range = searchParams.get('range');
    const dateColumn = searchParams.get('dateColumn');
    const filtersParam = searchParams.get('filters');
    
    let filters: SheetProfile['filters'] = undefined;
    if (filtersParam) {
      try {
        filters = JSON.parse(filtersParam);
      } catch (e) {
        console.error('Failed to parse filters:', e);
      }
    }

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

    // Log the private key format (but not the actual key)
    console.log('Private key validation:', {
      length: process.env.GOOGLE_PRIVATE_KEY.length,
      hasHeader: process.env.GOOGLE_PRIVATE_KEY.includes('-----BEGIN PRIVATE KEY-----'),
      hasFooter: process.env.GOOGLE_PRIVATE_KEY.includes('-----END PRIVATE KEY-----'),
      hasNewlines: process.env.GOOGLE_PRIVATE_KEY.includes('\\n'),
    });

    try {
      const dateColumnIndex = dateColumn ? parseInt(dateColumn) - 1 : 0;
      const data = await fetchSheetData(spreadsheetId, range, dateColumnIndex, filters);
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