export type Subscription = {
  plan_type: string;
  status: string;
  stripe_customer_id: string | null;
  current_period_end?: string | null;
};

// Cache subscription status
const subscriptionCache = new Map<string, {data: Subscription | null, timestamp: number}>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function getSubscriptionFromCache(userId: string) {
  const cached = subscriptionCache.get(userId);
  if (cached?.timestamp && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    return cached.data;
  }
  return null;
}

export function setSubscriptionCache(userId: string, data: Subscription | null) {
  subscriptionCache.set(userId, { data, timestamp: Date.now() });
}

export function isSubscriptionActive(subscription: Subscription | null): boolean {
  if (!subscription) return false;
  
  return subscription.status === 'active' && 
    (!subscription.current_period_end || 
     new Date(subscription.current_period_end).getTime() + 259200000 > Date.now());
} 