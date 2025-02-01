'use client';

import Image from 'next/image';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRecoilState } from 'recoil';
import { dashTabs } from '@/components/common/recoil/dashboard';
import { useAuthContext } from '@/components/common/utils/context/auth.context';
import {
  HomeIcon,
  UsersIcon,
  DocumentTextIcon,
  ClipboardDocumentCheckIcon,
  SparklesIcon,
  NewspaperIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ShieldExclamationIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  UsersIcon as UsersIconSolid,
  DocumentTextIcon as DocumentTextIconSolid,
  ClipboardDocumentCheckIcon as ClipboardDocumentCheckIconSolid,
  SparklesIcon as SparklesIconSolid,
  NewspaperIcon as NewspaperIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  Cog6ToothIcon as Cog6ToothIconSolid,
  ShieldExclamationIcon as ShieldExclamationIconSolid,
  UserGroupIcon as UserGroupIconSolid,
} from '@heroicons/react/24/solid';

const sideBarItems = [
  {
    title: 'Dashboard',
    route: '/dashboard',
    type: 'link',
    icon: {
      active: HomeIconSolid,
      inactive: HomeIcon,
    },
    roles: ['user'],
  },
  {
    title: 'Members',
    route: '/members',
    type: 'link',
    icon: {
      active: UsersIconSolid,
      inactive: UsersIcon,
    },
    roles: ['user'],
  },
  {
    title: 'Reports',
    route: '/reports',
    type: 'link',
    icon: {
      active: DocumentTextIconSolid,
      inactive: DocumentTextIcon,
    },
    roles: ['user'],
  },
  {
    title: 'Subscription',
    route: '/subscription',
    type: 'link',
    icon: {
      active: ClipboardDocumentCheckIconSolid,
      inactive: ClipboardDocumentCheckIcon,
    },
    roles: ['user'],
  },
  {
    title: 'Profile',
    route: '/profile',
    type: 'link',
    icon: {
      active: SparklesIconSolid,
      inactive: SparklesIcon,
    },
    roles: ['user'],
  },
  {
    title: 'Articles',
    route: '/articles',
    type: 'link',
    icon: {
      active: NewspaperIconSolid,
      inactive: NewspaperIcon,
    },
    roles: ['user'],
  },
  {
    title: 'Analytics',
    route: '/analytics',
    type: 'link',
    icon: {
      active: ChartBarIconSolid,
      inactive: ChartBarIcon,
    },
    roles: ['user'],
  },
  {
    title: 'Doctor',
    route: '/doctor',
    type: 'link',
    icon: {
      active: UserGroupIconSolid,
      inactive: UserGroupIcon,
    },
    roles: ['user'],
    showForDoctors: true, // Only show for doctors
  },
  // {
  //   title: 'Settings',
  //   route: '/settings',
  //   type: 'link',
  //   icon: {
  //     active: Cog6ToothIconSolid,
  //     inactive: Cog6ToothIcon,
  //   },
  //   roles: ['user'],
  // },
  // {
  //   title: 'Vaccines',
  //   route: '/vaccines',
  //   type: 'link',
  //   icon: {
  //     active: ShieldExclamationIconSolid,
  //     inactive: ShieldExclamationIcon,
  //   },
  //   roles: ['admin'],
  // },
];

interface DashboardSideBarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function DashboardSideBar({ isOpen = true, onClose, isCollapsed = false, onToggleCollapse }: DashboardSideBarProps) {
  const { pathname } = useRouter();
  const { profile } = useAuthContext();
  const [role, setRole] = useState('user');
  const [isDoctorMode, setIsDoctorMode] = useState(false);
  const isApprovedDoctor = profile?.doctorApproved === true;

  useEffect(() => {
    // TODO: Get role from auth context or profile
    setRole('user');
    
    // Check doctor mode from localStorage
    const checkDoctorMode = () => {
      const savedMode = localStorage.getItem('doctorMode');
      setIsDoctorMode(savedMode === 'true');
    };
    
    checkDoctorMode();
    
    // Listen for doctor mode changes
    const handleDoctorModeChange = (e: CustomEvent) => {
      setIsDoctorMode(e.detail);
    };
    
    window.addEventListener('doctorModeChanged', handleDoctorModeChange as EventListener);
    
    return () => {
      window.removeEventListener('doctorModeChanged', handleDoctorModeChange as EventListener);
    };
  }, []);

  // Filter sidebar items based on doctor mode
  const filteredItems = sideBarItems.filter((sbi) => {
    if (!sbi.roles.includes(role)) return false;
    
    // Check if item should only show for doctors
    if (sbi.showForDoctors) {
      // Only show if user is an approved doctor
      return isApprovedDoctor;
    }
    
    // In doctor mode, only show Analytics, Members, Reports, Profile, and Doctor
    // Hide Dashboard/Home, Articles, and other non-doctor tabs
    if (isDoctorMode) {
      return ['Analytics', 'Members', 'Reports', 'Profile', 'Doctor'].includes(sbi.title);
    }
    
    // In user mode, show all items (except doctor-only items)
    return true;
  });

  return (
    <>
      <aside
        className={`
          side-bar fixed
          h-screen bg-[#40189D] relative shrink-0 shadow-2xl
          left-0 top-0 z-40
          transform transition-all duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          ${isCollapsed ? 'w-16 lg:w-16' : 'w-64 lg:w-64'}
          ${isCollapsed ? 'p-2' : 'p-4 sm:p-6'}
          flex flex-col overflow-y-auto
        `}
        aria-label="Sidebar"
      >
        <div className={`mb-6 sm:mb-8 ${isCollapsed ? 'mb-4' : ''}`}>
          <div className="flex items-center justify-between mb-4">
            {!isCollapsed ? (
              <>
                <Link href="/" className="flex items-center space-x-2 bg-white rounded-lg p-2 px-3" onClick={onClose}>
                  <Image src="/logo.jpg" alt="logo" width={171} height={57.75} className="h-8 w-auto" />
                  <span className="text-sm font-bold text-[#40189D]">
                    OMERALD
                  </span>
                </Link>
                {/* Close button for mobile */}
                <button
                  onClick={onClose}
                  className="lg:hidden p-2 rounded-md text-white hover:bg-white/10 tap-target"
                  aria-label="Close sidebar"
                >
                  <svg
                    className="h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center w-full">
                <Link href="/" className="flex items-center justify-center mb-4 bg-white rounded-lg p-2" onClick={onClose}>
                  <Image src="/logo.jpg" alt="logo" width={32} height={32} className="h-8 w-8 rounded" />
                </Link>
                {/* Toggle button for desktop collapsed state */}
                {onToggleCollapse && (
                  <button
                    onClick={onToggleCollapse}
                    className="hidden lg:flex p-2 rounded-md text-white hover:bg-white/10 tap-target"
                    aria-label="Expand sidebar"
                  >
                    <svg
                      className="h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </div>
            )}
            {/* Toggle collapse button for desktop when expanded */}
            {!isCollapsed && onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="hidden lg:flex p-2 rounded-md text-white hover:bg-white/10 tap-target ml-auto"
                aria-label="Collapse sidebar"
              >
                <svg
                  className="h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
          </div>
        </div>
        <div className={`mb-8 space-y-2 flex-1 ${isCollapsed ? 'mb-4' : ''}`}>
          {filteredItems.map((sidebarItem) => (
            <SidebarItem 
              key={sidebarItem.title} 
              item={sidebarItem} 
              onItemClick={onClose}
              isCollapsed={isCollapsed}
            />
          ))}
        </div>
        
        {/* Copyright Message */}
        {!isCollapsed && (
          <div className="mt-auto pt-4 border-t border-white/20">
            <p className="text-white/70 text-xs text-center">
              © {new Date().getFullYear()} Omerald. All rights reserved.
            </p>
          </div>
        )}
      </aside>
    </>
  );
}

const SidebarItem = ({ item, onItemClick, isCollapsed = false }: { item: typeof sideBarItems[0]; onItemClick?: () => void; isCollapsed?: boolean }) => {
  const [dashTab, setDashTab] = useRecoilState(dashTabs);
  const isActive = item.title === dashTab;
  const IconComponent = isActive ? item.icon.active : item.icon.inactive;

  return (
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        setDashTab(item.title);
        // Close sidebar on mobile after selection
        if (onItemClick) {
          onItemClick();
        }
      }}
      className={`
        flex items-center rounded-2xl
        transition-all duration-200 ease-in-out tap-target
        ${isCollapsed ? 'justify-center p-2.5' : 'pl-3 sm:pl-4 p-3 sm:p-3.5'}
        ${isActive
          ? 'bg-white text-[#40189D] shadow-lg'
          : 'text-white hover:bg-white/10 hover:text-white'
        }
      `}
      title={isCollapsed ? item.title : undefined}
    >
      <IconComponent className={`${isCollapsed ? 'w-5 h-5' : 'w-5 h-5 sm:w-6 sm:h-6'} flex-shrink-0`} />
      {!isCollapsed && (
        <div
          className={`ml-3 sm:ml-4 text-sm sm:text-base font-medium transition-all duration-200 ${isActive ? 'font-semibold' : ''}`}
        >
          {item.title}
        </div>
      )}
    </a>
  );
};

