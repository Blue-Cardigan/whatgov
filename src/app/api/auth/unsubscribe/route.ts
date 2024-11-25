import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');
    
    if (!token) {
      return NextResponse.redirect(new URL('/unsubscribe-error', request.url));
    }

    const supabase = await createServerSupabaseClient();
    
    // Update newsletter preference with matching parameter name
    const { data, error } = await supabase.rpc('update_newsletter_preference', {
      token_param: token
    });

    if (error || !data?.success) {
      console.error('Unsubscribe error:', error);
      return NextResponse.redirect(new URL('/unsubscribe-error', request.url));
    }

    return NextResponse.redirect(new URL('/unsubscribed', request.url));
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return NextResponse.redirect(new URL('/unsubscribe-error', request.url));
  }
} 