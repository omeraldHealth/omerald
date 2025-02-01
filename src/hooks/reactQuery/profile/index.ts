import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { getMembersById, getProfileById, getProfileByPhone, createProfile, updateProfile, getPendingShares, acceptSharedMember, rejectSharedMember } from '@/components/common/lib/constants/urls';
import { useCreateMutationHook } from '../hookFactory';
import toast from 'react-hot-toast';

export const useGetProfileByPhone = (phoneNumber: string | undefined) => {
  return useQuery({
    queryKey: ['getProfileByPhoneNumber', phoneNumber],
    queryFn: async () => {
      if (!phoneNumber) return null;
      const { data } = await axios.get(getProfileByPhone, { params: { phoneNumber } });
      return data;
    },
    enabled: !!phoneNumber,
    staleTime: 2 * 60 * 1000, // 2 minutes - profile data changes more frequently
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
};

export const useGetProfileById = (id: string | undefined) => {
  return useQuery({
    queryKey: ['getProfileById', id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await axios.get(getProfileById, { params: { id } });
      return data;
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes - profile data changes more frequently
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
};

export const useGetMembersByIds = (members: string[] | undefined) => {
  return useQuery({
    queryKey: ['getMembersById', members?.sort().join(',')],
    queryFn: async () => {
      if (!members || !Array.isArray(members) || members.length === 0) return [];
      const { data } = await axios.post(getMembersById, { members });
      return Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
    },
    enabled: !!members && Array.isArray(members) && members.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes - member data changes more frequently
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
};

export const useAddProfile = (
  onSuccessCallback = () => {},
  onErrorCallback = () => {},
  invalidateCacheKeyArray: string[] = []
) => {
  return useCreateMutationHook({
    onSuccessCallback,
    onErrorCallback,
    invalidateCacheKeyArray: [...invalidateCacheKeyArray, 'getProfileByPhoneNumber'],
    query: createProfile,
  });
};

export const useUpdateProfile = (
  query: string,
  onSuccessCallback = () => {},
  onErrorCallback = () => {},
  invalidateCacheKeyArray: string[] = []
) => {
  return useCreateMutationHook({
    method: 'PUT',
    onSuccessCallback,
    onErrorCallback,
    invalidateCacheKeyArray: [...invalidateCacheKeyArray, 'getProfileByPhoneNumber', 'getMembersById'],
    query,
  });
};

// Hook for fetching pending shared members
export const useGetPendingSharedMembers = (phoneNumber: string | undefined) => {
  return useQuery({
    queryKey: ['getPendingSharedMembers', phoneNumber],
    queryFn: async () => {
      if (!phoneNumber) return { fromTable: [], fromProfile: [], all: [] };
      
      try {
        // Fetch from SharedMembersTable
        const tableResponse = await axios.get(getPendingShares, { params: { phoneNumber } });
        const fromTable = tableResponse.data?.pendingShares || [];
        
        // Fetch from profile.sharedMembers (need to get profile first)
        const profileResponse = await axios.get(getProfileByPhone, { params: { phoneNumber } });
        const profile = profileResponse.data;
        const fromProfile = profile?.sharedMembers?.filter((sm: any) => sm.status === 'pending') || [];
        
        // Fetch member details for profile.sharedMembers
        const profileMemberIds = fromProfile.map((sm: any) => sm.memberId).filter(Boolean);
        let profileMemberDetails: any[] = [];
        if (profileMemberIds.length > 0) {
          try {
            const membersResponse = await axios.post(getMembersById, { members: profileMemberIds });
            profileMemberDetails = membersResponse.data?.data || [];
          } catch (error) {
            console.error('Error fetching member details for profile.sharedMembers:', error);
          }
        }
        
        // Create a map of member details
        const memberDetailsMap = new Map();
        profileMemberDetails.forEach((member: any) => {
          memberDetailsMap.set(String(member._id), member);
        });
        
        // Combine and enrich with member details
        const allPending = [
          ...fromTable.map((share: any) => ({
            ...share,
            fromSharedMembersTable: true,
            shareId: share._id,
            memberId: share.memberId,
            sharer: share.sharer,
            memberDetails: share.memberDetails,
            sharedAt: share.sharedTime,
          })),
          ...fromProfile.map((share: any) => {
            const memberDetails = memberDetailsMap.get(String(share.memberId));
            return {
              ...share,
              fromSharedMembersTable: false,
              shareId: share._id,
              memberId: share.memberId,
              sharer: {
                id: share.sharedBy,
                name: share.sharedByName,
                phoneNumber: share.sharedByPhone,
              },
              memberDetails: memberDetails ? {
                ...memberDetails,
                relation: share.relation || memberDetails.relation,
              } : null,
              sharedAt: share.createdAt,
            };
          }),
        ];
        
        return {
          fromTable,
          fromProfile,
          all: allPending,
        };
      } catch (error: any) {
        console.error('Error fetching pending shared members:', error);
        return { fromTable: [], fromProfile: [], all: [] };
      }
    },
    enabled: !!phoneNumber,
    retry: 1,
    refetchOnWindowFocus: false,
  });
};

// Hook for accepting shared member
export const useAcceptSharedMember = (
  onSuccessCallback = () => {},
  onErrorCallback: (error?: any) => void = () => {}
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      profileId: string;
      shareId: string;
      memberId: string;
      relation: string;
      phoneNumber?: string;
      fromSharedMembersTable: boolean;
    }) => {
      return await axios.post(acceptSharedMember, data);
    },
    onSuccess: (response) => {
      toast.success(response.data?.message || 'Member accepted and added to your profile!');
      queryClient.invalidateQueries({ queryKey: ['getProfileByPhoneNumber'] });
      queryClient.invalidateQueries({ queryKey: ['getMembersById'] });
      queryClient.invalidateQueries({ queryKey: ['getPendingSharedMembers'] });
      onSuccessCallback();
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.error || 'Failed to accept member';
      toast.error(errorMessage);
      onErrorCallback(error);
    },
  });
};

// Hook for rejecting shared member
export const useRejectSharedMember = (
  onSuccessCallback = () => {},
  onErrorCallback: (error?: any) => void = () => {}
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      profileId?: string;
      shareId: string;
      fromSharedMembersTable: boolean;
    }) => {
      return await axios.post(rejectSharedMember, data);
    },
    onSuccess: () => {
      toast.success('Member share rejected');
      queryClient.invalidateQueries({ queryKey: ['getProfileByPhoneNumber'] });
      queryClient.invalidateQueries({ queryKey: ['getPendingSharedMembers'] });
      onSuccessCallback();
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.error || 'Failed to reject member';
      toast.error(errorMessage);
      onErrorCallback(error);
    },
  });
};

