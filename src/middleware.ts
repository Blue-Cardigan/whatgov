import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

async function checkSubscriptionStatus(
  supabase: SupabaseClient<Database>,
  userId: string
) {
  try {
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('status, current_period_end, cancel_at_period_end')
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!subscription) {
      return false;
    }

    const gracePeriodDays = 3;
    const hasGracePeriod = subscription.current_period_end && 
      new Date(subscription.current_period_end).getTime() + (gracePeriodDays * 86400000) > Date.now();

    return subscription.status === 'active' && 
      (!subscription.cancel_at_period_end || hasGracePeriod);
  } catch (error) {
    console.error('Subscription check error:', error);
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const response = NextResponse.next()

  // Create a Supabase client configured to use cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // If the cookie is updated, update the response
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          // If the cookie is removed, update the response
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  try {
    // Refresh session if expired
    const { data: { user } } = await supabase.auth.getUser()

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
        const isActive = await checkSubscriptionStatus(supabase, user.id);

        if (!isActive) {
          return NextResponse.json(
            { error: 'Subscription required' },
            { status: 403 }
          );
        }
      }
    }

    return response
  } catch (error) {
    console.error('Middleware error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export const config = {
  matcher: [
    '/api/stripe/:path*',
    '/api/premium/:path*',
    '/settings/:path*',
  ],
} 