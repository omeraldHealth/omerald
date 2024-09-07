'use client';

import React, { ReactNode } from 'react';
import { useAuthContext } from '@/components/common/utils/context/auth.context';
import { Spinner } from '@/components/atoms/loader';
import dynamic from 'next/dynamic';

const DashboardHeader = dynamic(
  () =>
    import('@/components/molecules/dashboards/header').then(
      (mod) => mod.DashboardHeader
    ),
  { ssr: false }
);
const DashboardSideBar = dynamic(
  () =>
    import('@/components/molecules/dashboards/sidebar').then(
      (mod) => mod.DashboardSideBar
    ),
  { ssr: false }
);

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { isProfileLoading } = useAuthContext();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);

  // Load sidebar collapsed state from localStorage
  React.useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState !== null) {
      setIsSidebarCollapsed(savedState === 'true');
    }
  }, []);

  // Save sidebar collapsed state to localStorage
  const toggleSidebar = React.useCallback(() => {
    setIsSidebarCollapsed((prev) => {
      const newState = !prev;
      localStorage.setItem('sidebarCollapsed', String(newState));
      return newState;
    });
  }, []);

  return (
    <div className="flex bg-white w-full h-screen max-h-screen transition-colors duration-300 relative overflow-hidden">
      {/* Sidebar - always visible on desktop, toggleable on mobile */}
      <div className={isSidebarOpen ? 'block' : 'hidden lg:block'}>
        <DashboardSideBar 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />
      </div>
      
      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-white/30 backdrop-blur-md z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      <div 
        className="flex-1 flex flex-col h-screen max-h-screen transition-all duration-300 ease-in-out ml-0 w-full overflow-hidden"
      >
        <DashboardHeader 
          onMenuClick={() => setIsSidebarOpen(true)}
          onToggleSidebar={toggleSidebar}
          isSidebarCollapsed={isSidebarCollapsed}
        />
        <main className="flex-1 min-h-0 bg-gray-50/50 w-full overflow-y-auto overflow-x-hidden">
          <div className="py-2 sm:py-4 px-3 sm:px-4 md:px-6 lg:px-8 w-full">
            <div className="w-full relative">
              {isProfileLoading && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
                  <Spinner message="Loading Dashboard..." />
                </div>
              )}
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

