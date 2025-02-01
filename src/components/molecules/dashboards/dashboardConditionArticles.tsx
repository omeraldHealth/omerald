import React, { useState, useEffect, useMemo } from 'react';
import { useSetRecoilState } from 'recoil';
import { dashTabs } from '@/components/common/recoil/dashboard';
import { useAuthContext } from '@/components/common/utils/context/auth.context';
import axios from 'axios';
import Image from 'next/image';
import { normalizeImageUrl } from '@/lib/utils';
import { BookOpen, ArrowRight, Calendar } from 'lucide-react';

interface Article {
  id: number;
  title: string;
  short_description: string | null;
  health_topics: string | null;
  image: string | null;
  created_at: string | null;
  slug: string;
}

export const DashboardConditionArticles = () => {
  const { profile } = useAuthContext();
  const setDash = useSetRecoilState(dashTabs);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleArticleClick = (article: Article) => {
    setDash('Articles');
    // Small delay to ensure navigation happens, then set article in URL
    setTimeout(() => {
      window.history.pushState({}, '', `?articleId=${article.id}`);
      // Trigger a custom event that the Articles component can listen to
      window.dispatchEvent(new CustomEvent('articleSelected', { detail: { articleId: article.id } }));
    }, 100);
  };

  // Get all diagnosed conditions from profile and members
  const allConditions = useMemo(() => {
    const conditions: string[] = [];
    
    // Add conditions from main profile
    if (profile?.diagnosedCondition && Array.isArray(profile.diagnosedCondition)) {
      profile.diagnosedCondition.forEach((cond: any) => {
        const conditionText = typeof cond === 'string' ? cond : (cond?.condition || cond);
        if (conditionText) {
          conditions.push(conditionText);
        }
      });
    }
    
    return Array.from(new Set(conditions)); // Remove duplicates
  }, [profile]);

  useEffect(() => {
    const fetchArticles = async () => {
      if (allConditions.length === 0) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Fetch articles for each condition and combine results
        const articlePromises = allConditions.map(async (condition) => {
          try {
            const response = await axios.get('/api/articles/getArticles', {
              params: {
                status: 1, // Only approved articles
                limit: 5, // Get 5 per condition
                sortBy: 'created_at',
                sortOrder: 'DESC',
              },
            });

            if (response.data.success && response.data.data) {
              // Filter articles that match the condition in health_topics
              const conditionLower = condition.toLowerCase();
              return response.data.data.filter((article: Article) => {
                const healthTopics = (article.health_topics || '').toLowerCase();
                const title = (article.title || '').toLowerCase();
                const description = (article.short_description || '').toLowerCase();
                
                return (
                  healthTopics.includes(conditionLower) ||
                  title.includes(conditionLower) ||
                  description.includes(conditionLower)
                );
              });
            }
            return [];
          } catch (err) {
            console.error(`Error fetching articles for condition ${condition}:`, err);
            return [];
          }
        });

        const results = await Promise.all(articlePromises);
        // Flatten and deduplicate articles
        const allArticles = results.flat();
        const uniqueArticles = Array.from(
          new Map(allArticles.map((article: Article) => [article.id, article])).values()
        );
        
        // Sort by date and limit to 6 articles
        const sortedArticles = uniqueArticles
          .sort((a: Article, b: Article) => {
            const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
            return dateB - dateA;
          })
          .slice(0, 6);

        setArticles(sortedArticles);
      } catch (err: any) {
        console.error('Error fetching condition-based articles:', err);
        setError('Failed to load articles');
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, [allConditions]);

  const formatDate = (date: string | null | undefined) => {
    if (!date) return '';
    try {
      const d = new Date(date);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
      return `${Math.floor(diffDays / 30)} months ago`;
    } catch {
      return '';
    }
  };

  if (allConditions.length === 0) {
    return null; // Don't show if no conditions
  }

  return (
    <div className="w-full max-w-full bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 shadow-sm border border-gray-200 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1">
            Articles for Your Conditions
          </h3>
          <p className="text-xs sm:text-sm text-gray-600">
            Based on: {allConditions.slice(0, 2).join(', ')}
            {allConditions.length > 2 && ` +${allConditions.length - 2} more`}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.preventDefault();
            setDash('Articles');
          }}
          className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          View All
          <ArrowRight className="ml-2 w-4 h-4" />
        </button>
      </div>

      <div>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <BookOpen className="w-8 h-8 text-red-500" />
            </div>
            <p className="text-sm text-gray-500 font-medium">{error}</p>
          </div>
        ) : articles.length > 0 ? (
          <div className="w-full overflow-x-auto mobile-scroll">
            <div className="flex gap-3 sm:gap-4 pb-2" style={{ minWidth: 'max-content' }}>
              {articles.map((article) => (
                <article
                  key={article.id}
                  className="group flex-shrink-0 w-full sm:w-[400px] bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer"
                  onClick={() => handleArticleClick(article)}
                >
                  <div className="flex">
                    <div className="relative w-24 h-24 sm:w-28 sm:h-28 bg-gray-200 overflow-hidden flex-shrink-0">
                      <Image
                        src={normalizeImageUrl(article.image)}
                        alt={article.title}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/pictures/blog1.webp';
                        }}
                      />
                    </div>
                    <div className="flex-1 p-3 sm:p-4 min-w-0">
                      {article.health_topics && (
                        <div className="mb-1">
                          <span className="px-2 py-0.5 text-xs font-medium bg-blue-600 text-white rounded-md">
                            {article.health_topics}
                          </span>
                        </div>
                      )}
                      <h4 className="text-sm font-bold text-gray-900 line-clamp-2 mb-1.5 group-hover:text-blue-600 transition-colors">
                        {article.title}
                      </h4>
                      {article.short_description && (
                        <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                          {article.short_description}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(article.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-blue-600 group-hover:gap-2 transition-all">
                          <span className="font-medium">Read</span>
                          <ArrowRight className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <BookOpen className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 font-medium">No articles found</p>
            <p className="text-xs text-gray-400 mt-1">
              We couldn't find articles matching your conditions
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

