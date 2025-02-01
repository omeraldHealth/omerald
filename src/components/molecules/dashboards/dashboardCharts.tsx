import React, { useMemo, useState } from 'react';
import { BarChart } from '@/components/common/lib/charts/bar';
import { DoughnutChart } from '@/components/common/lib/charts/doughnut';
import { useAuthContext } from '@/components/common/utils/context/auth.context';
import { useGetManyReports } from '@/hooks/reactQuery/reports';
import { useGetMembersByIds, useGetProfileByPhone } from '@/hooks/reactQuery/profile';
import AddReportModal from '@/components/molecules/AddReportModal';
import { useQueryClient } from '@tanstack/react-query';

export const DashboardCharts = () => {
  const { profile } = useAuthContext();
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Get all phone numbers (user + members)
  const allPhoneNumbers = useMemo(() => {
    const numbers: string[] = [];
    if (profile?.phoneNumber) {
      numbers.push(profile.phoneNumber);
    }
    profile?.members?.forEach((member: any) => {
      if (member.phoneNumber) {
        numbers.push(member.phoneNumber);
      }
    });
    return numbers;
  }, [profile]);

  // Fetch reports for all users
  const reportsQuery = useGetManyReports(allPhoneNumbers.length > 0 ? allPhoneNumbers : undefined);
  const reports = reportsQuery.data || [];
  const isLoadingReports = reportsQuery.isLoading;

  // Get member IDs to fetch their profiles
  const memberIds = useMemo(() => {
    const ids: string[] = [];
    if (profile?.members) {
      profile.members.forEach((member: any) => {
        if (member.memberId) {
          ids.push(member.memberId);
        }
      });
    }
    return ids;
  }, [profile]);

  // Fetch member profiles
  const membersProfilesQuery = useGetMembersByIds(memberIds.length > 0 ? memberIds : undefined);
  const membersProfiles = membersProfilesQuery.data || [];

  // Fetch current user profile for diagnosed conditions
  const currentUserProfileQuery = useGetProfileByPhone(profile?.phoneNumber);
  const currentUserProfile = currentUserProfileQuery.data || profile;

  // Prepare reports data per member
  const reportsPerMember = useMemo(() => {
    const data: { [key: string]: { name: string; count: number } } = {};
    
    // Add self - always include even if 0 reports
    if (profile?.phoneNumber) {
      const selfReports = Array.isArray(reports) 
        ? reports.filter((r: any) => {
            // Match by userId - check both exact match and string comparison
            const reportUserId = r?.userId || r?.userPhoneNumber || '';
            return String(reportUserId) === String(profile.phoneNumber);
          })
        : [];
      const selfName = profile?.firstName && profile?.lastName 
        ? `${profile.firstName} ${profile.lastName}`.trim()
        : profile?.firstName || profile?.lastName || 'Self';
      data[profile.phoneNumber] = {
        name: selfName,
        count: selfReports.length,
      };
    }

    // Add members - always include even if 0 reports
    if (profile?.members && Array.isArray(profile.members)) {
      profile.members.forEach((memberMeta: any) => {
        if (memberMeta.phoneNumber) {
          const memberReports = Array.isArray(reports)
            ? reports.filter((r: any) => {
                // Match by userId - check both exact match and string comparison
                const reportUserId = r?.userId || r?.userPhoneNumber || '';
                return String(reportUserId) === String(memberMeta.phoneNumber);
              })
            : [];
          const memberProfile = membersProfiles.find((mp: any) => 
            String(mp?._id) === String(memberMeta.memberId) || 
            String(mp?.id) === String(memberMeta.memberId)
          );
          const memberName = memberProfile
            ? `${memberProfile.firstName || ''} ${memberProfile.lastName || ''}`.trim() || memberMeta.phoneNumber
            : memberMeta.name || memberMeta.phoneNumber;
          
          data[memberMeta.phoneNumber] = {
            name: memberName,
            count: memberReports.length,
          };
        }
      });
    }

    return data;
  }, [reports, profile, membersProfiles]);

  // Prepare diagnosed conditions data per member
  const conditionsPerMember = useMemo(() => {
    const data: { [key: string]: { name: string; count: number } } = {};
    
    // Add self - always include even if 0 conditions
    if (currentUserProfile?.phoneNumber) {
      const conditions = Array.isArray(currentUserProfile.diagnosedCondition) 
        ? currentUserProfile.diagnosedCondition 
        : [];
      const selfName = currentUserProfile?.firstName && currentUserProfile?.lastName 
        ? `${currentUserProfile.firstName} ${currentUserProfile.lastName}`.trim()
        : currentUserProfile?.firstName || currentUserProfile?.lastName || 'Self';
      data[currentUserProfile.phoneNumber] = {
        name: selfName,
        count: conditions.length,
      };
    }

    // Add members - always include even if 0 conditions
    if (profile?.members && Array.isArray(profile.members)) {
      profile.members.forEach((memberMeta: any) => {
        if (memberMeta.phoneNumber && memberMeta.memberId) {
          const memberProfile = membersProfiles.find((mp: any) => 
            String(mp?._id) === String(memberMeta.memberId) || 
            String(mp?.id) === String(memberMeta.memberId)
          );
          if (memberProfile) {
            const conditions = Array.isArray(memberProfile.diagnosedCondition) 
              ? memberProfile.diagnosedCondition 
              : [];
            const memberName = `${memberProfile.firstName || ''} ${memberProfile.lastName || ''}`.trim() || memberMeta.phoneNumber;
            data[memberMeta.phoneNumber] = {
              name: memberName,
              count: conditions.length,
            };
          } else {
            // Include member even if profile not loaded yet
            const memberName = memberMeta.name || memberMeta.phoneNumber;
            data[memberMeta.phoneNumber] = {
              name: memberName,
              count: 0,
            };
          }
        }
      });
    }

    return data;
  }, [currentUserProfile, membersProfiles, profile]);

  return (
    <div className="w-full max-w-full">
      <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 lg:gap-6 w-full">
        <div className="w-full lg:w-[65%] min-h-[250px] sm:min-h-[280px] lg:min-h-[320px] xl:min-h-[360px] bg-white p-3 sm:p-4 lg:p-6 border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
          <div className="flex items-center justify-between mb-2 sm:mb-3 lg:mb-4">
            <h3 className="text-xs sm:text-sm lg:text-base font-semibold text-gray-900 flex items-center gap-2">
              <div className="w-1 h-4 sm:h-5 bg-gray-700 rounded-full"></div>
              <span className="truncate">Reports Uploaded / Member</span>
            </h3>
          </div>
          <div className="h-[180px] sm:h-[220px] lg:h-[260px] xl:h-[280px] w-full overflow-x-auto overflow-y-hidden">
            {isLoadingReports ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-700"></div>
              </div>
            ) : (
              <div className="w-full min-w-[280px] sm:min-w-[300px] h-full">
                <BarChart reportsPerMember={reportsPerMember} />
              </div>
            )}
          </div>
        </div>
        <div className="w-full lg:w-[31%] min-h-[250px] sm:min-h-[280px] lg:min-h-[320px] xl:min-h-[360px] bg-white p-3 sm:p-4 lg:p-6 border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
          <div className="flex items-center justify-between mb-2 sm:mb-3 lg:mb-4">
            <h3 className="text-xs sm:text-sm lg:text-base font-semibold text-gray-900 flex items-center gap-2">
              <div className="w-1 h-4 sm:h-5 bg-gray-700 rounded-full"></div>
              <span className="truncate">Diagnosed Conditions / Member</span>
            </h3>
          </div>
          <div className="h-[180px] sm:h-[220px] lg:h-[260px] xl:h-[280px] w-full">
            <DoughnutChart conditionsPerMember={conditionsPerMember} />
          </div>
        </div>
      </div>

      {/* Add Report Modal */}
      <AddReportModal
        visible={showAddModal}
        setVisible={setShowAddModal}
        onReportAdded={() => {
          queryClient.invalidateQueries({ queryKey: ['getManyReports'] });
        }}
      />
    </div>
  );
};

