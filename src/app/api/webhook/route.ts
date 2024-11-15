import { stripe } from '@/lib/stripe';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Make sure this matches your CLI webhook secret
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Create a Supabase client with the service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Important: Use service role key, not anon key
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const sig = headersList.get('stripe-signature');
  const requestId = `webhook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    console.log(`[${requestId}] Webhook received`);

    if (!sig || !endpointSecret) {
      console.error(`[${requestId}] Missing signature or endpoint secret`);
      throw new Error('Missing signature or endpoint secret');
    }

    const event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
    console.log(`[${requestId}] Event verified: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`[${requestId}] Processing checkout session: ${session.id}`);
        
        // Enhanced session logging
        console.log(`[${requestId}] Session details:`, {
          id: session.id,
          subscription_id: session.subscription,
          customer_id: session.customer,
          client_ref: session.client_reference_id,
          metadata: session.metadata,
          status: session.status,
          payment_status: session.payment_status,
          mode: session.mode,
          amount_total: session.amount_total,
        });
        
        if (!session.subscription || !session.customer || !session.client_reference_id) {
          console.error(`[${requestId}] Missing session data:`, {
            subscription: !!session.subscription,
            customer: !!session.customer,
            client_ref: !!session.client_reference_id
          });
          throw new Error('Missing required session data');
        }

        console.log(`[${requestId}] Retrieving subscription details from Stripe`);
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        console.log(`[${requestId}] Subscription details:`, {
          id: subscription.id,
          status: subscription.status,
          trial: {
            start: subscription.trial_start,
            end: subscription.trial_end,
          },
          current_period: {
            start: subscription.current_period_start,
            end: subscription.current_period_end
          },
          cancel_at_period_end: subscription.cancel_at_period_end,
          canceled_at: subscription.canceled_at,
        });
        
        const subscriptionData = {
          user_id: session.client_reference_id,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          stripe_price_id: subscription.items.data[0].price.id,
          status: subscription.status,
          plan_type: session.metadata?.plan || 'unknown',
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        console.log(`[${requestId}] Upserting subscription data:`, subscriptionData);

        const { error: upsertError } = await supabase
          .from('subscriptions')
          .upsert(subscriptionData);

        if (upsertError) {
          console.error(`[${requestId}] Subscription upsert error:`, upsertError);
          throw upsertError;
        }

        console.log(`[${requestId}] Subscription successfully created/updated`);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`[${requestId}] Processing subscription update:`, {
          id: subscription.id,
          status: subscription.status,
          cancel_at_period_end: subscription.cancel_at_period_end
        });
        
        const updateData = {
          status: subscription.status === 'trialing' ? 'active' : subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
          updated_at: new Date().toISOString(),
          cancel_date: subscription.canceled_at 
            ? new Date(subscription.canceled_at * 1000).toISOString()
            : null
        };

        console.log(`[${requestId}] Updating subscription with data:`, updateData);

        const { error: updateError } = await supabase
          .from('subscriptions')
          .update(updateData)
          .eq('stripe_subscription_id', subscription.id);

        if (updateError) {
          console.error(`[${requestId}] Subscription update error:`, updateError);
          throw updateError;
        }

        console.log(`[${requestId}] Subscription successfully updated`);
        break;
      }

      // Add handling for trial-related events
      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`[${requestId}] Trial ending soon for subscription:`, subscription.id);
        // Could implement notification logic here
        break;
      }
    }

    return new NextResponse(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error(`[${requestId}] Webhook error:`, err);
    return new NextResponse(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { 
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// This is crucial for webhook signature verification
export const config = {
  api: {
    bodyParser: false,
  },
}; 