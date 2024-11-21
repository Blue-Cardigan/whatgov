import { NextRequest, NextResponse } from 'next/server';

const ORAL_QUESTIONS_API = 'https://oralquestionsandmotions-api.parliament.uk/oralquestions/list';
const PAGE_SIZE = 100;

async function fetchQuestionsPage(baseParams: URLSearchParams, skip: number): Promise<any> {
  const queryParams = new URLSearchParams(baseParams);
  queryParams.set('parameters.skip', skip.toString());
  queryParams.set('parameters.take', PAGE_SIZE.toString());

  const url = `${ORAL_QUESTIONS_API}?${queryParams.toString()}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const queryParams = new URLSearchParams();

    // Map the date parameters
    const dateParams = ['answeringDateStart', 'answeringDateEnd'];
    for (const param of dateParams) {
      const value = params.get(param);
      if (value) {
        queryParams.append(`parameters.${param}`, value);
      }
    }

    // Fetch first page
    const firstPage = await fetchQuestionsPage(queryParams, 0);
    let allQuestions = firstPage.Response || [];
    
    // If we got PAGE_SIZE results, there might be more pages
    if (allQuestions.length === PAGE_SIZE) {
      const total = firstPage.PagingInfo?.Total || PAGE_SIZE;
      const remainingPages = Math.ceil((total - PAGE_SIZE) / PAGE_SIZE);
      
      // Fetch remaining pages in parallel
      const remainingPagesPromises = Array.from(
        { length: remainingPages },
        (_, i) => fetchQuestionsPage(queryParams, (i + 1) * PAGE_SIZE)
      );
      
      const additionalPages = await Promise.all(remainingPagesPromises);
      
      // Combine all results
      additionalPages.forEach(page => {
        if (page.Response) {
          allQuestions = allQuestions.concat(page.Response);
        }
      });
    }
    
    return NextResponse.json({
      ...firstPage,
      Response: allQuestions
    });
  } catch (error) {
    console.error('Oral Questions API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch oral questions' },
      { status: 500 }
    );
  }
} 