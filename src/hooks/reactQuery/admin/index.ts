import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useGetVaccines } from '../vaccines';

interface AdminStats {
  totalUsers: number;
  totalReports: number;
  pendingReports: number;
  totalVaccines: number;
}

// Cache duration for admin stats (refresh more frequently)
const ADMIN_STATS_STALE_TIME = 2 * 60 * 1000; // 2 minutes
const ADMIN_STATS_CACHE_TIME = 5 * 60 * 1000; // 5 minutes

/**
 * Hook to fetch admin statistics
 * Uses React Query for caching and performance optimization
 */
export const useGetAdminStats = () => {
  const { data: vaccines = [] } = useGetVaccines();

  return useQuery({
    queryKey: ['adminStats'],
    queryFn: async (): Promise<AdminStats> => {
      // Fetch all users
      const usersResponse = await axios.get('/api/user/getAllUsers');
      const totalUsers = Array.isArray(usersResponse.data) ? usersResponse.data.length : 0;

      // Fetch all reports
      let totalReports = 0;
      let pendingReports = 0;
      
      try {
        const allUsers = usersResponse.data || [];
        const allPhoneNumbers = allUsers.map((u: any) => u.phoneNumber).filter(Boolean);
        
        if (allPhoneNumbers.length > 0) {
          const reportsResponse = await axios.post('/api/reports/getManyReports', {
            users: allPhoneNumbers,
          });
          const reports = reportsResponse.data?.data || reportsResponse.data || [];
          totalReports = Array.isArray(reports) ? reports.length : 0;
          pendingReports = Array.isArray(reports)
            ? reports.filter((r: any) => r.status === 'pending').length
            : 0;
        }
      } catch (error) {
        console.error('Error fetching reports:', error);
      }

      const totalVaccines = Array.isArray(vaccines) ? vaccines.length : 0;

      return {
        totalUsers,
        totalReports,
        pendingReports,
        totalVaccines,
      };
    },
    staleTime: ADMIN_STATS_STALE_TIME,
    gcTime: ADMIN_STATS_CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

