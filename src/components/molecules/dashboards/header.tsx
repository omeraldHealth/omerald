'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { UserButton } from '@clerk/nextjs';
import { BellIcon, MagnifyingGlassIcon, Bars3Icon } from '@heroicons/react/24/outline';
import { useAuthContext } from '@/components/common/utils/context/auth.context';
import { usePendingReportsCount, useGetManyReports, useGetPendingSharedReports } from '@/hooks/reactQuery/reports';
import { useRecoilValue } from 'recoil';
import { dashTabs } from '@/components/common/recoil/dashboard';
import { getSubscriptionPlan } from '@/lib/utils/subscription';
import { useSetRecoilState } from 'recoil';

interface DashboardHeaderProps {
  onMenuClick?: () => void;
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
}

export function DashboardHeader({ onMenuClick, onToggleSidebar, isSidebarCollapsed = false }: DashboardHeaderProps) {
  const { profile, phoneNumber } = useAuthContext();
  const [isDoctorMode, setIsDoctorMode] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const currentTab = useRecoilValue(dashTabs);
  const setDash = useSetRecoilState(dashTabs);
  
  // Get subscription info
  const subscription = profile?.subscription || 'Free';
  const plan = getSubscriptionPlan(subscription);
  const isPremium = subscription === 'Premium' || subscription === 'Enterprise';

  // Get pending reports count from DC app
  const { data: dcPendingCount = 0 } = usePendingReportsCount(phoneNumber || undefined);

  // Get pending shared reports from omerald users
  const { data: omeraldPendingSharedReports = [] } = useGetPendingSharedReports(phoneNumber || undefined);
  const omeraldPendingCount = useMemo(() => {
    return Array.isArray(omeraldPendingSharedReports) ? omeraldPendingSharedReports.length : 0;
  }, [omeraldPendingSharedReports]);

  // Get local pending reports count
  const users: string[] = [];
  if (profile?.phoneNumber) {
    users.push(profile.phoneNumber);
  }
  profile?.members?.forEach((member: any) => {
    if (member.phoneNumber) {
      users.push(member.phoneNumber);
    }
  });

  const { data: localReports = [] } = useGetManyReports(users.length > 0 ? users : undefined);
  const localPendingCount = useMemo(() => {
    return Array.isArray(localReports) 
      ? localReports.filter((report: any) => report.status === 'pending').length 
      : 0;
  }, [localReports]);

  // Total pending count from all sources
  const totalPendingCount = (dcPendingCount || 0) + localPendingCount + omeraldPendingCount;

  // Check if user is approved doctor
  // Show dropdown if doctorApproved is true (user has been approved)
  const isApprovedDoctor = profile?.doctorApproved === true;

  // Load doctor mode from localStorage on mount
  useEffect(() => {
    if (!profile) {
      // Clear doctor mode if user is not logged in
      localStorage.removeItem('doctorMode');
      setIsDoctorMode(false);
      return;
    }

    if (isApprovedDoctor) {
      const savedMode = localStorage.getItem('doctorMode');
      if (savedMode === 'true') {
        setIsDoctorMode(true);
      }
    } else {
      // Clear doctor mode if not approved
      localStorage.removeItem('doctorMode');
      setIsDoctorMode(false);
    }
  }, [isApprovedDoctor, profile]);

  // Handle mode change
  const handleModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!isApprovedDoctor) return;

    const newMode = e.target.value === 'doctor';
    setIsSwitching(true);
    
    // Small delay to show loader
    setTimeout(() => {
      setIsDoctorMode(newMode);
      localStorage.setItem('doctorMode', newMode.toString());
      // Trigger a custom event to notify other components
      window.dispatchEvent(new CustomEvent('doctorModeChanged', { detail: newMode }));
      setIsSwitching(false);
    }, 300);
  };

  // Clear localStorage on logout (handled by Clerk's UserButton)

  return (
    <header className="bg-white shadow-sm sticky top-0 z-30 border-b border-gray-100 safe-top">
      <div className="flex items-center justify-between px-2 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4">
        <div className="flex items-center gap-2 sm:gap-4 flex-1">
          {/* Mobile menu button */}
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-md text-gray-700 hover:text-purple-600 hover:bg-gray-100 tap-target"
              aria-label="Toggle sidebar"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
          )}
          
          {/* Current Tab Title */}
          <div className="flex items-center gap-2">
            <Bars3Icon className="h-6 w-6 text-gray-900 hidden lg:block" />
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              {currentTab === 'Home' ? 'Dashboard' : currentTab}
            </h1>
          </div>
        </div>

        {/* Center Search Bar - Hidden for now */}
        {/* <div className="hidden md:flex flex-1 max-w-xl mx-4">
          <div className="relative w-full">
            <input
              type="search"
              placeholder="Search something here.."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
            />
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          </div>
        </div> */}

         {/* Right Section */}
         <div className="flex items-center gap-2 sm:gap-3 md:gap-4 justify-end flex-1">
          {/* Doctor Mode Dropdown - Hidden for now */}
          {/* {isApprovedDoctor && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
              {isSwitching ? (
                <div className="flex items-center gap-2 px-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                  <span className="text-sm font-medium text-gray-700">Switching...</span>
                </div>
              ) : (
                <>
                  <label htmlFor="profile-mode" className="text-sm font-medium text-gray-600">
                    Mode:
                  </label>
                  <select
                    id="profile-mode"
                    value={isDoctorMode ? 'doctor' : 'user'}
                    onChange={handleModeChange}
                    className="text-sm font-semibold text-purple-600 bg-white border border-gray-200 rounded-md px-2 py-1 cursor-pointer focus:ring-2 focus:ring-purple-500 outline-none"
                    disabled={isSwitching}
                  >
                    <option value="user">User</option>
                    <option value="doctor">Doctor</option>
                  </select>
                </>
              )}
            </div>
          )} */}
          
          {/* Notifications Button */}
          <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors tap-target">
            <BellIcon className="w-6 h-6" />
            {totalPendingCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full z-10 shadow-sm">
                {totalPendingCount > 99 ? '99+' : totalPendingCount}
              </span>
            )}
          </button>
          
          {/* User Profile Section */}
          <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                {profile?.firstName ? (
                  <span className="text-sm font-semibold text-gray-700">
                    {profile.firstName.charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-900">
                  {profile?.firstName && profile?.lastName 
                    ? `${profile.firstName} ${profile.lastName}` 
                    : 'User'}
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-gray-500">Primary User</p>
                  {/* Subscription Badge */}
                  <button
                    onClick={() => setDash('Subscription')}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all hover:scale-105 shadow-sm ${
                      subscription === 'Enterprise'
                        ? 'bg-gradient-to-r from-purple-500 via-purple-600 to-indigo-600 text-white border border-purple-700'
                        : subscription === 'Premium'
                        ? 'bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-yellow-900 border border-yellow-700 shadow-md'
                        : 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300'
                    }`}
                    title={`${plan.name} Plan - Click to manage subscription`}
                  >
                    {isPremium && (
                      <svg className="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    )}
                    {subscription === 'Enterprise' && (
                      <svg className="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                    {plan.name}
                  </button>
                </div>
              </div>
            </div>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </div>
    </header>
  );
}

