import { useQuery } from '@tanstack/react-query';
import { getVaccines, getVaccineDoses, getVaccineDurations, getAllVaccineData } from '@/services/omeraldAdminService';

// Cache duration for vaccines data (static data that doesn't change frequently)
// Increased cache times for instant loading - vaccine data rarely changes
const VACCINE_STALE_TIME = 24 * 60 * 60 * 1000; // 24 hours - vaccine data is very static
const VACCINE_CACHE_TIME = 7 * 24 * 60 * 60 * 1000; // 7 days - keep in cache for a week

/**
 * Hook to fetch all vaccines
 * Uses React Query for caching and performance optimization
 */
export const useGetVaccines = () => {
  return useQuery({
    queryKey: ['vaccines'],
    queryFn: async () => {
      return await getVaccines();
    },
    staleTime: VACCINE_STALE_TIME,
    gcTime: VACCINE_CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

/**
 * Hook to fetch all vaccine doses
 * Uses React Query for caching and performance optimization
 */
export const useGetVaccineDoses = () => {
  return useQuery({
    queryKey: ['vaccineDoses'],
    queryFn: async () => {
      return await getVaccineDoses();
    },
    staleTime: VACCINE_STALE_TIME,
    gcTime: VACCINE_CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

/**
 * Hook to fetch all vaccine durations
 * Uses React Query for caching and performance optimization
 */
export const useGetVaccineDurations = () => {
  return useQuery({
    queryKey: ['vaccineDurations'],
    queryFn: async () => {
      return await getVaccineDurations();
    },
    staleTime: VACCINE_STALE_TIME,
    gcTime: VACCINE_CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

/**
 * Hook to fetch all vaccine-related data (vaccines, doses, durations) in parallel
 * Uses React Query for caching and performance optimization
 */
export const useGetAllVaccineData = () => {
  return useQuery({
    queryKey: ['allVaccineData'],
    queryFn: async () => {
      return await getAllVaccineData();
    },
    staleTime: VACCINE_STALE_TIME,
    gcTime: VACCINE_CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    // Use placeholderData to show cached data immediately while fetching fresh data
    placeholderData: (previousData) => previousData,
    // Enable background refetching - will update in background if stale
    refetchOnReconnect: true,
    // Retry configuration for faster failure
    retry: 1, // Only retry once
    retryDelay: 1000, // Wait 1 second before retry
  });
};

