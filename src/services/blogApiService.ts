import axios from 'axios';

// Normalize URL to always use HTTPS
const getNormalizedBaseUrl = (url: string): string => {
  if (!url) return 'https://blogv2.omerald.com';
  // Replace http:// with https:// to ensure secure connections
  return url.replace(/^http:\/\//, 'https://');
};

const BLOG_API_BASE_URL = getNormalizedBaseUrl(
  process.env.BLOG_API_BASE_URL || process.env.NEXT_PUBLIC_BLOG_API_URL || 'https://blogv2.omerald.com'
);
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes (increased for better performance)

// Create axios instance with optimized timeout and error handling
const blogApiClient = axios.create({
  timeout: 15000, // 15 second timeout (increased for slower networks)
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  // Enable HTTP keep-alive for connection reuse
  httpAgent: typeof window === 'undefined' ? undefined : undefined, // Keep-alive only on server
  httpsAgent: typeof window === 'undefined' ? undefined : undefined,
});

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class BlogApiCache {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();

  get<T>(key: string): T | null {
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && Date.now() - memoryEntry.timestamp < CACHE_DURATION) {
      return memoryEntry.data as T;
    }

    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const entry: CacheEntry<T> = JSON.parse(stored);
          if (Date.now() - entry.timestamp < CACHE_DURATION) {
            this.memoryCache.set(key, entry);
            return entry.data;
          } else {
            localStorage.removeItem(key);
          }
        }
      } catch (error) {
        console.error('Error reading from cache:', error);
      }
    }
    return null;
  }

  set<T>(key: string, data: T): void {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    this.memoryCache.set(key, entry);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(key, JSON.stringify(entry));
      } catch (error) {
        console.error('Error writing to cache:', error);
      }
    }
  }
}

const cache = new BlogApiCache();

export interface HealthTopic {
  id: number;
  title: string;
  slug: string;
  body?: string;
  article_count: number;
}

export interface BlogArticle {
  id: number;
  title: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  health_topics: string | null;
  status: number;
  image: string | null;
  created_at: string;
  writer_name?: string | null;
}

export async function fetchHealthTopics(): Promise<HealthTopic[]> {
  const cacheKey = 'blog_health_topics';
  const cached = cache.get<HealthTopic[]>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const response = await blogApiClient.get(`${BLOG_API_BASE_URL}/api/health-topics`, {
      params: { offset: 0, limit: 1000 },
    });
    
    // Handle different response structures
    let healthTopics: HealthTopic[] = [];
    
    if (response.data) {
      // Check for success wrapper
      if (response.data.success && Array.isArray(response.data.data)) {
        healthTopics = response.data.data;
      } 
      // Check if data is directly an array
      else if (Array.isArray(response.data)) {
        healthTopics = response.data;
      }
      // Check if data.data is an array
      else if (Array.isArray(response.data.data)) {
        healthTopics = response.data.data;
      }
    }
    
    if (healthTopics.length > 0) {
      cache.set(cacheKey, healthTopics);
      return healthTopics;
    }
    
    console.warn('No health topics found in API response:', response.data);
    return [];
  } catch (error: any) {
    console.error('Error fetching health topics:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      url: `${BLOG_API_BASE_URL}/api/health-topics`,
    });
    
    // Return cached data if available, otherwise empty array
    return cached || [];
  }
}

export async function fetchArticlesByHealthTopics(
  healthTopicIds: number[],
  options?: { status?: number; limit?: number; offset?: number; sortBy?: string; sortOrder?: string }
): Promise<{ articles: BlogArticle[]; total: number }> {
  if (healthTopicIds.length === 0) return { articles: [], total: 0 };

  const { status = 1, limit = 30, offset = 0, sortBy = 'created_at', sortOrder = 'desc' } = options || {};
  // Sort topic IDs for consistent cache keys
  const sortedTopicIds = [...healthTopicIds].sort((a, b) => a - b);
  const cacheKey = `blog_articles_${sortedTopicIds.join(',')}_${status}_${limit}_${offset}_${sortBy}_${sortOrder}`;
  const cached = cache.get<{ articles: BlogArticle[]; total: number }>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    // Use sorted topic IDs for API call as well
    const response = await blogApiClient.get(`${BLOG_API_BASE_URL}/api/articles`, {
      params: {
        healthTopic: sortedTopicIds.join(','),
        status,
        limit,
        offset,
        sortBy,
        sortOrder,
      },
      // Add request timeout and optimize headers
      timeout: 15000, // 15 seconds
    });
    
    // Handle different response structures
    let articles: BlogArticle[] = [];
    let total = 0;
    
    if (response.data) {
      // Check for success wrapper
      if (response.data.success) {
        articles = Array.isArray(response.data.data) ? response.data.data : [];
        total = response.data.pagination?.total || response.data.total || articles.length;
      } 
      // Check if data is directly an array
      else if (Array.isArray(response.data)) {
        articles = response.data;
        total = articles.length;
      }
      // Check if data.data is an array
      else if (Array.isArray(response.data.data)) {
        articles = response.data.data;
        total = response.data.pagination?.total || response.data.total || articles.length;
      }
    }
    
    const result = { articles, total };
    
    if (articles.length > 0 || total > 0) {
      cache.set(cacheKey, result);
    }
    
    return result;
  } catch (error: any) {
    console.error('Error fetching articles:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      url: `${BLOG_API_BASE_URL}/api/articles`,
      params: {
        healthTopic: healthTopicIds.join(','),
        status,
        limit,
        offset,
      },
    });
    
    // Return cached data if available, otherwise empty result
    return cached || { articles: [], total: 0 };
  }
}

// Optimized matching with early exit and caching
const STOP_WORDS = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can']);

// Cache for keyword extraction to avoid recomputing
const keywordCache = new Map<string, string[]>();

const extractKeywords = (text: string): string[] => {
  const cacheKey = text.toLowerCase();
  if (keywordCache.has(cacheKey)) {
    return keywordCache.get(cacheKey)!;
  }
  
  const keywords = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length >= 3 && !STOP_WORDS.has(word));
  
  keywordCache.set(cacheKey, keywords);
  return keywords;
};

export function mapConditionsToHealthTopics(
  conditions: string[],
  allHealthTopics: HealthTopic[]
): HealthTopic[] {
  if (conditions.length === 0 || allHealthTopics.length === 0) return [];

  // Normalize conditions once
  const normalizedConditions = conditions.map(c => c.toLowerCase().trim()).filter(Boolean);
  if (normalizedConditions.length === 0) return [];

  const matchedTopics: HealthTopic[] = [];
  const matchedTopicIds = new Set<number>(); // Use Set for O(1) lookups

  // Pre-extract keywords for all conditions to avoid repeated processing
  const conditionKeywordsMap = new Map<string, string[]>();
  normalizedConditions.forEach(condition => {
    conditionKeywordsMap.set(condition, extractKeywords(condition));
  });

  // Process only topics with articles (early filter)
  const topicsWithArticles = allHealthTopics.filter(t => t.article_count > 0);

  // Optimized matching with early exits
  for (const topic of topicsWithArticles) {
    if (matchedTopicIds.has(topic.id)) continue; // Skip if already matched
    
    const topicTitle = (topic.title || '').toLowerCase();
    const topicBody = (topic.body || '').toLowerCase();
    const topicText = `${topicTitle} ${topicBody}`;
    const topicKeywordsSet = new Set(extractKeywords(topicText)); // Use Set for faster lookups
    
    // Check each condition
    for (const condition of normalizedConditions) {
      const conditionLower = condition.toLowerCase().trim();
      
      // Quick exact/simple matches first (fastest)
      if (topicTitle === conditionLower || 
          topicTitle.includes(conditionLower) ||
          topicText.includes(conditionLower)) {
        matchedTopics.push(topic);
        matchedTopicIds.add(topic.id);
        break; // Found match, no need to check other conditions
      }
      
      // Keyword-based matching (more expensive, do after simple checks)
      const conditionKeywords = conditionKeywordsMap.get(condition) || [];
      if (conditionKeywords.length === 0) continue;
      
      // Check for significant keyword matches
      const significantKeywords = conditionKeywords.filter(kw => kw.length >= 4);
      if (significantKeywords.length > 0) {
        const allMatch = significantKeywords.every(kw => 
          Array.from(topicKeywordsSet).some(tk => tk.includes(kw) || kw.includes(tk))
        );
        if (allMatch) {
          matchedTopics.push(topic);
          matchedTopicIds.add(topic.id);
          break;
        }
      }
      
      // Check for partial matches
      const conditionWords = conditionKeywords.filter(w => w.length >= 3);
      if (conditionWords.length >= 2) {
        const matchCount = conditionWords.filter(cw => 
          Array.from(topicKeywordsSet).some(tk => tk.includes(cw) || cw.includes(tk))
        ).length;
        
        if (matchCount >= Math.ceil(conditionWords.length * 0.6)) {
          matchedTopics.push(topic);
          matchedTopicIds.add(topic.id);
          break;
        }
      } else if (conditionWords.length === 1) {
        const word = conditionWords[0];
        if (Array.from(topicKeywordsSet).some(tk => tk.includes(word) || word.includes(tk))) {
          matchedTopics.push(topic);
          matchedTopicIds.add(topic.id);
          break;
        }
      }
    }
  }
  
  return matchedTopics;
}

