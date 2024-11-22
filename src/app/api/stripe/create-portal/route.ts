import { createServerSupabaseClient } from '@/lib/supabase-server';
import { stripe } from '@/lib/stripe';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Use getUser() for secure authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get the customer's Stripe ID from your database
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (subError || !subscription?.stripe_customer_id) {
      return new NextResponse('No Stripe customer ID found', { status: 400 });
    }

    // Ensure the return URL has an explicit scheme
    const returnUrl = new URL(
      '/settings',
      process.env.NEXT_PUBLIC_SITE_URL?.startsWith('http') 
        ? process.env.NEXT_PUBLIC_SITE_URL 
        : `https://${process.env.NEXT_PUBLIC_SITE_URL}`
    ).toString();

    // Create the portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: returnUrl,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    return new NextResponse(
      error instanceof Error ? error.message : 'Internal Server Error', 
      { status: 500 }
    );
  }
} 