import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      // Redirect to error page
      return NextResponse.redirect(new URL('/auth/error', request.url))
    }

    // Update user profile to mark email as verified
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from('user_profiles')
        .update({ 
          email_verified: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
    }

    // Redirect to success page or dashboard
    return NextResponse.redirect(new URL('/auth/signin?verified=true', request.url))
  }

  // Return error if code is missing
  return NextResponse.redirect(new URL('/auth/error', request.url))
} 