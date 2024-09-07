'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { AVATAR } from '@/components/common/lib/constants/constants';
import { useSetRecoilState } from 'recoil';
import { dashTabs } from '@/components/common/recoil/dashboard';
import { memberDetail, memberDetailInitialTab } from '@/components/common/recoil/member';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { TrashIcon } from '@heroicons/react/24/solid';

ChartJS.register(ArcElement, Tooltip, Legend);

interface MemberCardProps {
  member: any;
  shared?: boolean;
  onShare?: (memberId: string) => void;
  onDelete?: (memberId: string) => void;
}

export default function MemberCard({ member, shared = false, onShare, onDelete }: MemberCardProps) {
  const setDash = useSetRecoilState(dashTabs);
  const setMemberDetail = useSetRecoilState(memberDetail);
  const setInitialTab = useSetRecoilState(memberDetailInitialTab);

  function handleViewMember(memberId: string) {
    setMemberDetail(memberId);
    setDash('MemberDetails');
  }

  function handleUploadReports(memberId: string) {
    setMemberDetail(memberId);
    setInitialTab('reports');
    setDash('MemberDetails');
  }

  const memberName = member?.firstName ? `${member.firstName} ${member.lastName || ''}` : 'User Name';
  const subscriptionStatus = member?.subscription === 'Free' ? 'Free Member' : 'Paid Member';
  const isPaidMember = member?.subscription !== 'Free';
  const userType = member?.userType || 'Primary';
  const relation = member?.relation || 'Self';
  const reportsCount = member?.reports?.length || 0;
  const sharedWithCount = member?.sharedWith?.length || 0;
  const isPediatric = member?.isPediatric === true || member?.isPediatric === 'true';
  
  // Debug: Log member data to check isPediatric
  console.log('MemberCard - Member:', memberName, 'isPediatric:', isPediatric, 'member.isPediatric:', member?.isPediatric, 'DOB:', member?.dob);

  // Mock data for diagnosed conditions - In real app, this would come from member data
  const diagnosedConditions = [
    { label: 'Healthy', value: 60, color: '#A8D96D' },
    { label: 'Warning', value: 25, color: '#FFB380' },
    { label: 'Critical', value: 15, color: '#FF6B6B' },
  ];

  const chartData = {
    labels: diagnosedConditions.map(c => c.label),
    datasets: [
      {
        data: diagnosedConditions.map(c => c.value),
        backgroundColor: diagnosedConditions.map(c => c.color),
        borderWidth: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    cutout: '70%',
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
      },
    },
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 w-full hover:shadow-xl transition-shadow flex flex-col">
      {/* Header Section */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-2 mb-1.5">
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5 ${isPaidMember ? 'bg-[#40189D]' : 'bg-gray-400'}`} />
            <span className="text-xs text-gray-600 truncate leading-tight">{subscriptionStatus}</span>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1.5 truncate leading-tight">{memberName}</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold leading-tight ${
              relation === 'Self' ? 'bg-[#40189D] text-white' : 'bg-purple-100 text-purple-800'
            }`}>
              {relation}
            </span>
            <span className="text-xs text-gray-500 leading-tight">{userType} User</span>
            {isPediatric && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold leading-tight bg-blue-100 text-blue-800">
                Pediatric
              </span>
            )}
          </div>
        </div>
        <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
          <Image src={AVATAR} alt="user" width={56} height={56} className="rounded-full object-cover" />
        </div>
      </div>

      {/* Stats and Chart Section */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Left Side - Stats */}
        <div className="flex flex-col justify-center space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="bg-orange-100 rounded-lg p-1.5 flex-shrink-0 w-8 h-8 flex items-center justify-center">
              <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="text-base font-bold text-gray-900 leading-tight">{reportsCount}</div>
              <div className="text-xs text-gray-500 leading-tight mt-0.5">Uploaded Reports</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="bg-blue-100 rounded-lg p-1.5 flex-shrink-0 w-8 h-8 flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="text-base font-bold text-gray-900 leading-tight">{sharedWithCount}</div>
              <div className="text-xs text-gray-500 leading-tight mt-0.5">Shared with</div>
            </div>
          </div>
        </div>

        {/* Right Side - Donut Chart */}
        <div className="flex items-center justify-center">
          <div className="relative w-24 h-24 flex items-center justify-center">
            <Doughnut data={chartData} options={chartOptions} />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xs text-gray-500 leading-tight">Diagnosed</span>
              <span className="text-xs text-gray-500 leading-tight">Conditions</span>
            </div>
          </div>
        </div>
      </div>

      {/* Shared With Avatars */}
      {member?.sharedWith?.length > 0 && (
        <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-gray-100">
          <div className="flex -space-x-2 flex-shrink-0">
            {member.sharedWith
              .filter((item: any) => {
                // Filter out any objects that might be condition objects or invalid data
                if (typeof item === 'object' && item !== null) {
                  // If it has condition/date/_id but no id/display, it's likely a condition object
                  if (item.condition && item.date && item._id && !item.id && !item.display) {
                    return false;
                  }
                }
                return true;
              })
              .slice(0, 4)
              .map((item: any, index: number) => {
                // Use a stable key - prefer id if available, otherwise use index
                const key = typeof item === 'object' && item?.id ? item.id : index;
                return (
                  <div key={key} className="w-7 h-7 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center overflow-hidden">
                    <Image
                      src={AVATAR}
                      className="rounded-full object-cover"
                      alt="avatar"
                      width={28}
                      height={28}
                    />
                  </div>
                );
              })}
            {member.sharedWith.length > 4 && (
              <div className="w-7 h-7 rounded-full border-2 border-white bg-purple-100 flex items-center justify-center">
                <span className="text-xs font-semibold text-purple-700 leading-tight">+{member.sharedWith.length - 4}</span>
              </div>
            )}
          </div>
          <span className="text-xs text-gray-500 leading-tight">Shared with</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 mt-auto">
        <button
          onClick={() => handleViewMember(member._id)}
          className="flex-1 min-w-[70px] rounded-lg border-2 border-purple-600 text-purple-600 px-3 py-2 hover:bg-purple-50 transition-colors font-medium text-xs leading-tight cursor-pointer"
        >
          View
        </button>
        {!shared && (
          <>
            <button
              onClick={() => {
                // Navigate to member details page with Reports tab open
                handleUploadReports(member._id);
              }}
              className="flex-1 min-w-[70px] rounded-lg bg-[#A8D96D] text-gray-800 px-3 py-2 hover:bg-[#98C95D] transition-colors font-medium text-xs leading-tight cursor-pointer"
            >
              Upload Reports
            </button>
            {relation !== 'Self' && (
              <>
                <button
                  onClick={() => {
                    if (onShare) {
                      onShare(member._id);
                    } else {
                      setMemberDetail(member._id);
                    }
                  }}
                  className="flex-1 min-w-[70px] rounded-lg bg-[#FFB380] text-gray-800 px-3 py-2 hover:bg-[#FFA370] transition-colors font-medium text-xs leading-tight cursor-pointer"
                >
                  Share
                </button>
                {onDelete && (
                  <button
                    onClick={() => onDelete(member._id)}
                    className="px-3 py-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors font-medium text-xs leading-tight cursor-pointer flex items-center justify-center"
                    title="Remove Member"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

