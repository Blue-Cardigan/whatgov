import { createServerSupabaseClient } from './supabase-server';

export async function auth() {
  const supabase = await createServerSupabaseClient();
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error || !session) {
    return null;
  }

  // Get the user's subscription data from your database
  const { data: subscriptionData } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id, status, plan_type')
    .eq('user_id', session.user.id)
    .single();

  return {
    user: {
      ...session.user,
      stripeCustomerId: subscriptionData?.stripe_customer_id
    }
  };
} 