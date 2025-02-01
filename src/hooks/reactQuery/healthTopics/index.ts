import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { fetchHealthTopics, mapConditionsToHealthTopics, HealthTopic } from '@/services/blogApiService';
import axios from 'axios';

// Cache duration for health topics (static data that doesn't change frequently)
const HEALTH_TOPICS_STALE_TIME = 30 * 60 * 1000; // 30 minutes (increased for better performance)
const HEALTH_TOPICS_CACHE_TIME = 2 * 60 * 60 * 1000; // 2 hours (keep in cache longer)

/**
 * Hook to fetch health topics from blog API
 * Uses React Query for caching and performance optimization
 */
export const useGetHealthTopics = () => {
  return useQuery({
    queryKey: ['healthTopics', 'blog'],
    queryFn: async () => {
      return await fetchHealthTopics();
    },
    staleTime: HEALTH_TOPICS_STALE_TIME,
    gcTime: HEALTH_TOPICS_CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

/**
 * Hook to fetch health topics from legacy API endpoint
 * Uses React Query for caching and performance optimization
 */
export const useGetLegacyHealthTopics = () => {
  return useQuery({
    queryKey: ['healthTopics', 'legacy'],
    queryFn: async () => {
      const response = await axios.get('/api/healthTopics/getHealthTopics');
      const topics = response?.data?.data || response?.data?.result || [];
      return Array.isArray(topics) ? topics : [];
    },
    staleTime: HEALTH_TOPICS_STALE_TIME,
    gcTime: HEALTH_TOPICS_CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

/**
 * Hook to get health topics mapped to diagnosed conditions
 * Uses React Query for caching and performance optimization
 */
export const useGetMappedHealthTopics = (diagnosedConditions: string[] = []) => {
  const { data: allHealthTopics = [], isLoading } = useGetHealthTopics();

  // Normalize and sort conditions for consistent cache keys
  const normalizedConditions = useMemo(() => {
    return diagnosedConditions
      .map((c: any) => {
        if (typeof c === 'string') {
          return c.trim().toLowerCase();
        }
        if (c && typeof c === 'object' && 'condition' in c) {
          return String(c.condition || '').trim().toLowerCase();
        }
        return String(c || '').trim().toLowerCase();
      })
      .filter(Boolean)
      .sort();
  }, [diagnosedConditions]);

  return useQuery({
    queryKey: ['mappedHealthTopics', normalizedConditions.join(',')],
    queryFn: async () => {
      if (normalizedConditions.length === 0 || allHealthTopics.length === 0) {
        return [];
      }
      // Use normalized conditions for mapping
      return mapConditionsToHealthTopics(normalizedConditions, allHealthTopics);
    },
    enabled: !isLoading && normalizedConditions.length > 0 && allHealthTopics.length > 0,
    staleTime: HEALTH_TOPICS_STALE_TIME,
    gcTime: HEALTH_TOPICS_CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    // Keep previous data while fetching for smoother UX
    placeholderData: (previousData) => previousData,
    // Retry configuration
    retry: 1,
  });
};

