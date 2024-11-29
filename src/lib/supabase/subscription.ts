export type Subscription = {
  plan: string;
  status: string;
  stripe_customer_id: string | null;
  current_period_end?: string | null;
};

// Add type for cached data
type CachedSubscription = {
  data: Subscription | null;
  timestamp: number;
};

// Use Map instead of WeakMap to track size
const subscriptionCache = new Map<string, CachedSubscription>();

const MAX_CACHE_SIZE = 1000;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Helper function to clean expired entries
function cleanExpiredCache() {
  const now = Date.now();
  for (const [userId, cached] of subscriptionCache.entries()) {
    if (now - cached.timestamp >= CACHE_DURATION) {
      subscriptionCache.delete(userId);
    }
  }
}

export async function getSubscriptionFromCache(userId: string) {
  const cached = subscriptionCache.get(userId);
  
  if (cached?.timestamp && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    return cached.data;
  }
  
  // Clean up expired entry
  if (cached) {
    subscriptionCache.delete(userId);
  }
  
  try {
    // If no cache hit, return null but don't throw
    return null;
  } catch (error) {
    console.error('Error fetching subscription:', error);
    // Return null on error to prevent breaking the application
    return null;
  }
}

export function setSubscriptionCache(userId: string, data: Subscription | null) {
  try {
    // Clean up if cache is too large
    if (subscriptionCache.size >= MAX_CACHE_SIZE) {
      cleanExpiredCache();
      
      // If still too large after cleaning expired entries,
      // remove oldest entries until we're under the limit
      if (subscriptionCache.size >= MAX_CACHE_SIZE) {
        const entries = Array.from(subscriptionCache.entries())
          .sort((a, b) => a[1].timestamp - b[1].timestamp);
        
        const entriesToRemove = entries.slice(0, entries.length - MAX_CACHE_SIZE + 1);
        for (const [key] of entriesToRemove) {
          subscriptionCache.delete(key);
        }
      }
    }
    
    subscriptionCache.set(userId, { 
      data, 
      timestamp: Date.now() 
    });
  } catch (error) {
    console.error('Error setting subscription cache:', error);
    // Clear the problematic cache entry if there's an error
    subscriptionCache.delete(userId);
  }
}

export function isSubscriptionActive(subscription: Subscription | null): boolean {
  try {
    if (!subscription) return false;
    
    return (subscription.status === 'active' || subscription.status === 'trialing') && 
      (!subscription.current_period_end || 
       new Date(subscription.current_period_end).getTime() + 259200000 > Date.now());
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return false;
  }
} 