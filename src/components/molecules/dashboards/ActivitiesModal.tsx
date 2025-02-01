'use client';

import React from 'react';
import moment from 'moment';
import { XMarkIcon } from '@heroicons/react/24/solid';

interface Activity {
  id?: string;
  action?: string;
  actionContent?: string;
  actionFor?: string;
  actionBy?: string;
  actionTime?: string | Date;
  type?: string;
  [key: string]: any;
}

interface ActivitiesModalProps {
  visible: boolean;
  setVisible: (visible: boolean) => void;
  activities: Activity[];
}

export default function ActivitiesModal({ visible, setVisible, activities }: ActivitiesModalProps) {
  if (!visible) return null;

  const getActivityType = (activity: Activity): string => {
    const action = activity.action?.toLowerCase() || '';
    if (action.includes('report') || activity.type === 'report') {
      return 'Report';
    } else if (action.includes('member')) {
      return 'Member';
    } else if (action.includes('profile')) {
      return 'Profile';
    } else if (action.includes('shared')) {
      return 'Share';
    } else if (action.includes('upload')) {
      return 'Upload';
    }
    return 'Activity';
  };

  const formatActivityTime = (actionTime: string | Date | undefined | null) => {
    if (!actionTime) {
      return {
        relative: 'Unknown',
        absolute: 'Unknown',
        date: 'Unknown',
        time: 'Unknown',
      };
    }
    
    try {
      const date = new Date(actionTime);
      if (isNaN(date.getTime())) {
        return {
          relative: 'Invalid date',
          absolute: 'Invalid date',
          date: 'Invalid',
          time: 'Invalid',
        };
      }
      return {
        relative: moment(date).fromNow(),
        absolute: moment(date).format('MMMM DD, YYYY [at] hh:mm A'),
        date: moment(date).format('MMM DD, YYYY'),
        time: moment(date).format('hh:mm A'),
      };
    } catch (error) {
      return {
        relative: 'Error',
        absolute: 'Error parsing date',
        date: 'Error',
        time: 'Error',
      };
    }
  };

  const getActivityDescription = (activity: Activity): string => {
    if (activity.actionContent) {
      return `${activity.action || 'Activity'} ${activity.actionContent}${activity.actionFor ? ` for ${activity.actionFor}` : ''}`;
    }
    return activity.action || 'Activity';
  };

  const getReportType = (activity: Activity): string => {
    if (activity.type === 'report' && activity.reportType) {
      return activity.reportType;
    }
    return '-';
  };

  const getItemName = (activity: Activity): string => {
    // For reports, show report name
    if (activity.type === 'report' && activity.reportName) {
      return activity.reportName;
    }
    // For profile activities, show actionContent or actionFor
    if (activity.actionContent) {
      return activity.actionContent;
    }
    if (activity.actionFor) {
      return activity.actionFor;
    }
    return '-';
  };

  const getSharedWithDisplay = (activity: Activity): JSX.Element => {
    if (activity.type === 'report') {
      if (activity.sharedWithCount > 0) {
        const sharedWith = activity.sharedWith || [];
        const displayNames = sharedWith.slice(0, 2).map((share: any, idx: number) => (
          <span
            key={idx}
            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 mr-1"
            title={share.name || share.phoneNumber || 'Shared user'}
          >
            {share.name || share.phoneNumber || 'User'}
          </span>
        ));
        
        if (sharedWith.length > 2) {
          return (
            <div className="flex flex-wrap gap-1">
              {displayNames}
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                +{sharedWith.length - 2}
              </span>
            </div>
          );
        }
        return <div className="flex flex-wrap gap-1">{displayNames}</div>;
      }
      return <span className="text-gray-400 text-xs">Not shared</span>;
    }
    return <span className="text-gray-400 text-xs">-</span>;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay with blur */}
        <div
          className="fixed inset-0 bg-white/20 backdrop-blur-[1px]"
          onClick={() => setVisible(false)}
        ></div>

        {/* Modal panel */}
        <div className="relative z-50 inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
          {/* Header */}
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">All Activities ({activities.length})</h3>
              <button
                onClick={() => setVisible(false)}
                className="text-gray-400 hover:text-gray-500 transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content - Table */}
          <div className="bg-white px-4 pt-4 pb-4 sm:p-6">
            {activities.length > 0 ? (
              <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Activity
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Item Name
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Report Type
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Shared With
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        By
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date & Time
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Relative
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {activities.map((activity: Activity, index: number) => {
                      const timeInfo = formatActivityTime(activity.actionTime);
                      const activityType = getActivityType(activity);
                      const description = getActivityDescription(activity);
                      const itemName = getItemName(activity);
                      const reportType = getReportType(activity);
                      const sharedWithDisplay = getSharedWithDisplay(activity);
                      
                      return (
                        <tr key={activity.id || index} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              {activityType}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-gray-900">{description}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-900">{itemName}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {reportType !== '-' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                {reportType}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm">
                              {sharedWithDisplay}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-gray-600">
                              {activity.actionBy || '-'}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{timeInfo.absolute}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{timeInfo.relative}</div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-gray-500 font-medium">No activities found</p>
                <p className="text-sm text-gray-400 mt-1">Your activities will appear here</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200">
            <button
              onClick={() => setVisible(false)}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-base font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

