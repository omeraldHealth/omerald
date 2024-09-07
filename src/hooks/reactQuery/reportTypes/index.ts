import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { getReportTypes } from '@/services/omeraldAdminService';

// Cache duration for report types (static data that doesn't change frequently)
const REPORT_TYPES_STALE_TIME = 30 * 60 * 1000; // 30 minutes
const REPORT_TYPES_CACHE_TIME = 60 * 60 * 1000; // 1 hour

/**
 * Hook to fetch report types from admin API
 * Uses React Query for caching and performance optimization
 */
export const useGetReportTypesFromAdmin = () => {
  return useQuery({
    queryKey: ['reportTypes', 'admin'],
    queryFn: async () => {
      return await getReportTypes();
    },
    staleTime: REPORT_TYPES_STALE_TIME,
    gcTime: REPORT_TYPES_CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

/**
 * Hook to fetch report types from internal API
 * Uses React Query for caching and performance optimization
 */
export const useGetReportTypes = () => {
  return useQuery({
    queryKey: ['reportTypes', 'internal'],
    queryFn: async () => {
      const response = await axios.post('/api/reportType/getReportType', {});
      const types = response?.data?.data || response?.data || [];
      return Array.isArray(types) ? types : [];
    },
    staleTime: REPORT_TYPES_STALE_TIME,
    gcTime: REPORT_TYPES_CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

/**
 * Hook to fetch a single report type by ID
 * Uses React Query for caching and performance optimization
 */
export const useGetReportTypeById = (typeId: string | undefined) => {
  return useQuery({
    queryKey: ['reportType', typeId],
    queryFn: async () => {
      if (!typeId) return null;
      const response = await axios.post('/api/reportType/getReportType', { _id: typeId });
      return response?.data?.data || response?.data || null;
    },
    enabled: !!typeId,
    staleTime: REPORT_TYPES_STALE_TIME,
    gcTime: REPORT_TYPES_CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

