import React from 'react';
import { useSetRecoilState } from 'recoil';
import { dashTabs } from '@/components/common/recoil/dashboard';
import { useGetLegacyHealthTopics } from '@/hooks/reactQuery';
import Image from 'next/image';
import { normalizeImageUrl } from '@/lib/utils';

export const DashboardArticles = () => {
  const setDash = useSetRecoilState(dashTabs);
  // Use React Query hook for health topics with automatic caching
  const { data: healthTopics = [] } = useGetLegacyHealthTopics();

  return (
    <div className="mt-6 sm:mt-8 mb-4 bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3 sm:gap-0">
        <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">Relevant Health Topics for You</h3>
        <button
          onClick={() => {
            setDash('Articles');
          }}
          className="inline-flex items-center justify-center px-4 sm:px-5 py-2 sm:py-2.5 bg-gray-900 text-white text-sm sm:text-base font-medium rounded-lg hover:bg-gray-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          View More
          <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      <div className="mt-4">
        {healthTopics?.length > 0 ? (
          <FeaturedBlogTopic posts={healthTopics} />
        ) : (
          <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            </div>
            <p className="text-sm sm:text-base text-gray-500 font-medium">No Health Topics Available</p>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">Check back later for relevant articles</p>
          </div>
        )}
      </div>
    </div>
  );
};

const FeaturedBlogTopic = ({ posts }: { posts: any[] }) => (
  <div className="w-full overflow-x-auto pb-2">
    {posts?.length > 0 ? (
      <div className="flex gap-3 sm:gap-4 py-2">
        {posts.slice(0, 12).map((post: any, index: number) => {
          return (
            <div
              key={index}
              className="bg-white border border-gray-200 min-w-[200px] sm:min-w-[220px] lg:min-w-[240px] w-auto rounded-lg p-4 sm:p-5 flex items-center shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1 cursor-pointer group"
            >
              <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-gray-200 group-hover:border-gray-300 transition-colors shrink-0 mr-3 sm:mr-4">
                <Image
                  src={normalizeImageUrl(post.image)}
                  className="w-full h-full object-cover"
                  alt={post.title || 'Health Topic'}
                  width={64}
                  height={64}
                />
              </div>
              <div className="flex-1 min-w-0">
                <section className="font-semibold text-sm sm:text-base text-gray-900 mb-1 line-clamp-2 transition-colors">
                  {post.title || 'Health Topic'}
                </section>
                <section className="text-gray-600 text-xs sm:text-sm font-medium">
                  {post.total_articles || 0} {post.total_articles === 1 ? 'Blog' : 'Blogs'}
                </section>
              </div>
            </div>
          );
        })}
      </div>
    ) : (
      <p className="font-light text-left text-xs text-gray-500">No Data</p>
    )}
  </div>
);

