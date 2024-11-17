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

  // Early return for non-matching routes
  if (!req.nextUrl.pathname.startsWith('/api/') && 
      !req.nextUrl.pathname.startsWith('/settings/') && 
      req.nextUrl.pathname !== '/') {
    return response;
  }

  const supabase = getSupabaseClient(req, response);

  try {
    // Refresh session if expired
    const { data: { user } } = await supabase.auth.getUser()

    // Check if it's a first-time visitor for non-auth pages
    if (!user && !req.nextUrl.pathname.startsWith('/accounts/')) {
      const hasVisited = req.cookies.get('has_visited')?.value
      if (!hasVisited && req.nextUrl.pathname === '/') {
        const response = NextResponse.redirect(new URL('/intro', req.url))
        response.cookies.set('has_visited', 'true', {
          maxAge: 60 * 60 * 24 * 365, // 1 year
          path: '/',
        })
        return response
      }
    }

    // Handle API routes that require authentication
    if (req.nextUrl.pathname.startsWith('/api/')) {
      if (!user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }

      // Add user session to request headers for API routes
      response.headers.set('x-user-id', user.id)
      response.headers.set('x-user-email', user.email ?? '')
      response.headers.set('x-user-role', user.role ?? 'user')

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
      if (!user) {
        return NextResponse.redirect(new URL('/accounts/login', req.url))
      }
    }

    return response
  } catch (error) {
    if (error instanceof MiddlewareError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    console.error('Middleware error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
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