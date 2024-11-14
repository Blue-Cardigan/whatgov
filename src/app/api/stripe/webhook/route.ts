import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabase } from '@/lib/supabase';
import Stripe from 'stripe';

const relevantEvents = new Set([
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
]);

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const sig = headersList.get('Stripe-Signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  try {
    if (!sig || !webhookSecret) return;
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.log(`❌ Error message: ${err.message}`);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (relevantEvents.has(event.type)) {
    try {
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          const subscription = event.data.object as Stripe.Subscription;
          
          // Update user's subscription status
          await supabase
            .from('user_profiles')
            .update({
              stripe_subscription_id: subscription.id,
              stripe_customer_id: subscription.customer as string,
              is_premium: subscription.status === 'active',
              subscription_status: subscription.status,
              subscription_plan: subscription.items.data[0].price.id,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', subscription.metadata.userId);
          break;

        case 'customer.subscription.deleted':
          const deletedSubscription = event.data.object as Stripe.Subscription;
          
          // Remove user's subscription status
          await supabase
            .from('user_profiles')
            .update({
              stripe_subscription_id: null,
              is_premium: false,
              subscription_status: 'canceled',
              updated_at: new Date().toISOString()
            })
            .eq('user_id', deletedSubscription.metadata.userId);
          break;

        default:
          throw new Error('Unhandled relevant event!');
      }
    } catch (error) {
      console.log(error);
      return new NextResponse('Webhook error: "Webhook handler failed. View logs."', { status: 400 });
    }
  }

  return NextResponse.json({ received: true });
} 