import { useState, useEffect } from 'react';

export interface Topic {
  id: string;
  name: string;
  slug: string;
}

const MOCK_TOPICS: Topic[] = [
  {
    id: 'env-resources',
    name: 'Environment and Natural Resources',
    slug: 'environment-natural-resources'
  },
  {
    id: 'healthcare-welfare',
    name: 'Healthcare and Social Welfare',
    slug: 'healthcare-social-welfare'
  },
  {
    id: 'economy-infra',
    name: 'Economy, Business, and Infrastructure',
    slug: 'economy-business-infrastructure'
  },
  {
    id: 'science-tech',
    name: 'Science, Technology, and Innovation',
    slug: 'science-technology-innovation'
  },
  {
    id: 'legal-safety',
    name: 'Legal Affairs and Public Safety',
    slug: 'legal-affairs-public-safety'
  },
  {
    id: 'international',
    name: 'International Relations and Diplomacy',
    slug: 'international-relations-diplomacy'
  },
  {
    id: 'parliament',
    name: 'Parliamentary Affairs and Governance',
    slug: 'parliamentary-affairs-governance'
  },
  {
    id: 'education',
    name: 'Education, Culture, and Society',
    slug: 'education-culture-society'
  }
];

export function useTopics() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        // Simulate API call with timeout
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // For now, we'll use mock data
        // In production, this would be an API call
        setTopics(MOCK_TOPICS);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch topics'));
        setIsLoading(false);
      }
    };

    fetchTopics();
  }, []);

  const addTopic = async (topicId: string) => {
    // Implement topic following logic here
    // This would typically make an API call to follow a topic
    setTopics(current => [...current, MOCK_TOPICS.find(t => t.id === topicId)!]);
  };

  const removeTopic = async (topicId: string) => {
    // Implement topic unfollowing logic here
    // This would typically make an API call to unfollow a topic
    setTopics(current => current.filter(topic => topic.id !== topicId));
  };

  return {
    topics,
    isLoading,
    error,
    addTopic,
    removeTopic
  };
} 