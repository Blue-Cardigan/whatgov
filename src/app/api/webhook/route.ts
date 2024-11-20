import { stripe } from '@/lib/stripe';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Type definitions for subscription data
interface SubscriptionData {
  user_id?: string;
  stripe_customer_id?: string;
  stripe_subscription_id: string;
  stripe_price_id?: string;
  status: ValidStatus;
  plan?: string | null;
  current_period_start?: string;
  current_period_end?: string;
  cancel_date?: string | null;
  cancel_at_period_end: boolean;
  created_at?: string;
  updated_at: string;
}

// Valid subscription statuses according to schema
const VALID_STATUSES = ['active', 'inactive', 'cancelled', 'trialing'] as const;
type ValidStatus = typeof VALID_STATUSES[number];

// Validation functions
function validateSubscriptionData(data: Partial<SubscriptionData>, isNewSubscription: boolean = false): void {
  // Validate status
  if (!VALID_STATUSES.includes(data.status as ValidStatus)) {
    throw new Error(`Invalid status: ${data.status}`);
  }

  // Required fields for new subscriptions
  if (isNewSubscription) {
    const requiredFields = ['user_id', 'stripe_customer_id', 'stripe_subscription_id', 'stripe_price_id'];
    for (const field of requiredFields) {
      if (!data[field as keyof SubscriptionData]) {
        throw new Error(`Missing required field for new subscription: ${field}`);
      }
    }
  }

  // Validate timestamps
  const dateFields = ['current_period_start', 'current_period_end', 'cancel_date', 'created_at', 'updated_at'];
  for (const field of dateFields) {
    const value = data[field as keyof SubscriptionData];
    if (value && typeof value === 'string' && !isValidISODate(value)) {
      throw new Error(`Invalid date format for ${field}: ${value}`);
    }
  }

  // Validate boolean fields
  if (typeof data.cancel_at_period_end !== 'boolean') {
    throw new Error('cancel_at_period_end must be a boolean');
  }
}

// Helper functions
function isValidISODate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(dateStr)) {
    return false;
  }
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date.getTime());
}

// Retry logic with exponential backoff
async function withRetry<T>(
  operation: () => Promise<T>,
  requestId: string,
  options = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000
  }
): Promise<T> {
  for (let attempt = 1; attempt <= options.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const isLastAttempt = attempt === options.maxRetries;
      const delay = Math.min(
        options.baseDelay * Math.pow(2, attempt - 1),
        options.maxDelay
      );

      console.error(
        `[${requestId}] Operation failed (attempt ${attempt}/${options.maxRetries}):`,
        error
      );

      if (isLastAttempt) {
        throw error;
      }

      console.log(`[${requestId}] Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Retry logic should not reach this point');
}

// Helper to validate and normalize status
function normalizeStatus(stripeStatus: string): ValidStatus {
  switch (stripeStatus) {
    case 'trialing':
      return 'trialing'; // Now properly preserving trialing status
    case 'active':
      return 'active';
    case 'past_due':
    case 'unpaid':
    case 'incomplete':
    case 'incomplete_expired':
      return 'inactive';
    case 'canceled':
    case 'cancelled':
      return 'cancelled'; // Normalized to schema spelling
    default:
      console.warn(`Unhandled Stripe status: ${stripeStatus}, defaulting to inactive`);
      return 'inactive';
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function updateSubscriptionInDB(
  requestId: string,
  subscriptionData: Partial<SubscriptionData>,
  isNewSubscription: boolean = false
) {
  try {
    // Validate the subscription data
    validateSubscriptionData(subscriptionData, isNewSubscription);

    // Perform database operation with retry logic
    await withRetry(
      async () => {
        const { error } = isNewSubscription
          ? await supabase.from('subscriptions').upsert(subscriptionData)
          : await supabase
              .from('subscriptions')
              .update(subscriptionData)
              .eq('stripe_subscription_id', subscriptionData.stripe_subscription_id);

        if (error) {
          throw error;
        }
      },
      requestId,
      { maxRetries: 3, baseDelay: 1000, maxDelay: 10000 }
    );

    console.log(`[${requestId}] Subscription ${isNewSubscription ? 'created' : 'updated'} successfully:`, {
      stripe_subscription_id: subscriptionData.stripe_subscription_id,
      status: subscriptionData.status,
      operation: isNewSubscription ? 'create' : 'update'
    });
  } catch (error) {
    console.error(`[${requestId}] Failed to ${isNewSubscription ? 'create' : 'update'} subscription:`, {
      error,
      data: subscriptionData
    });
    throw error;
  }
}

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
        
        if (!session.subscription || !session.customer || !session.client_reference_id) {
          throw new Error('Missing required session data');
        }

        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        
        const subscriptionData = {
          user_id: session.client_reference_id,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          stripe_price_id: subscription.items.data[0].price.id,
          status: normalizeStatus(subscription.status),
          plan: session.metadata?.plan || null, // Using plan instead of plan_type
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
          cancel_date: subscription.canceled_at 
            ? new Date(subscription.canceled_at * 1000).toISOString()
            : null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        await updateSubscriptionInDB(requestId, subscriptionData, true);
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        const updateData = {
          stripe_subscription_id: subscription.id,
          status: normalizeStatus(subscription.status),
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
          cancel_date: subscription.canceled_at 
            ? new Date(subscription.canceled_at * 1000).toISOString()
            : null,
          updated_at: new Date().toISOString()
        };

        await updateSubscriptionInDB(requestId, updateData, false);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
          
          const updateData = {
            stripe_subscription_id: subscription.id,
            status: normalizeStatus(subscription.status),
            updated_at: new Date().toISOString()
          };

          await updateSubscriptionInDB(requestId, updateData, false);
        }
        break;
      }

      case 'customer.subscription.trial_will_end': {
        // Optional: Implement notification logic here
        break;
      }
    }

    return new NextResponse(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error(`[${requestId}] Webhook error:`, err);
    return new NextResponse(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};