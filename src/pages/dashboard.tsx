import { DashboardLayout } from '@/components/templates/layouts/DashboardLayout';
import { UserLayout } from '@/components/templates/layouts/UserLayout';
import { dashTabs } from '@/components/common/recoil/dashboard';
import { useRecoilState } from 'recoil';
import dynamic from 'next/dynamic';
import React, { useMemo, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Spinner } from '@/components/atoms/loader';
import { useAuthContext } from '@/components/common/utils/context/auth.context';
import ErrorBoundary from '@/components/common/utils/ErrorBoundary';
import axios from 'axios';

const Home = dynamic(() => import('@/components/organisms/dashboardTabs/home'), {
  loading: () => (
    <div className="min-h-[400px] flex items-center justify-center">
      <Spinner message="Loading Dashboard..." />
    </div>
  ),
});
const AdminHome = dynamic(() => import('@/components/organisms/dashboardTabs/adminHome'), {
  loading: () => (
    <div className="min-h-[400px] flex items-center justify-center">
      <Spinner message="Loading Admin Dashboard..." />
    </div>
  ),
});
const Members = dynamic(
  () => import('@/components/organisms/dashboardTabs/members'),
  {
    loading: () => (
      <div className="min-h-[400px] flex items-center justify-center">
        <Spinner message="Loading Members..." />
      </div>
    ),
  }
);
const Reports = dynamic(
  () => import('@/components/organisms/dashboardTabs/reports'),
  {
    loading: () => (
      <div className="min-h-[400px] flex items-center justify-center">
        <Spinner message="Loading Reports..." />
      </div>
    ),
  }
);
const Setting = dynamic(
  () => import('@/components/organisms/dashboardTabs/settings'),
  {
    loading: () => (
      <div className="min-h-[400px] flex items-center justify-center">
        <Spinner message="Loading Settings..." />
      </div>
    ),
  }
);
const Profile = dynamic(
  () => import('@/components/organisms/dashboardTabs/profile'),
  {
    loading: () => (
      <div className="min-h-[400px] flex items-center justify-center">
        <Spinner message="Loading Profile..." />
      </div>
    ),
  }
);
const Articles = dynamic(
  () => import('@/components/organisms/dashboardTabs/articles'),
  {
    loading: () => (
      <div className="min-h-[400px] flex items-center justify-center">
        <Spinner message="Loading Articles..." />
      </div>
    ),
  }
);
const Analytics = dynamic(
  () => import('@/components/organisms/dashboardTabs/analytics'),
  {
    loading: () => (
      <div className="min-h-[400px] flex items-center justify-center">
        <Spinner message="Loading Analytics..." />
      </div>
    ),
  }
);
const MemberDetails = dynamic(
  () => import('@/components/organisms/dashboardTabs/memberDetails'),
  {
    loading: () => (
      <div className="min-h-[400px] flex items-center justify-center">
        <Spinner message="Loading Member Details..." />
      </div>
    ),
  }
);
const Subscription = dynamic(
  () => import('@/components/organisms/dashboardTabs/subscription'),
  {
    loading: () => (
      <div className="min-h-[400px] flex items-center justify-center">
        <Spinner message="Loading Subscription..." />
      </div>
    ),
  }
);
const Doctor = dynamic(
  () => import('@/components/organisms/dashboardTabs/doctor'),
  {
    loading: () => (
      <div className="min-h-[400px] flex items-center justify-center">
        <Spinner message="Loading Doctor..." />
      </div>
    ),
  }
);

export default function Dashboard() {
  const router = useRouter();
  const [dashboard, setDashboard] = useRecoilState(dashTabs);
  const { phoneNumber, profile } = useAuthContext();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isDoctorMode, setIsDoctorMode] = useState(false);

  // Redirect role "user" to no-access page instead of dashboard
  useEffect(() => {
    if (userRole === 'user') {
      router.replace('/no-access');
    }
  }, [userRole, router]);

  // Add dashboard-page class to body for overflow handling
  useEffect(() => {
    document.body.classList.add('dashboard-page');
    return () => {
      document.body.classList.remove('dashboard-page');
    };
  }, []);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!phoneNumber) {
        setUserRole('user');
        return;
      }

      try {
        // Fetch user by phone number to get role
        const response = await axios.get('/api/user/getAllUsers');
        const users = Array.isArray(response.data) ? response.data : [];
        const currentUser = users.find((u: any) => u && u.phoneNumber === phoneNumber);
        if (currentUser && currentUser.role) {
          setUserRole(currentUser.role);
        } else {
          setUserRole('user');
        }
      } catch (error: any) {
        console.error('Error fetching user role:', error);
        setUserRole('user');
      }
    };

    try {
      fetchUserRole();
      
      // Check doctor mode from localStorage
      const checkDoctorMode = () => {
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            const savedMode = localStorage.getItem('doctorMode');
            setIsDoctorMode(savedMode === 'true');
          }
        } catch (err: any) {
          console.error('Error checking doctor mode:', err);
          setIsDoctorMode(false);
        }
      };
      
      checkDoctorMode();
      
      // Listen for doctor mode changes
      const handleDoctorModeChange = (e: CustomEvent) => {
        try {
          setIsDoctorMode(e.detail);
          // If in doctor mode and on a restricted tab, redirect to Analytics
          if (e.detail && !['Analytics', 'Members', 'Reports', 'Profile'].includes(dashboard)) {
            setDashboard('Analytics');
          }
        } catch (err: any) {
          console.error('Error handling doctor mode change:', err);
        }
      };
      
      if (typeof window !== 'undefined') {
        window.addEventListener('doctorModeChanged', handleDoctorModeChange as EventListener);
        
        return () => {
          window.removeEventListener('doctorModeChanged', handleDoctorModeChange as EventListener);
        };
      }
    } catch (err: any) {
      console.error('Error in dashboard effect:', err);
    }
  }, [phoneNumber, dashboard, setDashboard]);

  const tabContent = useMemo(() => {
    if (userRole === null || userRole === 'user') return null;

    // In doctor mode, only allow Analytics, Members, Reports, Profile, MemberDetails, Doctor
    if (isDoctorMode && !['Analytics', 'Members', 'Reports', 'Profile', 'MemberDetails', 'Doctor'].includes(dashboard)) {
      return <Analytics />;
    }

    // Show admin home for admin users on Home/Dashboard tab
    if ((dashboard === 'Home' || dashboard === 'Dashboard') && userRole === 'admin') {
      return <AdminHome />;
    }

    switch (dashboard) {
      case 'Home':
      case 'Dashboard':
        return <Home />;
      case 'Members':
        return <Members />;
      case 'MemberDetails':
        return <MemberDetails />;
      case 'Reports':
        return <Reports />;
      case 'Subscription':
        return <Subscription />;
      case 'Profile':
        return <Profile />;
      case 'Articles':
        return <Articles />;
      case 'Analytics':
        return <Analytics />;
      case 'Doctor':
        return <Doctor />;
      case 'Setting':
      case 'Settings':
        return <Setting />;
      default:
        return userRole === 'admin' ? <AdminHome /> : <Home />;
    }
  }, [dashboard, userRole, isDoctorMode]);

  // Loading or redirecting: show spinner until role is known or redirect completes
  if (userRole === null || userRole === 'user') {
    return (
      <UserLayout
        tabName="Omerald | Dashboard"
        tabDescription="Omerald is a health management platform to connect people and doctors with ease."
      >
        <div className="min-h-[400px] flex items-center justify-center">
          <Spinner message={userRole === 'user' ? 'Redirecting...' : 'Checking access...'} />
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout
      tabName={`Omerald | ${dashboard}`}
      tabDescription="Omerald is a health management platform to connect people and doctors with ease."
    >
      <ErrorBoundary>
        <DashboardLayout>{tabContent}</DashboardLayout>
      </ErrorBoundary>
    </UserLayout>
  );
}

