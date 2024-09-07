'use client';

import React, { useState } from 'react';
import { useSetRecoilState, useRecoilValue } from 'recoil';
import { dashTabs } from '@/components/common/recoil/dashboard';
import { memberDetail } from '@/components/common/recoil/member';
import orderBy from 'lodash/orderBy';

interface MemberTableProps {
  members: any[];
  onView?: (memberId: string) => void;
  onEdit?: (memberId: string) => void;
  onDelete?: (memberId: string) => void;
  onShare?: (memberId: string) => void;
  onSort?: (sortKey: string, direction: 'asc' | 'desc') => void;
}

interface TableHeaderConfig {
  name: string;
  dob: string;
  relation: string;
  diagnosedCondition: string;
  documentsUploaded: string;
  documentShared: string;
  isPediatric: string;
  profileSharedWith: string;
  action: string;
}

const getTableHeaders = (tab: string): TableHeaderConfig => {
  const headerMap: Record<string, TableHeaderConfig> = {
    'Members': {
      name: 'Name',
      dob: 'DOB',
      relation: 'Relation',
      diagnosedCondition: 'Diagnosed Condition',
      documentsUploaded: 'Reports Uploaded',
      documentShared: 'Reports Shared',
      isPediatric: 'Is Pediatric',
      profileSharedWith: 'Profile Shared with',
      action: 'Action',
    },
    'Reports': {
      name: 'Member Name',
      dob: 'Report Date',
      relation: 'Report Type',
      diagnosedCondition: 'Test Name',
      documentsUploaded: 'Status',
      documentShared: 'Uploaded Date',
      isPediatric: 'Priority',
      profileSharedWith: 'Shared With',
      action: 'Actions',
    },
    'Analytics': {
      name: 'Metric Name',
      dob: 'Date',
      relation: 'Category',
      diagnosedCondition: 'Value',
      documentsUploaded: 'Trend',
      documentShared: 'Change',
      isPediatric: 'Status',
      profileSharedWith: 'Source',
      action: 'View',
    },
  };
  return headerMap[tab] || headerMap['Members'];
};

type SortField = 'name' | 'dob' | 'relation' | 'isPediatric' | null;
type SortDirection = 'asc' | 'desc' | null;

export default function MemberTable({ members, onView, onEdit, onDelete, onShare, onSort }: MemberTableProps) {
  const setDash = useSetRecoilState(dashTabs);
  const setMemberDetail = useSetRecoilState(memberDetail);
  const currentTab = useRecoilValue(dashTabs);
  const headers = getTableHeaders(currentTab);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showFilters, setShowFilters] = useState(false);
  const [subscriptionFilter, setSubscriptionFilter] = useState<string>('all'); // 'all', 'Free', or 'Paid'
  const [typeFilter, setTypeFilter] = useState<string>('all'); // 'all', 'Adult', or 'Pediatric'
  const [hoveredConditionIndex, setHoveredConditionIndex] = useState<number | null>(null);

  const handleView = (memberId: string) => {
    if (onView) {
      onView(memberId);
    } else {
      setMemberDetail(memberId);
      setDash('MemberDetails');
    }
  };

  const handleEdit = (memberId: string) => {
    if (onEdit) {
      onEdit(memberId);
    } else {
      setMemberDetail(memberId);
    }
  };

  const handleDelete = (memberId: string) => {
    if (onDelete) {
      onDelete(memberId);
    } else {
      if (confirm('Are you sure you want to delete this member?')) {
        // TODO: Implement delete functionality
      }
    }
  };

  const handleShare = (memberId: string) => {
    if (onShare) {
      onShare(memberId);
    } else {
      setMemberDetail(memberId);
      // TODO: Implement share functionality
    }
  };

  const handleSort = (field: SortField) => {
    if (field === null) return;
    
    let newDirection: SortDirection = 'asc';
    if (sortField === field && sortDirection === 'asc') {
      newDirection = 'desc';
    } else if (sortField === field && sortDirection === 'desc') {
      newDirection = null;
      setSortField(null);
      setSortDirection(null);
      if (onSort) onSort('', 'asc');
      return;
    }
    
    setSortField(field);
    setSortDirection(newDirection);
    
    if (onSort) {
      onSort(field, newDirection);
    }
  };

  const formatDate = (dob: string | Date) => {
    if (!dob) return 'N/A';
    const date = new Date(dob);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 text-gray-400 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    if (sortDirection === 'asc') {
      return (
        <svg className="w-4 h-4 text-blue-600 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4 text-blue-600 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  const filteredAndSortedMembers = React.useMemo(() => {
    let filtered = [...members];

    // Apply subscription filter - mutually exclusive
    if (subscriptionFilter !== 'all') {
      filtered = filtered.filter((member) => {
        // Handle null/undefined subscription - default to 'Free'
        const memberSub = (member.subscription === 'Free' || !member.subscription) ? 'Free' : 'Paid';
        return memberSub === subscriptionFilter;
      });
    }

    // Apply type filter - mutually exclusive
    if (typeFilter !== 'all') {
      filtered = filtered.filter((member) => {
        // Handle null/undefined isPediatric - default to 'Adult'
        const memberType = member.isPediatric === true ? 'Pediatric' : 'Adult';
        return memberType === typeFilter;
      });
    }

    // Apply sorting - always put Self first, then apply other sorting
    if (sortField && sortDirection) {
      // First, separate Self and non-Self members
      const selfMembers = filtered.filter((member) => member.relation === 'Self');
      const otherMembers = filtered.filter((member) => member.relation !== 'Self');
      
      // Sort each group separately
      let sortedSelf: any[] = [];
      let sortedOther: any[] = [];
      
      if (sortField === 'name') {
        sortedSelf = orderBy(selfMembers, [
          (member) => (member.firstName || '').toLowerCase(),
          (member) => (member.lastName || '').toLowerCase()
        ], [sortDirection, sortDirection]);
        sortedOther = orderBy(otherMembers, [
          (member) => (member.firstName || '').toLowerCase(),
          (member) => (member.lastName || '').toLowerCase()
        ], [sortDirection, sortDirection]);
      } else if (sortField === 'dob') {
        sortedSelf = orderBy(selfMembers, ['dob'], [sortDirection]);
        sortedOther = orderBy(otherMembers, ['dob'], [sortDirection]);
      } else if (sortField === 'relation') {
        sortedSelf = orderBy(selfMembers, [(member) => (member.relation || '').toLowerCase()], [sortDirection]);
        sortedOther = orderBy(otherMembers, [(member) => (member.relation || '').toLowerCase()], [sortDirection]);
      } else if (sortField === 'isPediatric') {
        sortedSelf = orderBy(selfMembers, ['isPediatric'], [sortDirection === 'asc' ? 'asc' : 'desc']);
        sortedOther = orderBy(otherMembers, ['isPediatric'], [sortDirection === 'asc' ? 'asc' : 'desc']);
      } else {
        // For any other sort field, just sort normally but keep Self first
        sortedSelf = selfMembers;
        sortedOther = orderBy(otherMembers, [sortField], [sortDirection]);
      }
      
      // Combine: Self members first, then others
      filtered = [...sortedSelf, ...sortedOther];
    } else {
      // If no sorting, still put Self first
      const selfMembers = filtered.filter((member) => member.relation === 'Self');
      const otherMembers = filtered.filter((member) => member.relation !== 'Self');
      filtered = [...selfMembers, ...otherMembers];
    }

    return filtered;
  }, [members, subscriptionFilter, typeFilter, sortField, sortDirection]);

  const handleSubscriptionFilter = (value: string) => {
    // If clicking the same value, toggle to 'all', otherwise set to the new value
    setSubscriptionFilter((prev) => prev === value ? 'all' : value);
  };

  const handleTypeFilter = (value: string) => {
    // If clicking the same value, toggle to 'all', otherwise set to the new value
    setTypeFilter((prev) => prev === value ? 'all' : value);
  };

  const resetFilters = () => {
    setSubscriptionFilter('all');
    setTypeFilter('all');
    setSortField(null);
    setSortDirection(null);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (subscriptionFilter !== 'all') count++;
    if (typeFilter !== 'all') count++;
    if (sortField) count++;
    return count;
  };

  const hasActiveFilters = getActiveFilterCount() > 0;

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 overflow-hidden w-full">
      {/* Filter Bar */}
      <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 sm:px-3 py-2.5 sm:py-1.5 text-sm sm:text-sm font-medium rounded-lg transition-colors tap-target ${
              hasActiveFilters
                ? 'bg-gray-900 dark:bg-gray-700 text-white border border-gray-900 dark:border-gray-700'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters
            {hasActiveFilters && (
              <span className="ml-1 px-1.5 py-0.5 text-xs font-semibold bg-white dark:bg-gray-600 text-gray-900 dark:text-white rounded-full">
                {getActiveFilterCount()}
              </span>
            )}
            {showFilters ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </button>

          {showFilters && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Subscription:</span>
                <label className="flex items-center cursor-pointer group">
                  <input
                    type="radio"
                    name="subscription"
                    checked={subscriptionFilter === 'Free'}
                    onChange={() => handleSubscriptionFilter('Free')}
                    className="mr-1.5 w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                  />
                  <span className={`text-sm ${subscriptionFilter === 'Free' ? 'text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
                    Free
                  </span>
                </label>
                <label className="flex items-center cursor-pointer group ml-2">
                  <input
                    type="radio"
                    name="subscription"
                    checked={subscriptionFilter === 'Paid'}
                    onChange={() => handleSubscriptionFilter('Paid')}
                    className="mr-1.5 w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                  />
                  <span className={`text-sm ${subscriptionFilter === 'Paid' ? 'text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
                    Paid
                  </span>
                </label>
                <label className="flex items-center cursor-pointer group ml-2">
                  <input
                    type="radio"
                    name="subscription"
                    checked={subscriptionFilter === 'all'}
                    onChange={() => handleSubscriptionFilter('all')}
                    className="mr-1.5 w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                  />
                  <span className={`text-sm ${subscriptionFilter === 'all' ? 'text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
                    All
                  </span>
                </label>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Type:</span>
                <label className="flex items-center cursor-pointer group">
                  <input
                    type="radio"
                    name="type"
                    checked={typeFilter === 'Adult'}
                    onChange={() => handleTypeFilter('Adult')}
                    className="mr-1.5 w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                  />
                  <span className={`text-sm ${typeFilter === 'Adult' ? 'text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
                    Adult
                  </span>
                </label>
                <label className="flex items-center cursor-pointer group ml-2">
                  <input
                    type="radio"
                    name="type"
                    checked={typeFilter === 'Pediatric'}
                    onChange={() => handleTypeFilter('Pediatric')}
                    className="mr-1.5 w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                  />
                  <span className={`text-sm ${typeFilter === 'Pediatric' ? 'text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
                    Pediatric
                  </span>
                </label>
                <label className="flex items-center cursor-pointer group ml-2">
                  <input
                    type="radio"
                    name="type"
                    checked={typeFilter === 'all'}
                    onChange={() => handleTypeFilter('all')}
                    className="mr-1.5 w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                  />
                  <span className={`text-sm ${typeFilter === 'all' ? 'text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
                    All
                  </span>
                </label>
              </div>

              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  title="Reset all filters"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Reset
                </button>
              )}
            </div>
          )}
        </div>

        <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 text-center sm:text-left mt-2 sm:mt-0">
          Showing <span className="font-semibold text-gray-900 dark:text-gray-100">{filteredAndSortedMembers.length}</span> of <span className="font-semibold text-gray-900 dark:text-gray-100">{members.length}</span> members
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
        {filteredAndSortedMembers.length > 0 ? (
          filteredAndSortedMembers.map((member, index) => {
            const memberName = member?.firstName 
              ? `${member.firstName} ${member.lastName || ''}`.trim()
              : 'User Name';
            const dob = formatDate(member?.dob);
            const relation = member?.relation || (member?.userType === 'Primary' ? 'Self' : 'N/A');
            const diagnosedConditions = member?.diagnosedCondition || [];
            const documentsUploaded = member?.reports?.length || 0;
            const sharedWith = member?.sharedWith || [];

            return (
              <div key={member._id || index} className="p-4 sm:p-5 bg-white dark:bg-gray-800">
                <div className="flex items-start justify-between mb-3 gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1.5 truncate">{memberName}</h3>
                    <div className="flex flex-wrap gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      <span>{dob}</span>
                      <span>•</span>
                      <span>{relation}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleView(member._id)}
                      className="p-2.5 sm:p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-lg transition-colors tap-target"
                      title="View"
                    >
                      <svg className="w-5 h-5 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleEdit(member._id)}
                      className="p-2.5 sm:p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900 rounded-lg transition-colors tap-target"
                      title="Edit"
                    >
                      <svg className="w-5 h-5 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    {member.relation !== 'Self' && (
                      <>
                        <button
                          onClick={() => handleDelete(member._id)}
                          className="p-2.5 sm:p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg transition-colors tap-target"
                          title="Delete"
                        >
                          <svg className="w-5 h-5 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </>
                    )}
                    {member.relation !== 'Self' && (
                      <button
                        onClick={() => handleShare(member._id)}
                        className="p-2.5 sm:p-2 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900 rounded-lg transition-colors tap-target"
                        title="Share"
                      >
                        <svg className="w-5 h-5 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="space-y-3 sm:space-y-2 text-sm sm:text-sm">
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300 text-sm sm:text-sm">{headers.diagnosedCondition}:</span>
                    <div className="flex flex-wrap gap-1.5 mt-1 items-center">
                      {diagnosedConditions.length > 0 ? (
                        <>
                          {diagnosedConditions.slice(0, 10).map((condition: any, idx: number) => {
                            const conditionText = typeof condition === 'string' 
                              ? condition 
                              : (condition?.condition || condition);
                            return (
                              <span
                                key={idx}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                              >
                                {conditionText}
                              </span>
                            );
                          })}
                          {diagnosedConditions.length > 10 && (
                            <div className="relative">
                              <span 
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                onMouseEnter={() => setHoveredConditionIndex(index)}
                                onMouseLeave={() => setHoveredConditionIndex(null)}
                              >
                                +{diagnosedConditions.length - 10} more...
                              </span>
                              {hoveredConditionIndex === index && (
                                <div 
                                  className="absolute z-50 mt-2 left-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 max-w-xs max-h-64 overflow-y-auto"
                                  style={{ minWidth: '200px' }}
                                  onMouseEnter={() => setHoveredConditionIndex(index)}
                                  onMouseLeave={() => setHoveredConditionIndex(null)}
                                >
                                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">All Diagnosed Conditions ({diagnosedConditions.length}):</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {diagnosedConditions.map((condition: any, idx: number) => {
                                      const conditionText = typeof condition === 'string' 
                                        ? condition 
                                        : (condition?.condition || condition);
                                      return (
                                        <span
                                          key={idx}
                                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                                        >
                                          {conditionText}
                                        </span>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-500">---</span>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">{headers.documentsUploaded}:</span>
                    <span className="ml-2 text-gray-600 dark:text-gray-400">{documentsUploaded}</span>
                  </div>
                  
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">{headers.profileSharedWith}:</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {sharedWith.length > 0 ? (
                        sharedWith.map((sharedItem: any, idx: number) => {
                          const displayText = typeof sharedItem === 'string' 
                            ? (sharedItem.startsWith('+') ? sharedItem : sharedItem)
                            : (sharedItem.display || sharedItem.name || sharedItem.id || sharedItem);
                          const isPhone = typeof sharedItem === 'string' 
                            ? sharedItem.startsWith('+')
                            : (sharedItem.type === 'phone' || sharedItem.id?.startsWith('+'));
                          const isDoctor = typeof sharedItem === 'object' && sharedItem.isDoctor;
                          return (
                            <span
                              key={idx}
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                isPhone
                                  ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                                  : isDoctor
                                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                                  : 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
                              }`}
                            >
                              {displayText}
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-500">---</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            No members found matching your filters.
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto w-full">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-white">
            <tr>
              <th
                className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center">
                  {headers.name}
                  <SortIcon field="name" />
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                onClick={() => handleSort('dob')}
              >
                <div className="flex items-center">
                  {headers.dob}
                  <SortIcon field="dob" />
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                onClick={() => handleSort('relation')}
              >
                <div className="flex items-center">
                  {headers.relation}
                  <SortIcon field="relation" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                {headers.diagnosedCondition}
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                {headers.documentsUploaded}
              </th>
              {/* Reports Shared - Removed */}
              {/* <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                {headers.documentShared}
              </th> */}
              {/* Is Pediatric - Commented out for now */}
              {/* <th
                className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                onClick={() => handleSort('isPediatric')}
              >
                <div className="flex items-center">
                  {headers.isPediatric}
                  <SortIcon field="isPediatric" />
                </div>
              </th> */}
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                {headers.profileSharedWith}
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                {headers.action}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredAndSortedMembers.length > 0 ? (
              filteredAndSortedMembers.map((member, index) => {
                const memberName = member?.firstName 
                  ? `${member.firstName} ${member.lastName || ''}`.trim()
                  : 'User Name';
                const dob = formatDate(member?.dob);
                const relation = member?.relation || (member?.userType === 'Primary' ? 'Self' : 'N/A');
                const diagnosedConditions = member?.diagnosedCondition || [];
                const documentsUploaded = member?.reports?.length || 0;
                const documentsShared = member?.sharedReports?.length || 0;
                const isPediatric = member?.isPediatric ? 'Yes' : 'No';
                const sharedWith = member?.sharedWith || [];

                return (
                  <tr key={member._id || index} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap border-b border-gray-200 dark:border-gray-700">
                      <div className="font-semibold text-sm md:text-base text-gray-900 dark:text-gray-100">{memberName}</div>
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap border-b border-gray-200 dark:border-gray-700">
                      <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400">{dob}</span>
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap border-b border-gray-200 dark:border-gray-700">
                      <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400">{relation}</span>
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {diagnosedConditions.length > 0 ? (
                          <>
                            {diagnosedConditions.slice(0, 10).map((condition: any, idx: number) => {
                              // Handle both object format {condition: "..."} and string format
                              const conditionText = typeof condition === 'string' 
                                ? condition 
                                : (condition?.condition || condition);
                              
                              return (
                                <span
                                  key={idx}
                                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700"
                                >
                                  {conditionText}
                                </span>
                              );
                            })}
                            {diagnosedConditions.length > 10 && (
                              <div className="relative">
                                <span 
                                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                  onMouseEnter={() => setHoveredConditionIndex(index)}
                                  onMouseLeave={() => setHoveredConditionIndex(null)}
                                >
                                  +{diagnosedConditions.length - 10} more...
                                </span>
                                {hoveredConditionIndex === index && (
                                  <div 
                                    className="absolute z-50 mt-2 left-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 max-w-xs max-h-64 overflow-y-auto"
                                    style={{ minWidth: '200px' }}
                                    onMouseEnter={() => setHoveredConditionIndex(index)}
                                    onMouseLeave={() => setHoveredConditionIndex(null)}
                                  >
                                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">All Diagnosed Conditions ({diagnosedConditions.length}):</p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {diagnosedConditions.map((condition: any, idx: number) => {
                                        const conditionText = typeof condition === 'string' 
                                          ? condition 
                                          : (condition?.condition || condition);
                                        return (
                                          <span
                                            key={idx}
                                            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700"
                                          >
                                            {conditionText}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-sm text-gray-400 dark:text-gray-500">---</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap border-b border-gray-200 dark:border-gray-700">
                      <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400">{documentsUploaded}</span>
                    </td>
                    {/* Reports Shared - Removed */}
                    {/* <td className="px-6 py-4 whitespace-nowrap border-b border-gray-200 dark:border-gray-700">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{documentsShared}</span>
                    </td> */}
                    {/* Is Pediatric - Commented out for now */}
                    {/* <td className="px-6 py-4 whitespace-nowrap border-b border-gray-200 dark:border-gray-700">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{isPediatric}</span>
                    </td> */}
                    <td className="px-3 md:px-6 py-3 md:py-4 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex flex-wrap gap-1 md:gap-1.5">
                        {sharedWith.length > 0 ? (
                          sharedWith.map((sharedItem: any, idx: number) => {
                            // Handle both new format (object with display) and old format (string)
                            const displayText = typeof sharedItem === 'string' 
                              ? (sharedItem.startsWith('+') ? sharedItem : sharedItem)
                              : (sharedItem.display || sharedItem.name || sharedItem.id || sharedItem);
                            
                            const isPhone = typeof sharedItem === 'string' 
                              ? sharedItem.startsWith('+')
                              : (sharedItem.type === 'phone' || sharedItem.id?.startsWith('+'));
                            
                            const isDoctor = typeof sharedItem === 'object' && sharedItem.isDoctor;
                            
                            return (
                              <span
                                key={idx}
                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                  isPhone
                                    ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-700'
                                    : isDoctor
                                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-700'
                                    : 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-700'
                                }`}
                                title={
                                  isPhone 
                                    ? 'Pending - User not registered yet' 
                                    : isDoctor 
                                    ? 'Shared with doctor' 
                                    : 'Shared with user'
                                }
                              >
                                {displayText}
                                {isPhone && (
                                  <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                )}
                                {isDoctor && !isPhone && (
                                  <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                  </svg>
                                )}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-sm text-gray-400 dark:text-gray-500">---</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap text-sm border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-1.5 md:gap-2">
                        <button
                          onClick={() => handleView(member._id)}
                          className="p-1.5 md:p-0 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900 rounded transition-colors tap-target"
                          title="View"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleEdit(member._id)}
                          className="p-1.5 md:p-0 text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900 rounded transition-colors tap-target"
                          title="Edit"
                        >
                          <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {member.relation !== 'Self' && (
                          <>
                            <button
                              onClick={() => handleDelete(member._id)}
                              className="p-1.5 md:p-0 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900 rounded transition-colors tap-target"
                              title="Delete"
                            >
                              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </>
                        )}
                        {member.relation !== 'Self' && (
                          <button
                            onClick={() => handleShare(member._id)}
                            className="p-1.5 md:p-0 text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900 rounded transition-colors tap-target"
                            title="Share"
                          >
                            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                  No members found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
