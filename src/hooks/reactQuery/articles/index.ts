import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { fetchArticlesByHealthTopics, BlogArticle } from '@/services/blogApiService';

// Cache duration for articles (optimized for performance)
const ARTICLES_STALE_TIME = 10 * 60 * 1000; // 10 minutes (articles don't change frequently)
const ARTICLES_CACHE_TIME = 60 * 60 * 1000; // 1 hour (keep in cache longer)

interface FetchArticlesOptions {
  status?: number;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Hook to fetch articles by health topic IDs
 * Uses React Query for caching and performance optimization
 */
export const useGetArticlesByHealthTopics = (
  healthTopicIds: number[],
  options?: FetchArticlesOptions
) => {
  const { status = 1, limit = 30, offset = 0, sortBy = 'created_at', sortOrder = 'desc' } = options || {};

  // Sort health topic IDs for consistent cache keys
  const sortedTopicIds = useMemo(() => healthTopicIds.slice().sort((a, b) => a - b), [healthTopicIds]);

  return useQuery({
    queryKey: ['articles', sortedTopicIds.join(','), status, limit, offset, sortBy, sortOrder],
    queryFn: async () => {
      if (sortedTopicIds.length === 0) {
        return { articles: [], total: 0 };
      }
      return await fetchArticlesByHealthTopics(sortedTopicIds, {
        status,
        limit,
        offset,
        sortBy,
        sortOrder,
      });
    },
    enabled: sortedTopicIds.length > 0,
    staleTime: ARTICLES_STALE_TIME,
    gcTime: ARTICLES_CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    // Keep previous data while fetching new data for smoother UX
    placeholderData: (previousData) => previousData,
    // Retry configuration
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

