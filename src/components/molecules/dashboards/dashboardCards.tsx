import React, { useEffect, useState } from 'react';
import { useSetRecoilState } from 'recoil';
import { dashTabs } from '@/components/common/recoil/dashboard';
import { DASHBOARD_STATS_CARDS } from '@/components/common/lib/constants/constants';
import { useAuthContext } from '@/components/common/utils/context/auth.context';
import axios from 'axios';
import { fetchHealthTopics, mapConditionsToHealthTopics, fetchArticlesByHealthTopics } from '@/services/blogApiService';

export const DashboardCards = () => {
  const { profile } = useAuthContext();
  const setDashboard = useSetRecoilState(dashTabs);
  const [reportsCount, setReportsCount] = useState(0);
  const [acceptedReportsCount, setAcceptedReportsCount] = useState(0);
  const [relatedArticlesCount, setRelatedArticlesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [articlesLoading, setArticlesLoading] = useState(false);

  useEffect(() => {
    const fetchReports = async () => {
      if (!profile?.phoneNumber) {
        setLoading(false);
        return;
      }

      try {
        const users = [profile.phoneNumber];
        profile?.members?.forEach((member: any) => {
          if (member.phoneNumber) {
            users.push(member.phoneNumber);
          }
        });

        const response = await axios.post('/api/reports/getManyReports', { users });
        const reportsData = response.data?.data || response.data || [];
        const allReports = Array.isArray(reportsData) ? reportsData : [];
        
        setReportsCount(allReports.length);
        const accepted = allReports.filter((r: any) => r.status === 'accepted');
        setAcceptedReportsCount(accepted.length);
      } catch (error) {
        console.error('Error fetching reports for dashboard cards:', error);
        // Fallback to profile.reports count if API fails
        setReportsCount(profile?.reports ? profile.reports.length : 0);
        setAcceptedReportsCount(profile?.reports ? profile.reports.length : 0);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [profile]);

  useEffect(() => {
    const fetchRelatedArticles = async () => {
      if (!profile) {
        setRelatedArticlesCount(0);
        setArticlesLoading(false);
        return;
      }

      const conditions: string[] = [];
      if (profile?.diagnosedCondition && Array.isArray(profile.diagnosedCondition)) {
        profile.diagnosedCondition.forEach((cond: any) => {
          const conditionText = typeof cond === 'string' ? cond : (cond?.condition || '');
          if (conditionText) {
            conditions.push(conditionText);
          }
        });
      }

      if (conditions.length === 0) {
        setRelatedArticlesCount(0);
        setArticlesLoading(false);
        return;
      }

      setArticlesLoading(true);
      try {
        const allTopics = await fetchHealthTopics();
        const matchedTopics = mapConditionsToHealthTopics(conditions, allTopics);
        
        if (matchedTopics.length === 0) {
          setRelatedArticlesCount(0);
          setArticlesLoading(false);
          return;
        }

        const topicIds = matchedTopics.map(t => t.id);
        const maxArticleCount = Math.max(...matchedTopics.map(t => t.article_count || 0), 1000);
        
        const result = await fetchArticlesByHealthTopics(topicIds, {
          status: 1,
          limit: maxArticleCount,
          offset: 0,
        });

        setRelatedArticlesCount(result.total || 0);
      } catch (err: any) {
        console.error('Error fetching related articles count:', err);
        setRelatedArticlesCount(0);
      } finally {
        setArticlesLoading(false);
      }
    };

    fetchRelatedArticles();
  }, [profile]);

  const values = {
    "Members": profile?.members ? profile.members.length : 0,
    "Reports Uploaded": loading ? '...' : reportsCount,
    "Reports Accepted": loading ? '...' : acceptedReportsCount,
    "Related Articles": articlesLoading ? '...' : relatedArticlesCount
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5 xl:gap-6 w-full max-w-full">
      {DASHBOARD_STATS_CARDS.map(({ route, bgColor, Icon, text }, index) => {
        // Map route to dashboard tab name
        const routeToTabMap: { [key: string]: string } = {
          '/members': 'Members',
          '/reports': 'Reports',
          '/subscription': 'Subscription',
          '/articles': 'Articles',
        };
        const routeName = routeToTabMap[route] || text;
        const value = values[text as keyof typeof values];
        const isSubscription = text === "Subscription Plan";
        
        // Get subtitle based on card type
        const getSubtitle = () => {
          if (text === "Members") {
            const membersCount = profile?.members?.length || 0;
            return membersCount > 0 ? `${membersCount} ${membersCount === 1 ? 'member' : 'members'}` : 'No members yet';
          }
          if (text === "Reports Uploaded") {
            return reportsCount > 0 ? `${reportsCount} ${reportsCount === 1 ? 'report' : 'reports'}` : 'No reports yet';
          }
          if (text === "Reports Accepted") {
            return acceptedReportsCount > 0 ? `${acceptedReportsCount} accepted` : 'No accepted reports';
          }
          if (text === "Related Articles") {
            return relatedArticlesCount > 0 ? `${relatedArticlesCount} articles` : 'No articles yet';
          }
          return '';
        };
        
        return (
          <div
            key={index}
            onClick={() => { setDashboard(routeName); }}
            className="group cursor-pointer transform transition-all duration-200 hover:-translate-y-1"
          >
            <div className="relative overflow-hidden flex items-center justify-between rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-5 xl:p-6 bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 h-full w-full">
              <div className="flex-1 min-w-0 pr-2 sm:pr-3">
                <div className="text-xs sm:text-sm font-medium text-gray-500 mb-1 sm:mb-2 uppercase tracking-wide truncate">{text}</div>
                <div className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-gray-900 mb-0.5 sm:mb-1 transition-colors duration-200 break-words">
                  {value}
                </div>
                <div className="text-xs sm:text-sm text-gray-500 truncate">
                  {getSubtitle()}
                </div>
              </div>
              
              {/* Icon on the right */}
              <div className="flex-shrink-0 ml-2 sm:ml-3 lg:ml-4">
                <div 
                  className="p-2 sm:p-3 lg:p-4 rounded-lg sm:rounded-xl transition-all duration-200"
                  style={{
                    backgroundColor: `${bgColor}15`,
                  }}
                >
                  <div style={{ color: bgColor }} className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 xl:w-8 xl:h-8">
                    <Icon />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

