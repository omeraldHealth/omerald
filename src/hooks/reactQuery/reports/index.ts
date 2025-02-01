import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { getManyReports, getReports, getReportsByMembers, insertReport, updateReport, getPendingSharedReports } from '@/components/common/lib/constants/urls';
import { useCreateMutationHook } from '../hookFactory';
import { getSharedReports, acceptSharedReport, SharedReport, getReportsFromDC, ReportWithSharedDetails } from '@/services/reportSharingService';
import toast from 'react-hot-toast';

export const useGetReports = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['getReports', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data } = await axios.get(getReports, { params: { userId } });
      return Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
    },
    enabled: !!userId,
    staleTime: 1 * 60 * 1000, // 1 minute - reports change frequently
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
};

export const useGetManyReports = (users: string[] | undefined) => {
  return useQuery({
    queryKey: ['getManyReports', users?.sort().join(',')],
    queryFn: async () => {
      if (!users || !Array.isArray(users) || users.length === 0) return [];
      const { data } = await axios.post(getManyReports, { users });
      return Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
    },
    enabled: !!users && Array.isArray(users) && users.length > 0,
    staleTime: 1 * 60 * 1000, // 1 minute - reports change frequently
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
};

export const useGetReportsByMembers = (memberId: string | undefined) => {
  return useQuery({
    queryKey: ['getReportsByMember', memberId],
    queryFn: async () => {
      if (!memberId) return [];
      const { data } = await axios.get(getReportsByMembers, { params: { memberId } });
      return Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
    },
    enabled: !!memberId,
    staleTime: 1 * 60 * 1000, // 1 minute - reports change frequently
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
};

export const useAddReport = (
  onSuccessCallback = () => {},
  onErrorCallback = () => {},
  invalidateCacheKeyArray: string[] = []
) => {
  return useCreateMutationHook({
    onSuccessCallback,
    onErrorCallback,
    invalidateCacheKeyArray: [...invalidateCacheKeyArray, 'getManyReports', 'getReports'],
    query: insertReport,
  });
};

export const useUpdateReports = (
  updateReportUrl: string,
  onSuccessCallback = () => {},
  onErrorCallback = () => {},
  invalidateCacheKeyArray: string[] = []
) => {
  return useCreateMutationHook({
    method: 'PUT',
    onSuccessCallback,
    onErrorCallback,
    invalidateCacheKeyArray: [...invalidateCacheKeyArray, 'getManyReports', 'getReports'],
    query: updateReportUrl,
  });
};

// Shared Reports Hooks (DC App Integration)
export const useGetSharedReports = (
  phoneNumber: string | undefined,
  status?: 'pending' | 'accepted'
) => {
  return useQuery({
    queryKey: ['getSharedReports', phoneNumber, status],
    queryFn: async () => {
      if (!phoneNumber) return { reports: [], total: 0, pending: 0, accepted: 0 };
      try {
        const data = await getSharedReports(phoneNumber, status);
        console.log("data", data);
        return data;
      } catch (error: any) {
        console.error('Error fetching shared reports:', error);
        // Return empty data on error instead of throwing
        return { reports: [], total: 0, pending: 0, accepted: 0 };
      }
    },
    enabled: !!phoneNumber,
    retry: 1, // Only retry once for external API calls
    refetchOnWindowFocus: false,
  });
};

export const useAcceptSharedReport = (
  onSuccessCallback = () => {},
  onErrorCallback = (_error?: any) => {}
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      phoneNumber,
      reportId,
      userId,
    }: {
      phoneNumber: string;
      reportId: string;
      userId?: string;
    }) => {
      return await acceptSharedReport(phoneNumber, reportId, userId);
    },
    onSuccess: (data) => {
      // Invalidate shared reports queries
      queryClient.invalidateQueries({ queryKey: ['getSharedReports'] });
      // Also invalidate regular reports to refresh the list
      queryClient.invalidateQueries({ queryKey: ['getManyReports'] });
      toast.success(data.message || 'Report accepted successfully!');
      onSuccessCallback();
    },
    onError: (error: any) => {
      const errorMessage = error?.message || 'Failed to accept report';
      toast.error(errorMessage);
      onErrorCallback(error);
    },
  });
};

export const usePendingReportsCount = (phoneNumber: string | undefined) => {
  return useQuery({
    queryKey: ['pendingReportsCount', phoneNumber],
    queryFn: async () => {
      if (!phoneNumber) return 0;
      try {
        const data = await getSharedReports(phoneNumber, 'pending');
        return data.pending || 0;
      } catch (error: any) {
        console.error('Error fetching pending reports count:', error);
        return 0;
      }
    },
    enabled: !!phoneNumber,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchInterval: 30000, // Poll every 30 seconds
  });
};

// New hook for fetching reports from DC app with sharedReportDetails
export const useGetReportsFromDC = (phoneNumber: string | undefined) => {
  return useQuery({
    queryKey: ['getReportsFromDC', phoneNumber],
    queryFn: async () => {
      if (!phoneNumber) return { reports: [], total: 0 };
      try {
        const data = await getReportsFromDC(phoneNumber);
        console.log('DC Reports fetched:', { phoneNumber, count: data.reports?.length || 0 });
        return data;
      } catch (error: any) {
        console.error('Error fetching reports from DC:', error);
        // Return empty data on error instead of throwing
        return { reports: [], total: 0 };
      }
    },
    enabled: !!phoneNumber,
    retry: 2, // Retry twice for external API calls
    refetchOnWindowFocus: false,
    staleTime: 2 * 60 * 1000, // 2 minutes - external API data
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Hook for fetching pending shared reports from omerald users
export const useGetPendingSharedReports = (phoneNumber: string | undefined) => {
  return useQuery({
    queryKey: ['getPendingSharedReports', phoneNumber],
    queryFn: async () => {
      if (!phoneNumber) return [];
      try {
        const { data } = await axios.post(getPendingSharedReports, { phoneNumber });
        return Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
      } catch (error: any) {
        console.error('Error fetching pending shared reports:', error);
        // Return empty array on error instead of throwing
        return [];
      }
    },
    enabled: !!phoneNumber,
    retry: 1,
    refetchOnWindowFocus: false,
  });
};

