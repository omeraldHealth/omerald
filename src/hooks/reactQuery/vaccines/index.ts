import { useQuery } from '@tanstack/react-query';
import { getVaccines, getVaccineDoses, getVaccineDurations, getAllVaccineData } from '@/services/omeraldAdminService';

// Cache duration for vaccines data (static data that doesn't change frequently)
const VACCINE_STALE_TIME = 30 * 60 * 1000; // 30 minutes
const VACCINE_CACHE_TIME = 60 * 60 * 1000; // 1 hour

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
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/2fbc7e35-288c-4e48-8204-8ecc0d034a57',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'vaccines/index.ts:64',message:'useGetAllVaccineData hook called',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  
  return useQuery({
    queryKey: ['allVaccineData'],
    queryFn: async () => {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/2fbc7e35-288c-4e48-8204-8ecc0d034a57',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'vaccines/index.ts:67',message:'getAllVaccineData queryFn starting',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      try {
        const result = await getAllVaccineData();
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/2fbc7e35-288c-4e48-8204-8ecc0d034a57',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'vaccines/index.ts:71',message:'getAllVaccineData queryFn success',data:{hasResult:!!result,hasVaccines:!!result?.vaccines,hasDoses:!!result?.doses,hasDurations:!!result?.durations,vaccinesLength:result?.vaccines?.length||0,dosesLength:result?.doses?.length||0,durationsLength:result?.durations?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        return result;
      } catch (error: any) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/2fbc7e35-288c-4e48-8204-8ecc0d034a57',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'vaccines/index.ts:76',message:'getAllVaccineData queryFn error',data:{errorMessage:error?.message,errorString:error?.toString(),errorType:error?.constructor?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        throw error;
      }
    },
    staleTime: VACCINE_STALE_TIME,
    gcTime: VACCINE_CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

