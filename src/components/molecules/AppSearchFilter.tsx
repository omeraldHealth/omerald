'use client';

import React, { useState, useCallback } from 'react';
import { useRecoilValue } from 'recoil';
import debounce from 'lodash.debounce';
import { useAuthContext } from '@/components/common/utils/context/auth.context';
import { dashTabs } from '@/components/common/recoil/dashboard';
import AddMemberModal from '@/components/molecules/AddMemberModal';

interface AppSearchFilterProps {
  handleFilterMembers: (value: string) => void;
}

const getSearchPlaceholder = (tab: string): string => {
  const placeholderMap: Record<string, string> = {
    'Members': 'Search members by name',
    'Reports': 'Search reports by member name or test name',
    'Articles': 'Search articles by title, author, or content',
    'Analytics': 'Search analytics data',
    'Profile': 'Search profile information',
  };
  return placeholderMap[tab] || 'Search...';
};

export default function AppSearchFilter({ handleFilterMembers }: AppSearchFilterProps) {
  const [visible, setVisible] = useState(false);
  const { profile } = useAuthContext();
  const currentTab = useRecoilValue(dashTabs);

  const searchHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFilterMembers(event.target.value);
  };

  const debouncedSearch = useCallback(debounce(searchHandler, 500), []);

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 sm:gap-4 mb-6 w-full">
        <div className="flex flex-1 min-w-0 bg-white border border-gray-200 rounded-lg p-2 items-center">
          <svg className="w-5 h-5 text-gray-400 ml-2 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder={getSearchPlaceholder(currentTab)}
            onChange={debouncedSearch}
            className="flex-1 min-w-0 outline-none text-sm"
          />
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            className="px-4 py-2 bg-white border border-blue-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium whitespace-nowrap"
          >
            View
          </button>
          <button
            onClick={() => setVisible(true)}
            className="px-4 py-2 bg-blue-50 text-gray-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium whitespace-nowrap"
          >
            Add
          </button>
        </div>
      </div>
      <AddMemberModal 
        visible={visible} 
        setVisible={setVisible} 
        profile={profile} 
      />
    </>
  );
}
