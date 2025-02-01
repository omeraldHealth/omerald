'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { AVATAR } from '@/components/common/lib/constants/constants';
import { useAuthContext } from '@/components/common/utils/context/auth.context';
import { useGetManyReports } from '@/hooks/reactQuery/reports';
import axios from 'axios';
import { updateProfile } from '@/components/common/lib/constants/urls';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useSetRecoilState } from 'recoil';
import { dashTabs } from '@/components/common/recoil/dashboard';
import moment from 'moment';
import ActivitiesModal from './ActivitiesModal';
import { DiagnosedConditionsAndReportTypes } from '@/components/molecules/DiagnosedConditionsAndReportTypes';
import { XMarkIcon, TrashIcon } from '@heroicons/react/24/solid';
import { useGetMembersByIds } from '@/hooks/reactQuery/profile';

interface ProfileInfoCardProps {
  profileData?: any;
  reports?: any[];
  formatDate?: (date: Date | string) => string;
  onProfileUpdate?: () => void;
  showDoctorToggle?: boolean;
  onAnalyzeConditions?: (silent?: boolean) => void;
  onAnalyzeBodyImpact?: (silent?: boolean) => void;
  isAnalyzingConditions?: boolean;
  suggestedConditions?: any[];
  showSuggestedConditions?: boolean;
  onAddSuggestedConditions?: () => void;
  onDismissSuggestedConditions?: () => void;
  showMembers?: boolean;
}

export default function ProfileInfoCard({ 
  profileData, 
  reports = [], 
  formatDate,
  onProfileUpdate,
  showDoctorToggle = true,
  onAnalyzeConditions,
  onAnalyzeBodyImpact,
  isAnalyzingConditions = false,
  suggestedConditions = [],
  showSuggestedConditions = false,
  onAddSuggestedConditions,
  onDismissSuggestedConditions,
  showMembers = true
}: ProfileInfoCardProps) {
  const queryClient = useQueryClient();
  const setDash = useSetRecoilState(dashTabs);
  const { profile: authProfile, refreshProfile } = useAuthContext();
  const [showActivitiesModal, setShowActivitiesModal] = useState(false);
  
  // Debug: Log when suggested conditions props change
  useEffect(() => {
    console.log('ProfileInfoCard - Suggested Conditions Props:', {
      showSuggestedConditions,
      suggestedConditionsCount: suggestedConditions?.length || 0,
      suggestedConditions: suggestedConditions,
      shouldRender: showSuggestedConditions && Array.isArray(suggestedConditions) && suggestedConditions.length > 0
    });
  }, [showSuggestedConditions, suggestedConditions]);
  
  // Use provided profileData or fallback to authProfile
  const profile = profileData || authProfile;
  
  // If reports not provided, fetch them
  const users: string[] = [];
  if (profile?.phoneNumber) {
    users.push(profile.phoneNumber);
  }
  const { data: fetchedReports = [] } = useGetManyReports(users.length > 0 ? users : undefined);
  const allReports = reports.length > 0 ? reports : fetchedReports;
  
  const sharedWithCount = profile?.sharedWith?.length || 0;
  
  // Fetch member profiles for display
  const memberIds: string[] = [];
  if (profile?.members) {
    profile.members.forEach((member: any) => {
      if (member.memberId) {
        memberIds.push(member.memberId);
      }
    });
  }
  const { data: memberProfiles = [] } = useGetMembersByIds(memberIds.length > 0 ? memberIds : undefined);
  
  // Map members with their profiles
  const membersWithProfiles = useMemo(() => {
    if (!profile?.members || !memberProfiles) return [];
    return profile.members.map((memberMeta: any) => {
      const memberProfile = memberProfiles.find((mp: any) => mp._id?.toString() === memberMeta.memberId?.toString());
      return {
        ...memberMeta,
        ...memberProfile,
        memberMetaId: memberMeta._id,
      };
    });
  }, [profile?.members, memberProfiles]);
  
  // Handle member removal
  const handleRemoveMember = async (memberId: string) => {
    const member = membersWithProfiles.find((m: any) => m._id === memberId);
    if (!member || !profile) {
      toast.error('Member not found');
      return;
    }
    
    // Don't allow removing self
    if (member.relation === 'Self') {
      toast.error('Cannot remove yourself');
      return;
    }
    
    if (!confirm(`Are you sure you want to remove ${member.firstName} ${member.lastName} from your profile? This will only remove them from your members list, not delete their account from Omerald.`)) {
      return;
    }
    
    try {
      const updatedMembers = profile.members.filter((m: any) => {
        return !(
          (m._id?.toString() === member.memberMetaId?.toString()) ||
          (m.memberId?.toString() === member._id?.toString())
        );
      });
      
      await axios.put(updateProfile, { 
        id: profile._id, 
        members: updatedMembers 
      });
      
      queryClient.invalidateQueries({ queryKey: ['getProfileByPhone', profile?.phoneNumber] });
      queryClient.invalidateQueries({ queryKey: ['getMembersById'] });
      
      if (onProfileUpdate) {
        onProfileUpdate();
      } else {
        await refreshProfile();
      }
      
      toast.success('Member removed successfully!');
    } catch (error: any) {
      console.error('Error removing member:', error);
      toast.error(error?.response?.data?.error || 'Failed to remove member');
    }
  };
  
  // Get activities from profile and reports
  const allActivities = useMemo(() => {
    const activities: any[] = [];
    
    // Add profile activities
    if (profile?.activities && Array.isArray(profile.activities)) {
      profile.activities.forEach((activity: any) => {
        if (activity && typeof activity === 'object') {
          activities.push({
            id: activity.id || `activity-${Date.now()}-${Math.random()}`,
            action: activity.action || 'Activity',
            actionContent: activity.actionContent || '',
            actionFor: activity.actionFor || '',
            actionBy: activity.actionBy || profile?.firstName || profile?.phoneNumber || 'User',
            actionTime: activity.actionTime || new Date(),
            type: 'profile',
            // Include original activity data for richer display
            originalActivity: activity,
          });
        }
      });
    }
    
    // Add report-based activities with more details
    if (Array.isArray(allReports)) {
      allReports.forEach((report: any) => {
        if (report) {
          try {
            const dateValue = report.createdAt || report.uploadDate || report.uploadedAt || report.reportDate || new Date();
            const date = new Date(dateValue);
            
            // Only add if date is valid
            if (!isNaN(date.getTime())) {
              const status = report.status === 'pending' ? 'Uploaded' : 'Shared';
              const reportName = report.name || report.testName || report.reportData?.reportName || 'Report';
              const reportType = report.type || report.documentType || report.reportData?.parsedData?.test?.testName || 'Blood Report';
              const sharedWith = report.sharedWith || [];
              const sharedWithNames = sharedWith
                .slice(0, 3)
                .map((share: any) => share.name || share.phoneNumber || 'User')
                .join(', ');
              const sharedWithCount = sharedWith.length;
              
              activities.push({
                id: `report-${report._id || report.id || Date.now()}`,
                action: status,
                actionContent: reportName,
                actionTime: date,
                type: 'report',
                // Additional report details
                reportName: reportName,
                reportType: reportType,
                reportId: report._id || report.id,
                sharedWith: sharedWith,
                sharedWithNames: sharedWithCount > 0 ? (sharedWithCount > 3 ? `${sharedWithNames} +${sharedWithCount - 3} more` : sharedWithNames) : '',
                sharedWithCount: sharedWithCount,
                status: report.status,
                actionBy: report.userName || profile?.firstName || profile?.phoneNumber || 'User',
                // Include original report data
                originalReport: report,
              });
            }
          } catch (error) {
            console.error('Error processing report activity:', error);
          }
        }
      });
    }
    
    // Sort by time (newest first) with error handling
    return activities.sort((a, b) => {
      try {
        const timeA = a.actionTime ? new Date(a.actionTime).getTime() : 0;
        const timeB = b.actionTime ? new Date(b.actionTime).getTime() : 0;
        if (isNaN(timeA)) return 1;
        if (isNaN(timeB)) return -1;
        return timeB - timeA;
      } catch (error) {
        return 0;
      }
    });
  }, [profile?.activities, allReports, profile]);
  
  // Limit to 5 for display
  const displayedActivities = allActivities.slice(0, 5);
  
  const defaultFormatDate = (date: Date | string) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };
  
  const formatDateFn = formatDate || defaultFormatDate;
  
  const handleDoctorToggle = async (checked: boolean) => {
    try {
      await axios.put(updateProfile, { 
        id: profile?._id, 
        isDoctor: checked,
        doctorApproved: checked
      });
      if (onProfileUpdate) {
        onProfileUpdate();
      } else {
        await refreshProfile();
      }
      queryClient.invalidateQueries({ queryKey: ['getProfileByPhone', profile?.phoneNumber] });
      
      if (checked) {
        toast.success('Marked as Doctor - Switching to Doctor Profile');
        setTimeout(() => {
          setDash('Doctor');
        }, 500);
      } else {
        toast.success('Removed Doctor status');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to update doctor status');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200 h-full flex flex-col">
      <div className="text-center flex-1 flex flex-col">
        <div className="relative inline-block mb-4">
          <Image
            src={profile?.profileUrl || AVATAR}
            alt={profile?.firstName || 'Profile'}
            width={100}
            height={100}
            className="w-24 h-24 rounded-full border-4 border-gray-100 shadow-md mx-auto"
          />
          {profile?.subscription && profile.subscription !== 'Free' && (
            <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
              ⭐PAID
            </div>
          )}
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">
          {profile?.firstName
            ? `${profile.firstName} ${profile?.lastName || ''}`
            : 'User Name'}
        </h2>
        <p className="text-sm text-gray-500 mb-2">{profile?.userType || 'Primary'} User</p>
        
        {/* Doctor Toggle */}
        {showDoctorToggle && (
          <div className="mb-4 flex items-center justify-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={profile?.isDoctor || false}
                onChange={(e) => handleDoctorToggle(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              <span className="ml-3 text-sm font-medium text-gray-700">
                {profile?.isDoctor ? '👨‍⚕️ Doctor Account' : 'Mark as Doctor'}
              </span>
            </label>
          </div>
        )}
        
        {/* Stats Circle */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-orange-100 flex items-center justify-center mb-1">
              <div className="text-center">
                <div className="text-lg font-bold text-orange-600">{Math.round((allReports.length / 100) * 100)}%</div>
              </div>
            </div>
            <p className="text-xs text-gray-600">Reports</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-1">
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">{sharedWithCount > 0 ? Math.min(Math.round((sharedWithCount / 10) * 100), 100) : 0}%</div>
              </div>
            </div>
            <p className="text-xs text-gray-600">Profile shared</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-blue-100 flex items-center justify-center mb-1">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">{allReports.filter((r: any) => r.status === 'pending').length}%</div>
              </div>
            </div>
            <p className="text-xs text-gray-600">Reports in queue</p>
          </div>
        </div>
        
        {/* Recent Activities */}
        <div className="border-t border-gray-200 pt-4 flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 text-left">Recent Activities</h3>
            {allActivities.length > 0 && (
              <button
                onClick={() => setShowActivitiesModal(true)}
                className="text-xs text-purple-600 hover:text-purple-700 font-medium"
              >
                View All ({allActivities.length})
              </button>
            )}
          </div>
          <div className="space-y-3 flex-1">
            {displayedActivities.length > 0 ? (
              displayedActivities.map((activity: any, index: number) => {
                const activityText = activity.actionContent 
                  ? `${activity.action} ${activity.actionContent}${activity.actionFor ? ` for ${activity.actionFor}` : ''}`
                  : activity.action || 'Activity';
                return (
                  <div key={activity.id || index} className="flex items-start gap-2 text-left">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">
                        {activityText}
                      </p>
                      <p className="text-xs text-gray-500">
                        {activity.actionTime ? moment(activity.actionTime).fromNow() : 'Recently'}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-gray-500">No recent activities</p>
            )}
          </div>
        </div>
        
        {/* Activities Modal */}
        <ActivitiesModal
          visible={showActivitiesModal}
          setVisible={setShowActivitiesModal}
          activities={allActivities}
        />
      </div>

      {/* Suggested Conditions from Reports */}
      {showSuggestedConditions && suggestedConditions.length > 0 && (
        <div className="border-t border-gray-200 pt-4 mt-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="text-sm font-semibold text-blue-900 mb-1">
                    Suggested Conditions from Reports
                  </h4>
                  <p className="text-xs text-blue-700">
                    {suggestedConditions.length} condition(s) found in uploaded reports
                  </p>
                </div>
                <button
                  onClick={onDismissSuggestedConditions}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {suggestedConditions.slice(0, 5).map((sc: any, index: number) => {
                const getSourceBadge = (source: string) => {
                  if (source === 'report_type') {
                    return <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded ml-1">Report Type</span>;
                  } else if (source === 'report') {
                    return <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded ml-1">Report</span>;
                  } else if (source === 'ai_analysis') {
                    return <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded ml-1">AI</span>;
                  }
                  return null;
                };
                
                return (
                  <span
                    key={index}
                    className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium flex items-center"
                  >
                    {sc.condition}
                    {getSourceBadge(sc.source || 'report')}
                  </span>
                );
              })}
                {suggestedConditions.length > 5 && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                    +{suggestedConditions.length - 5} more
                  </span>
                )}
            </div>
            <div className="flex gap-2">
                <button
                  onClick={onAddSuggestedConditions}
                  className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                >
                  Add All ({suggestedConditions.length})
                </button>
                <button
                  onClick={onDismissSuggestedConditions}
                  className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
                >
                  Dismiss
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Diagnosed Conditions & Report Types Management */}
      <div className="border-t border-gray-200 pt-4 mt-4">
          <DiagnosedConditionsAndReportTypes
            member={profile}
            onUpdate={async (updates: any) => {
              try {
                await axios.put(updateProfile, { 
                  id: profile?._id, 
                  ...updates
                });
                if (onProfileUpdate) {
                  onProfileUpdate();
                } else {
                  await refreshProfile();
                }
                queryClient.invalidateQueries({ queryKey: ['getProfileByPhone', profile?.phoneNumber] });
                toast.success('Profile updated successfully');
              } catch (error: any) {
                toast.error(error?.response?.data?.error || 'Failed to update profile');
              }
            }}
            diagnosedConditions={profile?.diagnosedCondition || []}
            reports={allReports}
            onAnalyzeConditions={onAnalyzeConditions}
            onAnalyzeBodyImpact={onAnalyzeBodyImpact}
            isAnalyzingConditions={isAnalyzingConditions}
          />
      </div>

      {/* Members Section - Hidden */}
      {/* {showMembers && membersWithProfiles.length > 0 && (
        <div className="border-t border-gray-200 pt-4 mt-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 text-left">Members</h3>
          <div className="space-y-2">
            {membersWithProfiles.map((member: any) => (
              <div
                key={member._id || member.memberMetaId}
                className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {member.firstName} {member.lastName}
                  </p>
                  <p className="text-xs text-gray-500">{member.relation || 'Member'}</p>
                </div>
                {member.relation !== 'Self' && (
                  <button
                    onClick={() => handleRemoveMember(member._id)}
                    className="ml-2 p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                    title="Remove Member"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )} */}
    </div>
  );
}

