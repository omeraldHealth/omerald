'use client';

import React, { useState } from 'react';
import { useRecoilValue } from 'recoil';
import { memberState } from '@/components/common/recoil/member';

interface MemberFilterMenuProps {
  sortList: Record<string, string>;
  handleSort: (value: string) => void;
  handleFreeSubscription: (e: any) => void;
  handlePaidSubscription: (e: any) => void;
  handlePediatricFilter: (e: boolean) => void;
  handleAdultFilter: (e: boolean) => void;
  memberCount?: number;
}

export default function MemberFilterMenu({
  sortList,
  handleSort,
  handleFreeSubscription,
  handlePaidSubscription,
  handlePediatricFilter,
  handleAdultFilter,
  memberCount,
}: MemberFilterMenuProps) {
  const memberData = useRecoilValue(memberState);
  const [freeMemberChecked, setFreeMemberChecked] = useState(false);
  const [paidMemberChecked, setPaidMemberChecked] = useState(true);
  const [adultChecked, setAdultChecked] = useState(true);
  const [pediatricChecked, setPediatricChecked] = useState(false);
  const [sortValue, setSortValue] = useState('nameAsc');

  const handleFreeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFreeMemberChecked(e.target.checked);
    handleFreeSubscription(e);
  };

  const handlePaidChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPaidMemberChecked(e.target.checked);
    handlePaidSubscription(e);
  };

  const handleAdultChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAdultChecked(e.target.checked);
    if (e.target.checked) {
      setPediatricChecked(false);
    }
    handleAdultFilter(e.target.checked);
  };

  const handlePediatricChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPediatricChecked(e.target.checked);
    if (e.target.checked) {
      setAdultChecked(false);
    }
    handlePediatricFilter(e.target.checked);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortValue(e.target.value);
    handleSort(e.target.value);
  };

  const count = memberCount !== undefined ? memberCount : (memberData?.length || 0);

  return (
    <div className="flex justify-between items-center mb-4">
      <section className="hidden xs:block">
        <p className="text-gray-600">
          Showing {count > 0 ? `${count} Members` : `${count} Member`}
        </p>
      </section>
      <section className="flex items-center gap-4 flex-wrap">
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={freeMemberChecked}
            onChange={handleFreeChange}
            className="mr-2 w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
          />
          <span className="text-sm text-gray-700">Free Member</span>
        </label>
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={paidMemberChecked}
            onChange={handlePaidChange}
            className="mr-2 w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
          />
          <span className="text-sm text-gray-700">Paid Member</span>
        </label>
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={adultChecked}
            onChange={handleAdultChange}
            className="mr-2 w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
          />
          <span className="text-sm text-gray-700">Adult</span>
        </label>
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={pediatricChecked}
            onChange={handlePediatricChange}
            className="mr-2 w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
          />
          <span className="text-sm text-gray-700">Pediatric</span>
        </label>
        <div className="flex items-center bg-gray-100 rounded-full px-4 py-2">
          <svg className="w-4 h-4 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span className="text-sm text-gray-700 mr-2">Name</span>
          <svg className="w-4 h-4 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
          <select
            value={sortValue}
            onChange={handleSortChange}
            className="bg-transparent border-none outline-none text-sm text-gray-700 cursor-pointer appearance-none pr-6"
          >
            {Object.keys(sortList).map((sort) => (
              <option key={sort} value={sort}>
                {sortList[sort]}
              </option>
            ))}
          </select>
          <svg className="w-4 h-4 text-gray-600 ml-1 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </section>
    </div>
  );
}

