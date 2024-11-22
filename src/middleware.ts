import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { getSubscriptionFromCache, isSubscriptionActive } from '@/lib/subscription';

// Create a memoized client factory
const getSupabaseClient = (() => {
  let client: SupabaseClient<Database> | null = null;
  return (req: NextRequest, res: NextResponse) => {
    if (client) return client;
    client = createServerClient(
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
    return client;
  };
})();

// Create custom error types
class MiddlewareError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function middleware(req: NextRequest) {
  const response = NextResponse.next();

  // Add this helper function
  const validateToken = async (token: string) => {
    const supabase = getSupabaseClient(req, response);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) throw new Error('Invalid token');
    return user;
  };

  try {
    // Early return for non-matching routes
    if (!req.nextUrl.pathname.startsWith('/api/') && 
        !req.nextUrl.pathname.startsWith('/settings/') && 
        req.nextUrl.pathname !== '/') {
      return response;
    }

    // For API routes, check Authorization header
    if (req.nextUrl.pathname.startsWith('/api/')) {
      const authHeader = req.headers.get('authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        throw new MiddlewareError(401, 'Missing or invalid authorization header');
      }

      const token = authHeader.split(' ')[1];
      const user = await validateToken(token);

      // Add user data to request headers
      response.headers.set('x-user-id', user.id);
      response.headers.set('x-user-email', user.email ?? '');
      response.headers.set('x-user-role', user.role ?? 'user');

      // Check premium routes
      if (req.nextUrl.pathname.startsWith('/api/premium/')) {
        const cached = getSubscriptionFromCache(user.id);
        if (cached && !isSubscriptionActive(cached)) {
          return NextResponse.json(
            { error: 'Subscription required' },
            { status: 403 }
          );
        }
      }
    }

    // Handle protected page routes
    if (req.nextUrl.pathname.startsWith('/settings/')) {
      const supabase = getSupabaseClient(req, response);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return NextResponse.redirect(new URL('/accounts/login', req.url));
      }
    }

    return response;
  } catch (error) {
    if (error instanceof MiddlewareError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    console.error('Middleware error:', error);
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
}

export const config = {
  matcher: [
    '/api/stripe/:path*',
    '/api/premium/:path*',
    '/settings/:path*',
    '/',  // Add home page to check first visit
  ],
} 