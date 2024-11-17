import { NextRequest, NextResponse } from 'next/server';
import { HANSARD_API_BASE } from '@/lib/hansard-api';

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const queryParams = new URLSearchParams();
    
    // Define all possible query parameters
    const paramMapping: Record<string, string> = {
      'searchTerm': 'queryParameters.searchTerm',
      'house': 'queryParameters.house',
      'startDate': 'queryParameters.startDate',
      'endDate': 'queryParameters.endDate',
      'date': 'queryParameters.date',
      'memberId': 'queryParameters.memberId',
      'skip': 'queryParameters.skip',
      'take': 'queryParameters.take',
      'debateType': 'queryParameters.debateType',
      'orderBy': 'queryParameters.orderBy',
      'department': 'queryParameters.department',
      'includeFormer': 'queryParameters.includeFormer',
      'includeCurrent': 'queryParameters.includeCurrent',
      'withDivision': 'queryParameters.withDivision',
      'outputType': 'queryParameters.outputType',
      'timelineGroupingSize': 'queryParameters.timelineGroupingSize'
    };

    // Handle search term construction
    const searchParts: string[] = [];
    
    // Handle base search term FIRST
    const baseSearchTerm = params.get('searchTerm');
    if (baseSearchTerm) {
      searchParts.push(baseSearchTerm);
    }

    // Handle directives AFTER the base term
    const directiveParams = {
      'spokenBy': 'spokenby',
      'debate': 'debate',
      'words': 'words'
    };

    for (const [param, directive] of Object.entries(directiveParams)) {
      const value = params.get(param);
      if (value) {
        // Ensure proper quoting of directive values
        const quotedValue = value.includes(' ') ? `"${value}"` : value;
        searchParts.push(`${directive}:${quotedValue}`);
      }
    }

    // Combine all parts with AND operator
    if (searchParts.length > 0) {
      const searchTerm = searchParts.join(' AND ');
      queryParams.append('queryParameters.searchTerm', searchTerm);
    }

    // Add remaining parameters with proper mapping
    for (const [key, mappedKey] of Object.entries(paramMapping)) {
      const value = params.get(key);
      if (value !== null && key !== 'searchTerm') { // Skip searchTerm as it's already handled
        // Handle boolean parameters
        if (['includeFormer', 'includeCurrent', 'withDivision'].includes(key)) {
          queryParams.append(mappedKey, value === 'true' ? 'true' : 'false');
        }
        // Handle date parameters
        else if (['startDate', 'endDate', 'date'].includes(key)) {
          // Ensure date is in yyyy-mm-dd format
          const dateValue = new Date(value).toISOString().split('T')[0];
          queryParams.append(mappedKey, dateValue);
        }
        // Handle numeric parameters
        else if (['memberId', 'skip', 'take'].includes(key)) {
          queryParams.append(mappedKey, value);
        }
        // Handle enum parameters
        else if (key === 'timelineGroupingSize' && ['Day', 'Month', 'Year'].includes(value)) {
          queryParams.append(mappedKey, value);
        }
        else if (key === 'orderBy' && ['SittingDateAsc', 'SittingDateDesc'].includes(value)) {
          queryParams.append(mappedKey, value);
        }
        // Handle all other string parameters
        else {
          queryParams.append(mappedKey, value);
        }
      }
    }

    // Always request JSON format
    const url = `${HANSARD_API_BASE}/search.json?${queryParams.toString()}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch search results' },
      { status: 500 }
    );
  }
}