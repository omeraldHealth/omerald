'use client';

import React from 'react';
import { useRecoilValue, useRecoilState } from 'recoil';
import { memberDetail, memberDetailInitialTab } from '@/components/common/recoil/member';
import { useGetProfileById } from '@/hooks/reactQuery/profile';
import { useSetRecoilState } from 'recoil';
import { dashTabs } from '@/components/common/recoil/dashboard';
import Profile from './profile';

export default function MemberDetails() {
  const memberId = useRecoilValue(memberDetail);
  const [initialTab, setInitialTab] = useRecoilState(memberDetailInitialTab);
  const setDash = useSetRecoilState(dashTabs);

  const profileQuery = useGetProfileById(memberId);
  const member = profileQuery.data;

  // Handle back navigation
  const handleBack = () => {
    setDash('Members');
  };

  // Loading state
  if (profileQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading member details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (!member) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Member not found</p>
        <button
          onClick={handleBack}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Back to Members
        </button>
      </div>
    );
  }

  // Use Profile component with member data
  return (
    <Profile 
      member={member} 
      onBack={handleBack}
    />
  );
}
