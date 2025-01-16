import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Database } from '@/types/supabase'
import { getSubscriptionFromCache, isSubscriptionActive } from '@/lib/supabase/subscription';

// Create custom error types
class MiddlewareError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

class AuthError extends MiddlewareError {
  constructor(message: string) {
    super(401, message);
  }
}

class SubscriptionError extends MiddlewareError {
  constructor(message: string) {
    super(403, message);
  }
}

// Create Supabase client for each request
const getSupabaseClient = (req: NextRequest, res: NextResponse) => {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => req.cookies.get(name)?.value,
        set: (name: string, value: string, options: CookieOptions) => {
          res.cookies.set({ name, value, ...options })
        },
        remove: (name: string, options: CookieOptions) => {
          res.cookies.set({ name, value: '', ...options })
        },
      },
    }
  );
};

// Validate token and return user
const validateToken = async (req: NextRequest, res: NextResponse, token: string) => {
  const supabase = getSupabaseClient(req, res);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) throw new AuthError('Invalid token');
  return user;
};

// Handle API route authentication
const handleApiAuth = async (req: NextRequest, res: NextResponse) => {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthError('Missing or invalid authorization header');
  }

  const token = authHeader.split(' ')[1];
  const user = await validateToken(req, res, token);
  
  // Create new response with user headers
  const response = NextResponse.next();
  const headers = new Headers(response.headers);
  headers.set('x-user-id', user.id);
  headers.set('x-user-email', user.email ?? '');
  headers.set('x-user-role', user.role ?? 'user');
  
  return { user, response: NextResponse.next({ headers }) };
};

// Handle page authentication
const handlePageAuth = async (req: NextRequest, res: NextResponse) => {
  const supabase = getSupabaseClient(req, res);
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};

// Add API key validation
const isValidApiKey = (apiKey: string | null) => {
  return apiKey === process.env.SCHEDULER_API_KEY;
};

export async function middleware(req: NextRequest) {
  try {
    const pathname = req.nextUrl.pathname;

    // Check for first-time visitor
    const isFirstVisit = !req.cookies.get('visited');
    if (isFirstVisit) {
      const response = NextResponse.redirect(new URL('/intro', req.url));
      response.cookies.set('visited', 'true', { path: '/', maxAge: 60 * 60 * 24 * 365 });
      return response;
    }

    // Special handling for scheduler endpoints
    if (pathname.startsWith('/api/scheduler/')) {
      const apiKey = req.headers.get('x-api-key');
      if (isValidApiKey(apiKey)) {
        return NextResponse.next();
      }
      throw new AuthError('Invalid API key');
    }

    // Regular API routes
    if (pathname.startsWith('/api/')) {
      const { user, response } = await handleApiAuth(req, NextResponse.next());

      // Check premium routes
      if (pathname.startsWith('/api/premium/')) {
        const cached = await getSubscriptionFromCache(user.id);
        if (cached && !isSubscriptionActive(cached)) {
          throw new SubscriptionError('Subscription required');
        }
      }

      return response;
    }

    // Protected page routes
    if (pathname.startsWith('/settings/')) {
      const session = await handlePageAuth(req, NextResponse.next());
      if (!session) {
        return NextResponse.redirect(new URL('/login', req.url));
      }
      return NextResponse.next();
    }

    // All other routes
    return NextResponse.next();

  } catch (error) {
    console.error('Middleware error:', error);
    
    if (error instanceof MiddlewareError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
}

export const config = {
  matcher: [
    '/api/(stripe|premium|assistant|scheduler)/:path*',
    '/settings/:path*',
  ],
} 