import { NextRequest, NextResponse } from 'next/server';
import { fetchSheetData } from '@/app/lib/googleSheets';
import { SheetProfile } from '@/app/lib/firebase/profilesDB';

export const dynamic = 'force-dynamic'; // This is important for dynamic API routes

export async function GET(request: NextRequest) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const spreadsheetId = searchParams.get('spreadsheetId');
    const range = searchParams.get('range');
    const dateColumn = searchParams.get('dateColumn');
    const filterGroupsParam = searchParams.get('filterGroups');
    
    let filterGroups: SheetProfile['filterGroups'] = undefined;
    if (filterGroupsParam) {
      try {
        filterGroups = JSON.parse(filterGroupsParam);
      } catch (err) {
        console.error('Error parsing filter groups:', err);
        return NextResponse.json({ error: 'Invalid filter groups format' }, { status: 400 });
      }
    }

    if (!spreadsheetId || !range || !dateColumn) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
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
      const data = await fetchSheetData(
        spreadsheetId,
        range,
        parseInt(dateColumn) - 1, // Convert to 0-based index
        filterGroups
      );
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