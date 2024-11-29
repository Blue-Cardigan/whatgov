import { NextRequest, NextResponse } from 'next/server';
import { HANSARD_API_BASE } from '@/lib/search-api';

export async function GET(request: NextRequest) {
  try {
    // Get the search parameters from the request URL
    const searchParams = request.nextUrl.searchParams;
    
    // Construct the Hansard API URL
    const url = `${HANSARD_API_BASE}/search.json?${searchParams.toString()}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Validate the response structure
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid API response format');
    }

    // Expanded validated data structure to include all possible fields
    const validatedData = {
      TotalMembers: data.TotalMembers || 0,
      TotalContributions: data.TotalContributions || 0,
      TotalWrittenStatements: data.TotalWrittenStatements || 0,
      TotalWrittenAnswers: data.TotalWrittenAnswers || 0,
      TotalCorrections: data.TotalCorrections || 0,
      TotalPetitions: data.TotalPetitions || 0,
      TotalDebates: data.TotalDebates || 0,
      TotalCommittees: data.TotalCommittees || 0,
      TotalDivisions: data.TotalDivisions || 0,
      SearchTerms: Array.isArray(data.SearchTerms) ? data.SearchTerms : [],
      Members: Array.isArray(data.Members) ? data.Members : [],
      Contributions: Array.isArray(data.Contributions) ? data.Contributions : [],
      WrittenStatements: Array.isArray(data.WrittenStatements) ? data.WrittenStatements : [],
      WrittenAnswers: Array.isArray(data.WrittenAnswers) ? data.WrittenAnswers : [],
      Corrections: Array.isArray(data.Corrections) ? data.Corrections : [],
      Petitions: Array.isArray(data.Petitions) ? data.Petitions : [],
      Debates: Array.isArray(data.Debates) ? data.Debates : [],
      Divisions: Array.isArray(data.Divisions) ? data.Divisions : [],
      Committees: Array.isArray(data.Committees) ? data.Committees : []
    };

    return NextResponse.json(validatedData);
  } catch (error) {
    console.error('Search API error:', error);
    
    // Return a more detailed error response
    return NextResponse.json(
      { 
        error: 'Failed to fetch search results',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}