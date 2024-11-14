import { stripe } from '@/lib/stripe';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { PLANS } from '@/lib/stripe-client';
import Stripe from 'stripe';
import { createServerSupabaseClient } from '@/lib/supabase-server';

type CheckoutResponse = {
  url: string | null;
  sessionId: string;
  error?: string;
};

async function checkExistingSubscription(supabase: any, userId: string) {
  try {
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('status, stripe_customer_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return {
      hasActiveSubscription: subscription?.status === 'active',
      stripeCustomerId: subscription?.stripe_customer_id
    };
  } catch (error) {
    console.error('Subscription check error:', error);
    throw error;
  }
}

export async function POST(req: Request) {
  try {    
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { priceId } = body;
    
    if (!priceId) {
      return new NextResponse('Price ID is required', { status: 400 });
    }

    if (!Object.values(PLANS).some(plan => plan.id === priceId)) {
      return new NextResponse('Invalid price ID', { status: 400 });
    }

    // Check existing subscription
    const { hasActiveSubscription } = await checkExistingSubscription(supabase, user.id);

    if (hasActiveSubscription) {
      console.log('Preventing duplicate subscription:', { userId: user.id });
      return new NextResponse('Subscription already active', { status: 400 });
    }

    const headersList = await headers();
    const origin = headersList.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL;

    // Add request rate limiting
    // Add input validation middleware
    
    // Add proper error types and handling
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('Stripe secret key not configured');
    }

    // Add idempotency key for safe retries
    const idempotencyKey = headersList.get('Idempotency-Key');
    if (!idempotencyKey) {
      return new NextResponse('Idempotency key required', { status: 400 });
    }

    if (!origin) {
      throw new Error('origin is required for success and cancel URLs');
    }
    
    if (!user.email) {
      throw new Error('User email is required for checkout');
    }
    
    if (!priceId) {
      throw new Error('Price ID is required');
    }
    
    // Validate the price ID exists in your plans
    const selectedPlan = Object.entries(PLANS).find(([, plan]) => plan.id === priceId);
    if (!selectedPlan) {
      throw new Error('Invalid price ID');
    }

    const params: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/pricing?success=true`,
      cancel_url: `${origin}/pricing?canceled=true`,
      customer_email: user.email ?? undefined,
      metadata: {
        userId: user.id,
        plan: Object.entries(PLANS).find(([, plan]) => plan.id === priceId)?.[0] ?? ''
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      client_reference_id: user.id,
      payment_method_collection: 'always',
      subscription_data: {
        trial_period_days: 7,
        metadata: {
          userId: user.id,
        },
      },
      automatic_tax: {
        enabled: true,
      },
      tax_id_collection: {
        enabled: true,
      },
      custom_text: {
        submit: {
          message: 'Start your subscription',
        },
      },
      consent_collection: {
        terms_of_service: 'required',
      },
    };

    const checkoutSession = await stripe.checkout.sessions.create(params);

    return NextResponse.json<CheckoutResponse>({ 
      url: checkoutSession.url,
      sessionId: checkoutSession.id
    });
  } catch (error) {
    console.error('Checkout error:', error);
    return new NextResponse(
      error instanceof Error ? error.message : 'Internal Error', 
      { status: 500 }
    );
  }
} 