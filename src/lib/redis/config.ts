export const CACHE_KEYS = {
    debates: {
      key: (date: string) => `debates:${date}`,
      ttl: 60 * 60 // 1 hour
    },
    speakers: {
      key: (id: string) => `speakers:${id}`,
      ttl: 60 * 60 * 24 * 7 // 1 week
    },
    topicVoteStats: {
      key: () => 'topic_vote_stats',
      ttl: 60 * 5 // 5 minutes
    },
    userTopicVotes: {
      key: (userId: string) => `user_topic_votes:${userId}`,
      ttl: 60 * 5 // 5 minutes
    },
    demographicStats: {
      key: () => 'demographic_stats',
      ttl: 60 * 15 // 15 minutes
    },
    upcomingDebates: {
      key: (week: 'current' | 'next') => `upcoming_debates:${week}`,
      ttl: 60 * 60 * 3 // 3 hours
    }
  } as const;
  
  export type CacheKey = keyof typeof CACHE_KEYS; 