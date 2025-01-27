import { NextResponse } from 'next/server';
import { fetchSheetData } from '@/app/lib/googleSheets';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const spreadsheetId = searchParams.get('spreadsheetId');
  const range = searchParams.get('range');
  const dateColumn = searchParams.get('dateColumn');

  if (!spreadsheetId || !range) {
    return NextResponse.json(
      { error: 'Missing spreadsheetId or range parameter' },
      { status: 400 }
    );
  }

  try {
    const dateColumnIndex = dateColumn ? parseInt(dateColumn) - 1 : 0;
    const data = await fetchSheetData(spreadsheetId, range, dateColumnIndex);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch sheet data' },
      { status: 500 }
    );
  }
} 