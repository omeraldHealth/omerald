'use client';

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '@/components/common/utils/context/auth.context';
import { useGetProfileByPhone, useGetPendingSharedMembers, useAcceptSharedMember, useRejectSharedMember } from '@/hooks/reactQuery/profile';
import { useGetMembersByIds } from '@/hooks/reactQuery/profile';
import { getMembersLimit, getSubscriptionPlan } from '@/lib/utils/subscription';
import MemberTable from '@/components/molecules/MemberTable';
import MemberCard from '@/components/molecules/MemberCard';
import AddMemberModal from '@/components/molecules/AddMemberModal';
import ShareMemberModal from '@/components/molecules/ShareMemberModal';
import { updateProfile } from '@/components/common/lib/constants/urls';
import toast from 'react-hot-toast';
import { CheckCircleIcon, XCircleIcon, ClockIcon, UserIcon, FunnelIcon, MagnifyingGlassIcon, Bars3Icon, Squares2X2Icon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import moment from 'moment';
import { useGetManyReports } from '@/hooks/reactQuery/reports';

export default function Members() {
  const [displaySharedMember, setDisplaySharedMember] = useState(false);

  function handleToggle() {
    setDisplaySharedMember(!displaySharedMember);
  }

  return (
    <>
      {/* <div className="flex items-center mb-6">
        <input
          type="checkbox"
          checked={displaySharedMember}
          onChange={handleToggle}
          className="w-4 h-4 text-indigo-600 rounded"
        />
        <p className="mx-2 font-light text-md">View Shared Profiles</p>
      </div> */}
      {displaySharedMember ? <SharedMembers /> : <UserMembers />}
    </>
  );
}

function UserMembers() {
  const [searchString, setSearch] = useState('');
  const [editingMember, setEditingMember] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [sharingMember, setSharingMember] = useState<any>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [subscriptionFilter, setSubscriptionFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'adult' | 'pediatric'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const { profile, refreshProfile, phoneNumber } = useAuthContext();
  const profileQuery = useGetProfileByPhone(profile?.phoneNumber);
  const profileData = profileQuery.data || profile;
  const queryClient = useQueryClient();

  // Fetch reports for all members
  const users: string[] = [];
  if (profileData?.phoneNumber) {
    users.push(profileData.phoneNumber);
  }
  profileData?.members?.forEach((member: any) => {
    if (member.phoneNumber) {
      users.push(member.phoneNumber);
    }
  });
  const { data: allReports = [] } = useGetManyReports(users.length > 0 ? users : undefined);

  // Fetch pending shared members
  const { data: pendingMembersData, isLoading: isLoadingPending } = useGetPendingSharedMembers(
    phoneNumber || undefined
  );
  const pendingMembers = pendingMembersData?.all || [];

  // Accept/Reject mutations
  const acceptMember = useAcceptSharedMember(
    () => {
      refreshProfile();
    },
    () => {}
  );

  const rejectMember = useRejectSharedMember(
    () => {
      refreshProfile();
    },
    () => {}
  );

  // Extract member IDs from the members array
  const memberIds = profileData?.members?.map((member: any) => member.memberId) || [];
  
  // Add the current user's profile ID if it exists
  if (profileData?._id) {
    memberIds.push(profileData._id);
  }

  const memberProfile = useGetMembersByIds(memberIds.length > 0 ? memberIds : undefined);
  const [members, setMembers] = useState<any[]>([]);

  // Collect sharedWith IDs for React Query hook
  const sharedWithIds = useMemo(() => {
    const ids = new Set<string>();
    if (profileData?.members) {
      profileData.members.forEach((memberMeta: any) => {
        if (memberMeta.sharedWith && Array.isArray(memberMeta.sharedWith)) {
          memberMeta.sharedWith.forEach((id: string) => {
            // Only add if it looks like a profile ID (not a phone number)
            if (id && !id.startsWith('+') && id.length > 10) {
              ids.add(id);
            }
          });
        }
      });
    }
    return Array.from(ids);
  }, [profileData?.members]);

  // Use React Query hook for fetching shared profiles
  const { data: sharedProfilesData = [] } = useGetMembersByIds(
    sharedWithIds.length > 0 ? sharedWithIds : undefined
  );

  // Convert to Map for easy lookup
  const sharedWithProfiles = useMemo(() => {
            const profileMap = new Map<string, any>();
    sharedProfilesData.forEach((profile: any) => {
              profileMap.set(String(profile._id), profile);
            });
    return profileMap;
  }, [sharedProfilesData]);

  useEffect(() => {
    if (memberProfile.data && profileData) {
      // Create a map of member metadata from profileData.members array
      // Convert IDs to strings for proper comparison
      const memberMetadataMap = new Map();
      profileData.members?.forEach((memberMeta: any) => {
        const memberIdStr = String(memberMeta.memberId);
        memberMetadataMap.set(memberIdStr, {
          relation: memberMeta.relation,
          phoneNumber: memberMeta.phoneNumber,
          sharedWith: memberMeta.sharedWith || [],
          memberMetaId: memberMeta._id, // The _id from the members array entry
        });
      });

      // Map fetched profiles with their metadata from profileData.members
      const membersWithMetadata = memberProfile.data.map((memberProfile: any) => {
        const profileIdStr = String(memberProfile._id);
        const currentUserIdStr = String(profileData._id);
        
        // Check if this is the current user's profile
        if (profileIdStr === currentUserIdStr) {
          // For Self members, check if there's a member entry in the members array
          // The sharedWith data should come from the members array entry, not profileData.sharedWith
          const selfMemberMetadata = memberMetadataMap.get(profileIdStr);
          const sharedWithSource = selfMemberMetadata?.sharedWith || profileData.sharedWith || [];
          
          // Enrich sharedWith for current user's profile
          const enrichedSharedWith = sharedWithSource
            .filter((item: any) => {
              // Filter out objects that look like condition objects (have condition, date, _id but no sharedProfileId)
              if (typeof item === 'object' && item !== null) {
                // If it has condition/date/_id but no sharedProfileId, it's likely a condition object, not a share
                if (item.condition && item.date && item._id && !item.sharedProfileId) {
                  return false;
                }
                // Only allow objects with sharedProfileId or valid share objects
                return item.sharedProfileId || typeof item === 'string';
              }
              return true;
            })
            .map((item: any) => {
              // Handle old format (object with sharedProfileId)
              if (typeof item === 'object' && item.sharedProfileId) {
                const sharedProfile = sharedWithProfiles.get(item.sharedProfileId);
                if (sharedProfile) {
                  const isDoctor = sharedProfile.isDoctor && sharedProfile.doctorApproved;
                  const name = `${sharedProfile.firstName} ${sharedProfile.lastName}`.trim();
                  return {
                    id: item.sharedProfileId,
                    type: 'profile',
                    display: isDoctor ? `Dr. ${name}` : name,
                    profile: sharedProfile,
                    isDoctor: isDoctor,
                  };
                }
                return {
                  id: item.sharedProfileId,
                  type: 'profile',
                  display: item.name || item.sharedProfileId,
                };
              }
              // Handle string format
              if (typeof item === 'string') {
                if (item.startsWith('+')) {
                  return { id: item, type: 'phone', display: item };
                }
                const sharedProfile = sharedWithProfiles.get(item);
                if (sharedProfile) {
                  const isDoctor = sharedProfile.isDoctor && sharedProfile.doctorApproved;
                  const name = `${sharedProfile.firstName} ${sharedProfile.lastName}`.trim();
                  return {
                    id: item,
                    type: 'profile',
                    display: isDoctor ? `Dr. ${name}` : name,
                    profile: sharedProfile,
                    isDoctor: isDoctor,
                  };
                }
                return { id: item, type: 'profile', display: item };
              }
              // Fallback: if it's an unexpected object, skip it (shouldn't reach here after filter)
              return null;
            })
            .filter((item: any) => item !== null);

          return {
            ...memberProfile,
            relation: selfMemberMetadata?.relation || 'Self',
            phoneNumber: selfMemberMetadata?.phoneNumber || memberProfile.phoneNumber,
            sharedWith: enrichedSharedWith,
            memberMetaId: selfMemberMetadata?.memberMetaId,
            // Explicitly preserve isPediatric field
            isPediatric: memberProfile.isPediatric,
          };
        }

        // Get metadata from the members array
        const metadata = memberMetadataMap.get(profileIdStr);
        
        if (metadata) {
          // Enrich sharedWith with profile data
          const enrichedSharedWith = (metadata.sharedWith || [])
            .filter((id: any) => {
              // Filter out objects that look like condition objects
              if (typeof id === 'object' && id !== null) {
                if (id.condition && id.date && id._id && !id.sharedProfileId) {
                  return false;
                }
                // Allow objects with sharedProfileId or convert to string
                return id.sharedProfileId || typeof id === 'string';
              }
              return typeof id === 'string';
            })
            .map((id: any) => {
              // Handle object format with sharedProfileId
              if (typeof id === 'object' && id.sharedProfileId) {
                const sharedProfile = sharedWithProfiles.get(id.sharedProfileId);
                if (sharedProfile) {
                  const isDoctor = sharedProfile.isDoctor && sharedProfile.doctorApproved;
                  const name = `${sharedProfile.firstName} ${sharedProfile.lastName}`.trim();
                  return {
                    id: id.sharedProfileId,
                    type: 'profile',
                    display: isDoctor ? `Dr. ${name}` : name,
                    profile: sharedProfile,
                    isDoctor: isDoctor,
                  };
                }
                return {
                  id: id.sharedProfileId,
                  type: 'profile',
                  display: id.name || id.sharedProfileId,
                };
              }
              // Convert to string if it's an object without sharedProfileId
              const idString = typeof id === 'string' ? id : String(id?._id || id);
              
              // If it's a phone number, return as is
              if (idString.startsWith('+')) {
                return { id: idString, type: 'phone', display: idString };
              }
              // If it's a profile ID, try to get the profile
              const sharedProfile = sharedWithProfiles.get(idString);
              if (sharedProfile) {
                const isDoctor = sharedProfile.isDoctor && sharedProfile.doctorApproved;
                const name = `${sharedProfile.firstName} ${sharedProfile.lastName}`.trim();
                return {
                  id: idString,
                  type: 'profile',
                  display: isDoctor ? `Dr. ${name}` : name,
                  profile: sharedProfile,
                  isDoctor: isDoctor,
                };
              }
              // Fallback to ID if profile not found
              return { id: idString, type: 'profile', display: idString };
            })
            .filter((item: any) => item !== null);

          // Merge profile data with member metadata
          return {
            ...memberProfile,
            relation: metadata.relation || 'N/A',
            phoneNumber: metadata.phoneNumber || memberProfile.phoneNumber,
            sharedWith: enrichedSharedWith,
            memberMetaId: metadata.memberMetaId, // Store the members array entry _id
            // Explicitly preserve isPediatric field
            isPediatric: memberProfile.isPediatric,
          };
        }

        // Fallback if metadata not found
        return {
          ...memberProfile,
          relation: memberProfile.userType === 'Primary' ? 'Self' : 'N/A',
          sharedWith: [],
          // Explicitly preserve isPediatric field
          isPediatric: memberProfile.isPediatric,
        };
      });

      setMembers(membersWithMetadata);
    }
  }, [memberProfile.data, memberProfile.isLoading, profileData, sharedWithProfiles]);

  useEffect(() => {
    if (!memberProfile.isLoading && profileData && (!profileData.members || profileData.members.length === 0)) {
      // If no members, show only the current user
      if (profileData._id) {
        setMembers([{
          ...profileData,
          relation: 'Self',
        }]);
      } else {
        setMembers([]);
      }
    }
  }, [memberProfile.data, memberProfile.isLoading, profileData]);

  const handleFilterMembers = (searchValue: string) => {
    setSearch(searchValue);
  };

  const handleEdit = (memberId: string) => {
    const member = members.find((m) => m._id === memberId);
    if (member) {
      setEditingMember(member);
      setShowEditModal(true);
    } else {
      toast.error('Member not found');
    }
  };

  const handleDelete = async (memberId: string) => {
    const member = members.find((m) => m._id === memberId);
    if (!member || !profileData) {
      toast.error('Member not found');
      return;
    }

    // Don't allow deleting self
    if (member.relation === 'Self') {
      toast.error('Cannot delete yourself');
      return;
    }

    if (!confirm(`Are you sure you want to remove ${member.firstName} ${member.lastName} from your profile? This will only remove them from your members list, not delete their account from Omerald.`)) {
      return;
    }

    try {
      // Remove the member from the profile.members array
      const updatedMembers = profileData.members.filter((m: any) => {
        // Match by memberMetaId or by memberId
        return !(
          (m._id?.toString() === member.memberMetaId?.toString()) ||
          (m.memberId?.toString() === member._id?.toString())
        );
      });

      // Update the profile
      const response = await axios.put(
        updateProfile,
        { id: profileData._id, members: updatedMembers }
      );

      if (response.data) {
        toast.success('Member removed successfully!');
        refreshProfile();
        queryClient.invalidateQueries({ queryKey: ['getProfileByPhoneNumber'] });
        queryClient.invalidateQueries({ queryKey: ['getMembersById'] });
      } else {
        toast.error('Failed to remove member');
      }
    } catch (error: any) {
      console.error('Error deleting member:', error);
      toast.error(error?.response?.data?.error || 'Failed to remove member');
    }
  };

  const handleMemberUpdated = () => {
    // This will be called after successful edit
    refreshProfile();
  };

  const handleShare = (memberId: string) => {
    const member = members.find((m) => m._id === memberId);
    if (member) {
      setSharingMember(member);
      setShowShareModal(true);
    }
  };

  const handleMemberShared = () => {
    // This will be called after successful share
    refreshProfile();
  };

  // Helper function to calculate age from DOB
  const calculateAge = (dob: string | Date): number | null => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Add reports count to each member and ensure isPediatric is set correctly
  const membersWithReports = useMemo(() => {
    return members.map((member) => {
      const memberPhone = member.phoneNumber;
      const memberReports = Array.isArray(allReports) 
        ? allReports.filter((r: any) => {
            const reportUserId = r?.userId || r?.userPhoneNumber || '';
            return String(reportUserId) === String(memberPhone);
          })
        : [];
      
      // Ensure isPediatric is set correctly - calculate from DOB if missing or incorrect
      let isPediatric: boolean;
      if (member.isPediatric === true || member.isPediatric === 'true') {
        isPediatric = true;
      } else if (member.isPediatric === false || member.isPediatric === 'false') {
        isPediatric = false;
      } else if (member.dob) {
        // Calculate from DOB if isPediatric is not set
        const age = calculateAge(member.dob);
        isPediatric = age !== null && age < 2;
      } else {
        // Default to false if no DOB and no isPediatric value
        isPediatric = false;
      }
      
      return {
        ...member,
        reports: memberReports,
        isPediatric: isPediatric, // Ensure boolean value
      };
    });
  }, [members, allReports]);

  // Filter and sort members
  const filteredAndSortedMembers = useMemo(() => {
    let filtered = membersWithReports;

    // Search filter
    if (searchString) {
      filtered = filtered.filter((member) => {
        const fullName = `${member.firstName || ''} ${member.lastName || ''}`.toLowerCase();
        return fullName.includes(searchString.toLowerCase());
      });
    }

    // Subscription filter
    if (subscriptionFilter !== 'all') {
      filtered = filtered.filter((member) => {
        if (subscriptionFilter === 'paid') {
          return member.subscription && member.subscription !== 'Free';
        } else {
          return !member.subscription || member.subscription === 'Free';
        }
      });
    }

    // Type filter (Adult/Pediatric)
    if (typeFilter !== 'all') {
      filtered = filtered.filter((member) => {
        // Handle boolean, string, or undefined values
        const isPediatric = member.isPediatric === true || member.isPediatric === 'true';
        if (typeFilter === 'pediatric') {
          return isPediatric;
        } else {
          // For 'adult' filter, show members that are NOT pediatric
          return !isPediatric;
        }
      });
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === 'name') {
        const nameA = `${a.firstName || ''} ${a.lastName || ''}`.toLowerCase();
        const nameB = `${b.firstName || ''} ${b.lastName || ''}`.toLowerCase();
        return nameA.localeCompare(nameB);
      } else if (sortBy === 'newest') {
        const dateA = new Date(a.createdDate || a._id || 0).getTime();
        const dateB = new Date(b.createdDate || b._id || 0).getTime();
        return dateB - dateA;
      } else {
        const dateA = new Date(a.createdDate || a._id || 0).getTime();
        const dateB = new Date(b.createdDate || b._id || 0).getTime();
        return dateA - dateB;
      }
    });

    return filtered;
  }, [membersWithReports, searchString, subscriptionFilter, typeFilter, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedMembers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedMembers = filteredAndSortedMembers.slice(startIndex, endIndex);

  // Update page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchString, subscriptionFilter, typeFilter, sortBy]);

  const handleAcceptPendingMember = async (pendingMember: any) => {
    if (!profileData?._id || !pendingMember.memberDetails) {
      toast.error('Member details not available');
      return;
    }

    const memberDetails = pendingMember.memberDetails;
    acceptMember.mutate({
      profileId: profileData._id,
      shareId: pendingMember.shareId,
      memberId: pendingMember.memberId,
      relation: memberDetails.relation || 'Family',
      phoneNumber: memberDetails.phoneNumber || '',
      fromSharedMembersTable: pendingMember.fromSharedMembersTable,
    });
  };

  const handleRejectPendingMember = async (pendingMember: any) => {
    if (!confirm('Are you sure you want to reject this member share? It will be removed from your pending list.')) {
      return;
    }

    rejectMember.mutate({
      profileId: profileData?._id,
      shareId: pendingMember.shareId,
      fromSharedMembersTable: pendingMember.fromSharedMembersTable,
    });
  };

  return (
    <div className="w-full overflow-x-hidden space-y-6">
      {/* Pending Members Section */}
      {pendingMembers.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border-2 border-amber-200 p-4 sm:p-6 w-full overflow-hidden shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <ClockIcon className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                  Pending Member Shares
                </h3>
                <p className="text-sm text-gray-600 mt-0.5">
                  {pendingMembers.length} member{pendingMembers.length !== 1 ? 's' : ''} awaiting your review
                </p>
              </div>
            </div>
            <div className="px-3 py-1.5 bg-amber-200 rounded-full">
              <span className="text-sm font-semibold text-amber-800">{pendingMembers.length}</span>
            </div>
          </div>

          {isLoadingPending ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingMembers.map((pendingMember: any, index: number) => {
                const memberDetails = pendingMember.memberDetails;
                const sharer = pendingMember.sharer;
                
                if (!memberDetails) return null;

                const memberName = memberDetails.firstName && memberDetails.lastName
                  ? `${memberDetails.firstName} ${memberDetails.lastName}`
                  : memberDetails.phoneNumber || 'Unknown Member';
                
                return (
                  <div
                    key={pendingMember.shareId || index}
                    className="bg-white rounded-lg border border-amber-200 p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
                            <UserIcon className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 text-base mb-1">
                              {memberName}
                            </h4>
                            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 mb-2">
                              <span className="flex items-center gap-1">
                                <span className="font-medium">Shared by:</span>
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                                  {sharer?.name || 'Unknown User'}
                                </span>
                              </span>
                              <span>•</span>
                              <span>{moment(pendingMember.sharedAt).fromNow()}</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                                {memberDetails.relation || 'Family Member'}
                              </span>
                              {memberDetails.phoneNumber && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                                  {memberDetails.phoneNumber}
                                </span>
                              )}
                              {memberDetails.dob && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                                  DOB: {moment(memberDetails.dob).format('MMM DD, YYYY')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                        <button
                          onClick={() => handleAcceptPendingMember(pendingMember)}
                          disabled={acceptMember.isPending}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <CheckCircleIcon className="w-4 h-4" />
                          <span>{acceptMember.isPending ? 'Accepting...' : 'Accept'}</span>
                        </button>
                        <button
                          onClick={() => handleRejectPendingMember(pendingMember)}
                          disabled={rejectMember.isPending}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <XCircleIcon className="w-4 h-4" />
                          <span>{rejectMember.isPending ? 'Rejecting...' : 'Reject'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Members Remaining Indicator */}
      {(() => {
        const subscription = profileData?.subscription || 'Free';
        const membersLimit = getMembersLimit(subscription);
        // Count only actual members (exclude null/undefined entries)
        const validMembers = (profileData?.members || []).filter((m: any) => m && (m.memberId || m.phoneNumber));
        const currentMembersCount = validMembers.length;
        const membersRemaining = Math.max(0, membersLimit - currentMembersCount);
        const subscriptionPlan = getSubscriptionPlan(subscription);
        
        console.log('Members count calculation:', {
          subscription,
          membersLimit,
          totalMembersArray: profileData?.members?.length || 0,
          validMembersCount: currentMembersCount,
          membersRemaining,
        });
        
        return (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <UserIcon className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700">Members Remaining</h3>
                <p className="text-2xl font-bold text-gray-900">{membersRemaining} / {membersLimit}</p>
                <p className="text-xs text-gray-500 mt-1">{subscriptionPlan.name} Plan</p>
              </div>
            </div>
            {membersRemaining === 0 && (
              <div className="px-4 py-2 bg-orange-100 border border-orange-300 rounded-lg">
                <p className="text-sm font-semibold text-orange-800">Limit Reached</p>
              </div>
            )}
          </div>
        );
      })()}

      {/* Members Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 sm:p-6 w-full overflow-hidden">
        {/* Header with Search and Filters */}
        <div className="mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center gap-2">
              <span>👥 Members ({filteredAndSortedMembers.length})</span>
            </h3>
            <button
              onClick={() => {
                setEditingMember(null);
                setShowEditModal(true);
              }}
              className="px-4 py-2 bg-[#40189D] text-white rounded-lg hover:bg-[#5019AD] transition-colors flex items-center justify-center gap-2 text-sm sm:text-base whitespace-nowrap flex-shrink-0"
            >
              <span className="text-lg sm:text-xl">+</span>
              <span>Add Member</span>
            </button>
          </div>

          {/* Search Bar and Filter Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1 min-w-0">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search by Name</label>
              <input
                type="search"
                placeholder="Search by Name"
                value={searchString}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40189D] text-sm sm:text-base"
              />
              <svg
                className="absolute left-3 top-9 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="flex gap-2 items-end">
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm font-medium">
                <FunnelIcon className="w-4 h-4" />
                FILTER
              </button>
              <button className="px-4 py-2 bg-[#40189D] text-white rounded-lg hover:bg-[#5019AD] transition-colors flex items-center gap-2 text-sm font-medium">
                <MagnifyingGlassIcon className="w-4 h-4" />
                FIND
              </button>
            </div>
          </div>

          {/* Filters and View Options */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Showing <span className="font-semibold text-gray-900">{filteredAndSortedMembers.length}</span> of <span className="font-semibold text-gray-900">{members.length}</span> members
              </span>
              <span className="text-xs text-gray-500">Based on your Filters</span>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              {/* Subscription Filters */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSubscriptionFilter('free')}
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${
                    subscriptionFilter === 'free' 
                      ? 'border-[#40189D] bg-[#40189D]' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {subscriptionFilter === 'free' && (
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
                <span className="text-sm text-gray-700">Free Member</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSubscriptionFilter('paid')}
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${
                    subscriptionFilter === 'paid' 
                      ? 'border-[#40189D] bg-[#40189D]' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {subscriptionFilter === 'paid' && (
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
                <span className="text-sm text-gray-700">Paid Member</span>
              </div>
              {/* Type Filters */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTypeFilter(typeFilter === 'adult' ? 'all' : 'adult')}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    typeFilter === 'adult' 
                      ? 'bg-[#40189D] text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Adult
                </button>
                <button
                  onClick={() => setTypeFilter(typeFilter === 'pediatric' ? 'all' : 'pediatric')}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    typeFilter === 'pediatric' 
                      ? 'bg-[#40189D] text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Pediatric
                </button>
              </div>
              {/* Sort and View */}
              <div className="flex items-center gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#40189D]"
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="name">Name</option>
                </select>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'list' ? 'bg-[#40189D] text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  <Bars3Icon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'grid' ? 'bg-[#40189D] text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  <Squares2X2Icon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Members Grid/List View */}
        <div className="w-full">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {paginatedMembers.map((member) => (
                <MemberCard key={member._id} member={member} onShare={handleShare} onDelete={handleDelete} />
              ))}
            </div>
          ) : (
            <div className="w-full">
              <MemberTable 
                members={paginatedMembers} 
                onEdit={handleEdit}
                onDelete={handleDelete}
                onShare={handleShare}
              />
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-6 pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              Showing <span className="font-semibold">{startIndex + 1}</span> to <span className="font-semibold">{Math.min(endIndex, filteredAndSortedMembers.length)}</span> from <span className="font-semibold">{filteredAndSortedMembers.length}</span> data
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                <ChevronLeftIcon className="w-4 h-4 inline" /> Previous
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === pageNum
                        ? 'bg-[#40189D] text-white'
                        : 'border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                Next <ChevronRightIcon className="w-4 h-4 inline" />
              </button>
            </div>
          </div>
        )}
      </div>
      
      {showEditModal && (
        <AddMemberModal
          visible={showEditModal}
          setVisible={setShowEditModal}
          profile={profileData}
          editingMember={editingMember}
          onMemberUpdated={handleMemberUpdated}
        />
      )}
      {showShareModal && sharingMember && (
        <ShareMemberModal
          visible={showShareModal}
          setVisible={setShowShareModal}
          member={sharingMember}
          profile={profileData}
          onMemberShared={handleMemberShared}
        />
      )}
    </div>
  );
}

function SharedMembers() {
  const { profile, phoneNumber } = useAuthContext();
  const profileQuery = useGetProfileByPhone(profile?.phoneNumber);
  const profileData = profileQuery.data || profile;
  const queryClient = useQueryClient();

  // Fetch pending shared members
  const { data: pendingMembersData, isLoading: isLoadingPending } = useGetPendingSharedMembers(
    phoneNumber || undefined
  );
  const pendingMembers = pendingMembersData?.all || [];

  // Accept/Reject mutations
  const acceptMember = useAcceptSharedMember(
    () => {
      queryClient.invalidateQueries({ queryKey: ['getProfileByPhoneNumber'] });
      queryClient.invalidateQueries({ queryKey: ['getMembersById'] });
    },
    () => {}
  );

  const rejectMember = useRejectSharedMember(
    () => {
      queryClient.invalidateQueries({ queryKey: ['getProfileByPhoneNumber'] });
    },
    () => {}
  );

  const handleAcceptPendingMember = async (pendingMember: any) => {
    if (!profileData?._id || !pendingMember.memberDetails) {
      toast.error('Member details not available');
      return;
    }

    const memberDetails = pendingMember.memberDetails;
    acceptMember.mutate({
      profileId: profileData._id,
      shareId: pendingMember.shareId,
      memberId: pendingMember.memberId,
      relation: memberDetails.relation || 'Family',
      phoneNumber: memberDetails.phoneNumber || '',
      fromSharedMembersTable: pendingMember.fromSharedMembersTable,
    });
  };

  const handleRejectPendingMember = async (pendingMember: any) => {
    if (!confirm('Are you sure you want to reject this member share? It will be removed from your pending list.')) {
      return;
    }

    rejectMember.mutate({
      profileId: profileData?._id,
      shareId: pendingMember.shareId,
      fromSharedMembersTable: pendingMember.fromSharedMembersTable,
    });
  };

  return (
    <div className="w-full overflow-x-hidden">
      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 w-full overflow-hidden">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-6">
          Shared Members ({pendingMembers.length})
        </h3>

        {isLoadingPending ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
          </div>
        ) : pendingMembers.length > 0 ? (
          <div className="space-y-4">
            {pendingMembers.map((pendingMember: any, index: number) => {
              const memberDetails = pendingMember.memberDetails;
              const sharer = pendingMember.sharer;
              
              if (!memberDetails) return null;

              const memberName = memberDetails.firstName && memberDetails.lastName
                ? `${memberDetails.firstName} ${memberDetails.lastName}`
                : memberDetails.phoneNumber || 'Unknown Member';
              
              return (
                <div
                  key={pendingMember.shareId || index}
                  className="bg-gray-50 rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
                          <UserIcon className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 text-base mb-1">
                            {memberName}
                          </h4>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 mb-2">
                            <span className="flex items-center gap-1">
                              <span className="font-medium">Shared by:</span>
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                                {sharer?.name || 'Unknown User'}
                              </span>
                            </span>
                            <span>•</span>
                            <span>{moment(pendingMember.sharedAt).fromNow()}</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                              {memberDetails.relation || 'Family Member'}
                            </span>
                            {memberDetails.phoneNumber && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                                {memberDetails.phoneNumber}
                              </span>
                            )}
                            {memberDetails.dob && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                                DOB: {moment(memberDetails.dob).format('MMM DD, YYYY')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                      <button
                        onClick={() => handleAcceptPendingMember(pendingMember)}
                        disabled={acceptMember.isPending}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <CheckCircleIcon className="w-4 h-4" />
                        <span>{acceptMember.isPending ? 'Accepting...' : 'Accept'}</span>
                      </button>
                      <button
                        onClick={() => handleRejectPendingMember(pendingMember)}
                        disabled={rejectMember.isPending}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <XCircleIcon className="w-4 h-4" />
                        <span>{rejectMember.isPending ? 'Rejecting...' : 'Reject'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <UserIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-lg font-medium">No pending member shares</p>
            <p className="text-sm text-gray-400 mt-2">All member shares have been processed</p>
          </div>
        )}
      </div>
    </div>
  );
}
