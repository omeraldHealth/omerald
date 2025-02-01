import React, { useState } from 'react';
import { useSetRecoilState } from 'recoil';
import { dashTabs } from '@/components/common/recoil/dashboard';
import moment from 'moment';
import { useAuthContext } from '@/components/common/utils/context/auth.context';
import ActivitiesModal from './ActivitiesModal';

export const DashboardRecentActivities = () => {
  const { profile } = useAuthContext();
  const setDash = useSetRecoilState(dashTabs);
  const [showModal, setShowModal] = useState(false);

  const allActivities = React.useMemo(() => {
    if (!profile?.activities || !Array.isArray(profile.activities)) {
      return [];
    }
    return [...profile.activities].sort((a: any, b: any) => {
      const timeA = new Date(a.actionTime || 0).getTime();
      const timeB = new Date(b.actionTime || 0).getTime();
      return timeB - timeA;
    });
  }, [profile?.activities]);

  const activities = allActivities.slice(0, 5);

  const getActivityIcon = (action: string) => {
    const actionLower = action?.toLowerCase() || '';
    if (actionLower.includes('report')) {
      return (
        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    } else if (actionLower.includes('member')) {
      return (
        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      );
    } else if (actionLower.includes('profile')) {
      return (
        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      );
    } else {
      return (
        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
    }
  };

  return (
    <div className="w-full max-w-full bg-white rounded-xl p-6 shadow-md border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activities</h3>
      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {activities.length > 0 ? (
          activities.map((activity: any, index: number) => (
            <div key={activity.id || index} className="flex items-start gap-3">
              {/* Purple Puzzle Piece Icon */}
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18l8 4v8.64l-8 4-8-4V8.18l8-4z"/>
                  <path d="M12 8L6 11v6l6 3 6-3v-6l-6-3zm0 2.18l4 2v3.64l-4 2-4-2v-3.64l4-2z"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {activity.action || 'Activity'} {activity.actionContent || ''} {activity.actionFor ? `for ${activity.actionFor}` : ''}
                </p>
                <p className="text-xs text-gray-500 mt-1">{moment(activity.actionTime).fromNow()}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500 text-sm">No recent activities</div>
        )}
      </div>
      {allActivities.length > 5 && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={(e) => {
              e.preventDefault();
              setShowModal(true);
            }}
            className="text-sm text-purple-600 hover:text-purple-700 font-medium"
          >
            View All
          </button>
        </div>
      )}

      <ActivitiesModal
        visible={showModal}
        setVisible={setShowModal}
        activities={allActivities}
      />
    </div>
  );
};


