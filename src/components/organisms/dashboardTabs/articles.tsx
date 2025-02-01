'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import axios from 'axios';
import debounce from 'lodash.debounce';
import { Search, ArrowUpDown, Calendar, User, Filter, ArrowLeft, Clock, X } from 'lucide-react';
import { normalizeImageUrl } from '@/lib/utils';
import { useAuthContext } from '@/components/common/utils/context/auth.context';
import { 
  mapConditionsToHealthTopics,
  HealthTopic,
  BlogArticle
} from '@/services/blogApiService';
import { useGetHealthTopics, useGetMappedHealthTopics, useGetArticlesByHealthTopics } from '@/hooks/reactQuery';

interface Article {
  id: number;
  writer_id: number;
  title: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  health_topics: string | null;
  article_comment: string | null;
  article_ratings: string | null;
  status: number;
  image: string | null;
  updated_by: number | null;
  approval_date: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export default function Articles() {
  const { profile } = useAuthContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [status, setStatus] = useState<number | null>(1);
  const [limit, setLimit] = useState(30);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [selectedHealthTopicIds, setSelectedHealthTopicIds] = useState<number[]>([]);

  const diagnosedConditions = useMemo(() => {
    if (!profile?.diagnosedCondition || !Array.isArray(profile.diagnosedCondition)) {
      return [];
    }
    return profile.diagnosedCondition.map((c: any) => 
      typeof c === 'string' ? c : (c?.condition || '')
    ).filter(Boolean);
  }, [profile]);

  // Use React Query hooks for health topics and articles
  const { data: mappedHealthTopics = [], isLoading: loadingHealthTopics } = useGetMappedHealthTopics(diagnosedConditions);
  const healthTopics = mappedHealthTopics;
  
  // Set selected health topic IDs when mapped topics are loaded
  useEffect(() => {
    if (healthTopics.length > 0 && selectedHealthTopicIds.length === 0) {
      setSelectedHealthTopicIds(healthTopics.map(t => t.id));
    }
  }, [healthTopics, selectedHealthTopicIds.length]);

  // Use React Query hook for articles with optimized settings
  const { data: articlesData, isLoading: loadingArticles, isFetching: isFetchingArticles } = useGetArticlesByHealthTopics(
    selectedHealthTopicIds.length > 0 ? selectedHealthTopicIds : [],
    {
      status: status || 1,
      limit,
      offset,
      sortBy,
      sortOrder: sortOrder.toLowerCase() as 'asc' | 'desc',
    }
  );

  const articles = (articlesData?.articles || []) as Article[];
  const totalCount = articlesData?.total || 0;
  const loading = loadingArticles || isFetchingArticles;

  // Check if user has health topics or diagnosed conditions
  const hasHealthData = useMemo(() => {
    return diagnosedConditions.length > 0 || healthTopics.length > 0;
  }, [diagnosedConditions.length, healthTopics.length]);

  // Check for article ID in URL params or custom event
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const articleId = urlParams.get('articleId');
    
    if (articleId && articles.length > 0) {
      // Find article by ID after articles are loaded
      const article = articles.find(a => a.id === parseInt(articleId));
      if (article) {
        setSelectedArticle(article);
      }
    }

    // Listen for article selection from dashboard
    const handleArticleSelected = (event: any) => {
      const { articleId: selectedId } = event.detail;
      if (articles.length > 0) {
        const article = articles.find(a => a.id === selectedId);
        if (article) {
          setSelectedArticle(article);
        }
      }
    };

    window.addEventListener('articleSelected', handleArticleSelected as EventListener);
    return () => {
      window.removeEventListener('articleSelected', handleArticleSelected as EventListener);
    };
  }, [articles]);

  // Articles and health topics are now fetched via React Query hooks above
  // Handle error states
  useEffect(() => {
      if (diagnosedConditions.length === 0) {
      setError(null);
    } else if (healthTopics.length === 0 && !loadingHealthTopics) {
      setError('No health topics found matching your diagnosed conditions.');
    } else if (selectedHealthTopicIds.length > 0 && articles.length === 0 && !loading) {
      setError('No articles found for the selected health topics.');
        } else {
      setError(null);
    }
  }, [diagnosedConditions.length, healthTopics.length, selectedHealthTopicIds.length, articles.length, loading, loadingHealthTopics]);

  const toggleHealthTopic = (topicId: number) => {
    setSelectedHealthTopicIds(prev => 
      prev.includes(topicId) 
        ? prev.filter(id => id !== topicId)
        : [...prev, topicId]
    );
    setOffset(0);
  };


  // Client-side search filtering
  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) {
      return articles;
    }
    
    const query = searchQuery.toLowerCase();
    return articles.filter((article) => {
      const title = (article.title || '').toLowerCase();
      const description = (article.description || '').toLowerCase();
      const shortDesc = (article.short_description || '').toLowerCase();
      const healthTopics = (article.health_topics || '').toLowerCase();
      
      return (
        title.includes(query) ||
        description.includes(query) ||
        shortDesc.includes(query) ||
        healthTopics.includes(query)
      );
    });
  }, [articles, searchQuery]);

  const handleSearch = useCallback(
    debounce((query: string) => {
      setSearchQuery(query);
      setOffset(0); // Reset pagination on search
    }, 300),
    []
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    handleSearch(value);
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return 'N/A';
    try {
      const d = new Date(date);
      const hours = d.getHours();
      const minutes = d.getMinutes();
      const ampm = hours >= 12 ? 'pm' : 'am';
      const hours12 = hours % 12 || 12;
      const minutesStr = minutes < 10 ? `0${minutes}` : minutes;
      
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffDays === 0) {
        if (diffHours === 0) {
          const diffMins = Math.floor(diffMs / (1000 * 60));
          return diffMins <= 1 ? 'just now' : `${diffMins} minutes ago`;
        }
        return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
      } else if (diffDays === 1) {
        return 'yesterday';
      } else if (diffDays < 7) {
        return `${diffDays} days ago`;
      } else {
        return `${hours12}:${minutesStr} ${ampm}`;
      }
    } catch {
      return 'N/A';
    }
  };

  const handleSortChange = (newSortBy: string) => {
    setSortBy(newSortBy);
    setOffset(0);
  };

  const handleSortOrderChange = (newOrder: 'ASC' | 'DESC') => {
    setSortOrder(newOrder);
    setOffset(0);
  };

  const handleStatusChange = (newStatus: number | null) => {
    setStatus(newStatus);
    setOffset(0);
  };

  const handleLoadMore = () => {
    setOffset((prev) => prev + limit);
  };

  const handleArticleClick = (article: Article) => {
    setSelectedArticle(article);
    // Update URL without page reload
    window.history.pushState({}, '', `?articleId=${article.id}`);
  };

  const handleBackToList = () => {
    setSelectedArticle(null);
    window.history.pushState({}, '', window.location.pathname);
  };

  // Article Read View Component
  const ArticleReadView = ({ article, onBack }: { article: Article; onBack: () => void }) => {
    const formatFullDate = (date: string | null | undefined) => {
      if (!date) return 'N/A';
      try {
        const d = new Date(date);
        return d.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      } catch {
        return 'N/A';
      }
    };

    return (
      <div className="w-full h-full flex flex-col bg-gray-50 overflow-hidden -my-2 sm:-my-4 -mx-3 sm:-mx-4 md:-mx-6 lg:-mx-8">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 flex-shrink-0 shadow-sm">
          <div className="max-w-6xl xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-4">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back to Articles</span>
            </button>
          </div>
        </div>

        {/* Article Content - Scrollable */}
        <article className="flex-1 overflow-y-auto overflow-x-hidden max-w-6xl xl:max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8 min-h-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Article Image */}
            {article.image && (
              <div className="relative w-full h-64 sm:h-96 bg-gray-200">
                <Image
                  src={normalizeImageUrl(article.image)}
                  alt={article.title}
                  fill
                  className="object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/pictures/blog1.webp';
                  }}
                />
              </div>
            )}

            <div className="p-6 sm:p-8 lg:p-10">
              {/* Article Meta */}
              <div className="mb-6">
                {/* Health Topics - Hidden until we have topic titles instead of IDs */}
                {/* {article.health_topics && (
                  <div className="mb-4">
                    <span className="inline-block px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg">
                      {article.health_topics}
                    </span>
                  </div>
                )} */}
                
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 leading-tight">
                  {article.title}
                </h1>

                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{formatFullDate(article.created_at)}</span>
                  </div>
                  {article.updated_at && article.updated_at !== article.created_at && (
                    <>
                      <span>•</span>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>Updated {formatFullDate(article.updated_at)}</span>
                      </div>
                    </>
                  )}
                  <span>•</span>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>Writer {article.writer_id || 'Anonymous'}</span>
                  </div>
                </div>
              </div>

              {/* Short Description */}
              {article.short_description && (
                <div className="mb-8 p-4 bg-blue-50 border-l-4 border-blue-600 rounded-r-lg">
                  <p className="text-lg text-gray-700 leading-relaxed">
                    {article.short_description}
                  </p>
                </div>
              )}

              {/* Article Description/Content */}
              {article.description && (
                <div className="prose prose-lg max-w-none">
                  <div 
                    className="text-gray-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ 
                      __html: (() => {
                        // Process HTML to fix image URLs
                        let processedHtml = article.description;
                        
                        // Find all img tags and fix their src attributes
                        processedHtml = processedHtml.replace(
                          /<img([^>]*?)src=["']([^"']+)["']([^>]*?)>/gi,
                          (match, before, src, after) => {
                            // Skip if already using correct base URL
                            if (src.includes('blog.omerald.com') || src.includes('https://') || src.startsWith('/')) {
                              // Convert http to https and ensure .webp extension
                              let fixedSrc = src.replace('http://', 'https://');
                              
                              // Convert image extensions to .webp
                              fixedSrc = fixedSrc.replace(/\.(jpg|jpeg|png|gif)(\?|$)/gi, '.webp$2');
                              
                              // If it's an omerald.com URL but not blog.omerald.com, update it
                              if (fixedSrc.includes('omerald.com') && !fixedSrc.includes('blog.omerald.com')) {
                                fixedSrc = fixedSrc.replace(/https?:\/\/(www\.)?omerald\.com/, 'https://blog.omerald.com');
                              }
                              
                              return `<img${before}src="${fixedSrc}"${after}>`;
                            }
                            
                            // If it's a relative path or filename, construct full URL
                            let fixedSrc = src;
                            
                            // Remove leading slash if present
                            if (fixedSrc.startsWith('/')) {
                              fixedSrc = fixedSrc.substring(1);
                            }
                            
                            // Extract filename
                            const filename = fixedSrc.split('/').pop() || fixedSrc;
                            
                            // Convert extension to .webp
                            const webpFilename = filename.replace(/\.(jpg|jpeg|png|gif)(\?|$)/gi, '.webp$2');
                            
                            // Construct full URL
                            fixedSrc = `https://blog.omerald.com/public/uploads/images/${webpFilename}`;
                            
                            return `<img${before}src="${fixedSrc}"${after}>`;
                          }
                        );
                        
                        return processedHtml;
                      })()
                    }}
                  />
                </div>
              )}

              {/* Article Comments/Ratings */}
              {(article.article_comment || article.article_ratings) && (
                <div className="mt-8 pt-8 border-t border-gray-200">
                  {article.article_ratings && (
                    <div className="mb-4">
                      <span className="text-sm font-medium text-gray-600">Rating: </span>
                      <span className="text-lg font-bold text-blue-600">{article.article_ratings}</span>
                    </div>
                  )}
                  {article.article_comment && (
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">Comments</h3>
                      <p className="text-gray-700 leading-relaxed">{article.article_comment}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Back Button */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={onBack}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Back to Articles
                </button>
              </div>
            </div>
          </div>
        </article>
      </div>
    );
  };

  // Show loading only if user has health data
  if (loading && hasHealthData && articles.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-gray-500 text-lg">Loading articles...</div>
        </div>
      </div>
    );
  }

  // Show article read view if article is selected
  if (selectedArticle) {
    return <ArticleReadView article={selectedArticle} onBack={handleBackToList} />;
  }

  return (
    <div className="w-full h-full flex flex-col bg-gray-50 overflow-hidden -my-2 sm:-my-4 -mx-3 sm:-mx-4 md:-mx-6 lg:-mx-8">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 flex-shrink-0 shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Health Articles</h1>
              <p className="text-gray-600 mt-1">Discover insights for your health journey</p>
            </div>
            <div className="relative w-full sm:w-auto sm:min-w-[300px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search articles..."
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Two Column Layout - Scrollable */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8 min-h-0">
        <div className="grid grid-cols-12 gap-6 lg:gap-8 xl:gap-10">
          {/* Left Sidebar */}
          <aside className="col-span-12 lg:col-span-4 space-y-6">
            <div className="bg-white p-6 xl:p-8 rounded-xl shadow-sm border border-gray-200">
              <div className="mb-4">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Filter className="w-5 h-5 text-blue-600" />
                  Related Health Topics
                </h2>
              </div>
              {loadingHealthTopics ? (
                <div className="text-sm text-gray-500 flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  Loading...
                </div>
              ) : healthTopics.length > 0 ? (
                <>
                  <p className="text-sm text-gray-600 mb-4">
                    Based on your conditions: <span className="font-semibold">{diagnosedConditions.join(', ')}</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {healthTopics.map((topic) => {
                      const isSelected = selectedHealthTopicIds.includes(topic.id);
                      return (
                        <button
                          key={topic.id}
                          onClick={() => toggleHealthTopic(topic.id)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {topic.title}
                          <span className="text-xs opacity-75">({topic.article_count})</span>
                          {isSelected && <X className="w-3 h-3" />}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-4 text-sm text-gray-600 pt-4 border-t border-gray-200">
                    Showing <span className="font-semibold text-blue-600">{totalCount}</span> article{totalCount !== 1 ? 's' : ''} for selected topics
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-500">
                  {diagnosedConditions.length === 0 
                    ? 'Add diagnosed conditions in your profile to see related health topics and articles.'
                    : 'No health topics found for your diagnosed conditions.'}
                </div>
              )}
            </div>

            {/* Latest Articles */}
            {hasHealthData && articles.length > 0 && (
              <div className="bg-white p-6 xl:p-8 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Latest Articles
                </h3>
                <div className="space-y-4">
                  {articles.slice(0, 5).map((article) => (
                    <div 
                      key={article.id} 
                      onClick={() => handleArticleClick(article)}
                      className="flex gap-3 xl:gap-4 group cursor-pointer"
                    >
                      <div className="relative w-20 h-20 xl:w-24 xl:h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-200">
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
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm xl:text-base font-semibold text-gray-900 line-clamp-2 mb-1 group-hover:text-blue-600 transition-colors">
                          {article.title}
                        </h4>
                        <p className="text-xs xl:text-sm text-gray-500">{formatDate(article.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>

          {/* Main Content Area - 2 Columns */}
          <main className="col-span-12 lg:col-span-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}

            {!hasHealthData ? (
              <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
                <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg font-medium">No articles available</p>
                <p className="text-gray-400 text-sm mt-2">Add diagnosed conditions in your profile to see personalized articles</p>
              </div>
            ) : filteredArticles.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
                <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg font-medium">No articles found</p>
                <p className="text-gray-400 text-sm mt-2">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 xl:gap-6">
                {filteredArticles.map((article) => (
                  <article
                    key={article.id}
                    onClick={() => handleArticleClick(article)}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300 overflow-hidden group cursor-pointer flex flex-col"
                  >
                    <div className="relative w-full h-48 xl:h-56 bg-gray-200">
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
                    <div className="p-5 xl:p-6 flex-1 flex flex-col">
                      <h2 className="text-lg xl:text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors line-clamp-2">
                        {article.title}
                      </h2>
                      <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(article.created_at)}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          Writer {article.writer_id || 'Anonymous'}
                        </span>
                      </div>
                      {article.short_description && (
                        <p className="text-sm xl:text-base text-gray-600 line-clamp-3 mt-auto">
                          {article.short_description}
                        </p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}

            {/* Pagination */}
            {!searchQuery && filteredArticles.length >= limit && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  {loading ? 'Loading...' : 'Load More Articles'}
                </button>
              </div>
            )}

            {!searchQuery && (
              <div className="mt-4 text-center text-sm text-gray-500">
                Showing {Math.min(offset + limit, totalCount)} of {totalCount} articles
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
