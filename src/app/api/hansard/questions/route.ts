import { NextRequest, NextResponse } from 'next/server';

interface ApiResponse<T> {
  data: T;
  error?: string;
}

interface ApiError {
  ok: false;
  status: number;
  error: Error;
}

interface HansardApiError {
  message: string;
}

interface HansardApiResponse<T> {
  Success: boolean;
  Response: T[];
  Errors?: HansardApiError[];
}

interface HansardApiFallback {
  Success: boolean;
  Response: never[];
  Errors?: HansardApiError[];
}

const MAX_ITEMS_PER_REQUEST = 100;

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const dateStart = params.get('dateStart');
    const dateEnd = params.get('dateEnd');
    const skip = parseInt(params.get('skip') || '0');

    if (!dateStart || !dateEnd) {
      throw new Error('Date parameters are required');
    }

    const baseUrl = process.env.HANSARD_QUESTIONS_URL;
    if (!baseUrl) {
      throw new Error('API URL not configured');
    }

    // Update parameters to include pagination
    const edmsParams = new URLSearchParams({
      'parameters.currentStatusDateStart': dateStart,
      'parameters.currentStatusDateEnd': dateEnd,
      'parameters.isPrayer': 'false',
      'parameters.statuses': 'Published',
      'parameters.take': MAX_ITEMS_PER_REQUEST.toString(),
      'parameters.skip': skip.toString()
    });

    const questionsParams = new URLSearchParams({
      'parameters.answeringDateStart': dateStart,
      'parameters.answeringDateEnd': dateEnd,
      'parameters.take': MAX_ITEMS_PER_REQUEST.toString(),
      'parameters.skip': skip.toString()
    });

    const timesParams = new URLSearchParams({
      'parameters.answeringDateStart': dateStart,
      'parameters.answeringDateEnd': dateEnd,
      'parameters.take': MAX_ITEMS_PER_REQUEST.toString(),
      'parameters.skip': skip.toString()
    });

    // Execute requests with proper error handling
    const [edmsResponse, questionsResponse, timesResponse] = await Promise.all([
      fetch(`${baseUrl}/EarlyDayMotions/list?${edmsParams.toString()}`, {
        headers: { 
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      }).catch((error): ApiError => ({ ok: false, status: 500, error })),
      
      fetch(`${baseUrl}/oralquestions/list?${questionsParams.toString()}`, {
        headers: { 
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      }).catch((error): ApiError => ({ ok: false, status: 500, error })),
      
      fetch(`${baseUrl}/oralquestiontimes/list?${timesParams.toString()}`, {
        headers: { 
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      }).catch((error): ApiError => ({ ok: false, status: 500, error }))
    ]);

    // Collect any errors
    const errors = [];
    if (!edmsResponse.ok) {
      const errorMessage = edmsResponse instanceof Response 
        ? await edmsResponse.text()
        : edmsResponse.error?.message || 'Unknown error';
      errors.push(`EDMs API failed: ${edmsResponse.status} ${errorMessage}`);
    }
    if (!questionsResponse.ok) {
      const errorMessage = questionsResponse instanceof Response 
        ? await questionsResponse.text()
        : questionsResponse.error?.message || 'Unknown error';
      errors.push(`Questions API failed: ${questionsResponse.status} ${errorMessage}`);
    }
    if (!timesResponse.ok) {
      const errorMessage = timesResponse instanceof Response 
        ? await timesResponse.text()
        : timesResponse.error?.message || 'Unknown error';
      errors.push(`Times API failed: ${timesResponse.status} ${errorMessage}`);
    }

    // If all requests failed, throw error with detailed information
    if (errors.length === 3) {
      console.error('All requests failed:', {
        edmsUrl: `${baseUrl}/EarlyDayMotions/list?${edmsParams.toString()}`,
        questionsUrl: `${baseUrl}/oralquestions/list?${questionsParams.toString()}`,
        timesUrl: `${baseUrl}/oralquestiontimes/list?${timesParams.toString()}`,
        errors
      });
      throw new Error(`All API requests failed: ${errors.join(', ')}`);
    }

    // Try to parse successful responses
    const [edmsData, questionsData, timesData] = await Promise.all([
      edmsResponse instanceof Response
        ? (edmsResponse.json() as Promise<HansardApiResponse<unknown>>).catch(
            (): HansardApiFallback => ({ Success: false, Response: [], Errors: [] })
          ) 
        : { Success: false, Response: [], Errors: [] },
      questionsResponse instanceof Response
        ? (questionsResponse.json() as Promise<HansardApiResponse<unknown>>).catch(
            (): HansardApiFallback => ({ Success: false, Response: [], Errors: [] })
          ) 
        : { Success: false, Response: [], Errors: [] },
      timesResponse instanceof Response
        ? (timesResponse.json() as Promise<HansardApiResponse<unknown>>).catch(
            (): HansardApiFallback => ({ Success: false, Response: [], Errors: [] })
          ) 
        : { Success: false, Response: [], Errors: [] }
    ]);

    // Combine and structure the response
    const combinedResponse: ApiResponse<{
      earlyDayMotions: unknown[];
      oralQuestions: unknown[];
      questionTimes: unknown[];
    }> = {
      data: {
        earlyDayMotions: edmsData?.Response || [],
        oralQuestions: questionsData?.Response || [],
        questionTimes: timesData?.Response || []
      }
    };

    // Add API errors to the error message if present
    if (edmsData?.Errors?.length || questionsData?.Errors?.length || timesData?.Errors?.length) {
      const apiErrors = [
        ...(edmsData?.Errors || []).map((e: HansardApiError) => `EDMs: ${e.message}`),
        ...(questionsData?.Errors || []).map((e: HansardApiError) => `Questions: ${e.message}`),
        ...(timesData?.Errors || []).map((e: HansardApiError) => `Times: ${e.message}`)
      ];
      if (apiErrors.length > 0) {
        combinedResponse.error = `API Errors: ${apiErrors.join(', ')}`;
      }
    }

    // Add warning if some requests failed
    if (errors.length > 0) {
      combinedResponse.error = `Some requests failed: ${errors.join(', ')}`;
    }

    return NextResponse.json(combinedResponse.data);

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      {
        data: {
          earlyDayMotions: [],
          oralQuestions: [],
          questionTimes: []
        },
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}