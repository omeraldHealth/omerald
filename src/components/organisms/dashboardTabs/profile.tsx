'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Image from 'next/image';
import { PencilIcon, PhoneIcon, XMarkIcon, PlusIcon, ArrowLeftIcon } from '@heroicons/react/24/solid';
import { AVATAR } from '@/components/common/lib/constants/constants';
import { useUpdateProfile } from '@/hooks/reactQuery/profile';
import toast from 'react-hot-toast';
import { updateProfile, analyzeBodyImpact, analyzeBodyCoordinates, analyzeDiagnosedConditions } from '@/components/common/lib/constants/urls';
import { useAuthContext } from '@/components/common/utils/context/auth.context';
import { useGetManyReports } from '@/hooks/reactQuery/reports';
import { useSetRecoilState } from 'recoil';
import { dashTabs } from '@/components/common/recoil/dashboard';
import { memberDetail } from '@/components/common/recoil/member';
import { getSubscriptionPlan } from '@/lib/utils/subscription';
import axios from 'axios';
import ReactSpeedometer from 'react-d3-speedometer';
import { EyeIcon, ShareIcon, TrashIcon } from '@heroicons/react/24/solid';
import { useQueryClient } from '@tanstack/react-query';
import ViewReportModal from '@/components/molecules/ViewReportModal';
import EditReportModal from '@/components/molecules/EditReportModal';
import ShareReportModal from '@/components/molecules/ShareReportModal';
import AddReportModal from '@/components/molecules/AddReportModal';
import { deleteReport } from '@/components/common/lib/constants/urls';
import BodyImpactVisualization from '@/components/molecules/BodyImpactVisualization';
import ProfileInfoCard from '@/components/molecules/dashboards/ProfileInfoCard';
import EditMemberModal from '@/components/molecules/EditMemberModal';
import AddMemberModal from '@/components/molecules/AddMemberModal';
import MarkVaccineCompletedModal from '@/components/molecules/MarkVaccineCompletedModal';
import { useGetMembersByIds } from '@/hooks/reactQuery/profile';
import { useGetAllVaccineData } from '@/hooks/reactQuery/vaccines';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

type TabType = 'overview' | 'reports' | 'bodyImpact' | 'bmi' | 'muac' | 'anthropometric' | 'immunization' | 'iap' | 'foodAllergies';

interface ProfileProps {
  member?: any; // Optional member prop - if provided, use this instead of current user's profile
  onBack?: () => void; // Optional back button handler for member view
}

const Profile = ({ member: memberProp, onBack }: ProfileProps = {}) => {
  const { profile: profileDataFromContext, refreshProfile } = useAuthContext();
  
  // Use member prop if provided, otherwise use current user's profile
  const profileData = memberProp || profileDataFromContext;
  const isMemberView = !!memberProp;
  
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showEditForm, setShowEditForm] = useState(false);
  const [isAnalyzingBodyImpact, setIsAnalyzingBodyImpact] = useState(false);
  const [isAnalyzingConditions, setIsAnalyzingConditions] = useState(false);
  // Removed: Conditions are now auto-added, no need for suggestions UI
  // const [suggestedConditions, setSuggestedConditions] = useState<any[]>([]);
  // const [showSuggestedConditions, setShowSuggestedConditions] = useState(false);
  const setDash = useSetRecoilState(dashTabs);
  const queryClient = useQueryClient();

  // Get reports for the profile
  const users: string[] = [];
  if (profileData?.phoneNumber) {
    users.push(profileData.phoneNumber);
  }
  const { data: reports = [] } = useGetManyReports(users.length > 0 ? users : undefined);

  const calculateAge = (dob: string | Date) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const age = profileData?.dob ? calculateAge(profileData.dob) : null;
  const diagnosedConditions = profileData?.diagnosedCondition || [];
  const sharedWithCount = profileData?.sharedWith?.length || 0;
  const isPediatric = profileData?.isPediatric || false;

  const allTabs = [
    { id: 'overview' as TabType, label: 'Overview', color: 'blue' },
    { id: 'reports' as TabType, label: 'Reports', color: 'blue' },
    { id: 'bodyImpact' as TabType, label: 'Body Impact', color: 'orange' },
    { id: 'bmi' as TabType, label: 'BMI', color: 'purple' },
    { id: 'muac' as TabType, label: 'MUAC', color: 'green' },
    { id: 'anthropometric' as TabType, label: 'Anthropometric', color: 'indigo' },
    { id: 'immunization' as TabType, label: 'Immunization Schedule', color: 'yellow' },
    { id: 'iap' as TabType, label: 'IAP Growth Charts', color: 'pink' },
    { id: 'foodAllergies' as TabType, label: 'Food Allergies', color: 'red' },
  ];

  // Filter out pediatric-only tabs for non-pediatric members
  const pediatricOnlyTabs = ['muac', 'immunization', 'anthropometric', 'iap'];
  const tabs = isPediatric 
    ? allTabs.filter(tab => tab.id !== 'bodyImpact')
    : allTabs.filter(tab => !pediatricOnlyTabs.includes(tab.id) && tab.id !== 'bodyImpact');

  // Calculate health score
  const calculateHealthScore = () => {
    const bmiScore = profileData?.bmi?.length > 0 ? 80 : 50;
    const reportScore = reports.length > 0 ? 70 : 40;
    return Math.min(Math.round((bmiScore + reportScore) / 2), 100);
  };

  const healthScore = calculateHealthScore();

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Process reports data for chart
  const reportsByMonthData = useMemo(() => {
    const reportsByMonth: { [key: string]: number } = {};
    
    reports.forEach((r: any) => {
      const date = r.reportDate || r.uploadDate || r.uploadedAt || r.createdAt;
      if (date) {
        const month = new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        reportsByMonth[month] = (reportsByMonth[month] || 0) + 1;
      }
    });

    // Sort months chronologically
    const sortedMonths = Object.keys(reportsByMonth).sort((a, b) => {
      return new Date(a).getTime() - new Date(b).getTime();
    });

    return {
      labels: sortedMonths.length > 0 ? sortedMonths : ['No Data'],
      values: sortedMonths.length > 0 ? sortedMonths.map(month => reportsByMonth[month]) : [0],
    };
  }, [reports]);

  // Chart configuration for Reports vs Time
  const reportsChartConfig = {
    labels: reportsByMonthData.labels,
    datasets: [
      {
        label: 'Reports Uploaded',
        data: reportsByMonthData.values,
        borderColor: 'rgb(64, 24, 157)',
        backgroundColor: 'rgba(64, 24, 157, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgb(64, 24, 157)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
      },
    ],
  };

  const reportsChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 14,
          weight: 'bold' as const,
        },
        bodyFont: {
          size: 13,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          precision: 0,
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  // Redirect non-paediatric users away from pediatric-only tabs
  useEffect(() => {
    if (profileData && !isPediatric && (activeTab === 'muac' || activeTab === 'immunization' || activeTab === 'anthropometric' || activeTab === 'iap')) {
      setActiveTab('overview');
    }
  }, [isPediatric, activeTab, profileData]);

  const handleUpdateProfile = async (updateData: any) => {
    try {
      await axios.put(updateProfile, { id: profileData?._id, ...updateData });
      if (isMemberView) {
        // If viewing a member, invalidate the member query
        queryClient.invalidateQueries({ queryKey: ['getProfileById', profileData?._id] });
      } else {
        // If viewing own profile, refresh context
        await refreshProfile();
        queryClient.invalidateQueries({ queryKey: ['getProfileByPhone', profileData?.phoneNumber] });
      }
      toast.success('Updated successfully!');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Update failed');
    }
  };

  const handleAnalyzeBodyImpact = async (silent = false) => {
    if (!profileData?._id) return;
    
    setIsAnalyzingBodyImpact(true);
    try {
      const response = await axios.post(analyzeBodyImpact, { id: profileData._id });
      if (isMemberView) {
        // If viewing a member, invalidate the member query
        queryClient.invalidateQueries({ queryKey: ['getProfileById', profileData?._id] });
      } else {
        // If viewing own profile, refresh context
        await refreshProfile();
        queryClient.invalidateQueries({ queryKey: ['getProfileByPhone', profileData?.phoneNumber] });
      }
      if (!silent) {
        toast.success(`Analysis complete! ${response.data.totalAffectedParts || 0} body parts affected.`);
      }
    } catch (error: any) {
      if (!silent) {
        toast.error(error?.response?.data?.error || 'Failed to analyze body impact');
      }
      console.error('Body impact analysis error:', error);
    } finally {
      setIsAnalyzingBodyImpact(false);
    }
  };

  const handleAnalyzeDiagnosedConditions = useCallback(async (silent = false) => {
    if (!profileData?._id) {
      if (!silent) {
        toast.error('Profile ID is required');
      }
      return;
    }
    
    setIsAnalyzingConditions(true);
    try {
      console.log('Analyzing diagnosed conditions for profile:', profileData._id);
      const response = await axios.post(analyzeDiagnosedConditions, { id: profileData._id });
      console.log('Analysis response:', response.data);
      
      if (response.data.success) {
        const autoAdded = response.data.autoAddedConditions || [];
        
        // Store report patterns in localStorage if provided
        if (response.data.reportPatterns && Array.isArray(response.data.reportPatterns)) {
          const { storeReportPattern } = require('@/lib/utils/report-storage');
          const userId = profileData?.phoneNumber || profileData?._id?.toString();
          
          if (userId) {
            response.data.reportPatterns.forEach((pattern: any) => {
              storeReportPattern(userId, {
                ...pattern,
                userId,
                scannedAt: pattern.scannedAt || new Date().toISOString(),
              });
            });
          }
        }
        
        // Always refresh profile since conditions are auto-added
        if (isMemberView) {
          // If viewing a member, invalidate the member query
          queryClient.invalidateQueries({ queryKey: ['getProfileById', profileData?._id] });
        } else {
          // If viewing own profile, refresh context
          await refreshProfile();
          queryClient.invalidateQueries({ queryKey: ['getProfileByPhone', profileData?.phoneNumber] });
        }
        
        if (autoAdded.length > 0) {
          if (!silent) {
            toast.success(
              `Added ${autoAdded.length} diagnosed condition(s) from reports!${response.data.bodyImpactUpdated ? ' Body impact analysis updated.' : ''}`
            );
          }
        } else if (!silent) {
          toast.success(
            `No new diagnosed conditions found in reports.${response.data.bodyImpactUpdated ? ' Body impact analysis updated.' : ''}`
          );
        }
      } else {
        if (!silent) {
          toast.error(response.data.error || 'Analysis completed but no conditions found');
        }
      }
    } catch (error: any) {
      console.error('Diagnosed conditions analysis error:', error);
      if (!silent) {
        const errorMessage = error?.response?.data?.error 
          || error?.response?.data?.message
          || error?.message 
          || 'Failed to analyze diagnosed conditions';
        toast.error(errorMessage);
      }
    } finally {
      setIsAnalyzingConditions(false);
    }
  }, [profileData?._id, profileData?.phoneNumber, refreshProfile, queryClient]);

  // Removed: Conditions are now auto-added, no manual approval needed
  // const handleAddSuggestedConditions = async () => { ... }

  // Auto-analyze diagnosed conditions from reports when reports are loaded
  // Only trigger if report count has increased (new reports added)
  const analyzedProfileRef = useRef<string | null>(null);
  const lastReportCountRef = useRef<number>(0);
  const scanTriggeredRef = useRef<boolean>(false);
  
  useEffect(() => {
    const profileId = profileData?._id;
    const userId = profileData?.phoneNumber || profileId;
    
    if (!userId) return;
    
    // Reset scan trigger when profile changes
    if (analyzedProfileRef.current !== profileId) {
      analyzedProfileRef.current = profileId;
      scanTriggeredRef.current = false;
      lastReportCountRef.current = 0;
    }
    
    if (reports && reports.length > 0 && !isAnalyzingConditions) {
      // Check if report count has increased using localStorage
      const { hasReportCountIncreased, storeReportCount } = require('@/lib/utils/report-storage');
      
      const currentReportCount = reports.length;
      const lastReportCount = lastReportCountRef.current;
      
      // Check both localStorage and ref to detect changes
      const localStorageCheck = hasReportCountIncreased(userId, currentReportCount);
      const countIncreased = currentReportCount > lastReportCount;
      const shouldAnalyze = localStorageCheck || (countIncreased && !scanTriggeredRef.current);
      
      // Update ref
      lastReportCountRef.current = currentReportCount;
      
      // Only analyze if report count increased
      if (shouldAnalyze) {
        scanTriggeredRef.current = true;
        
        // Show alert that intelligent scanning is starting
        const newReportsCount = currentReportCount - lastReportCount;
        const message = lastReportCount === 0
          ? `🔍 Intelligent scan triggered! Analyzing ${currentReportCount} report(s) for diagnostic conditions...`
          : `🔍 Intelligent scan triggered! Detected ${newReportsCount} new report(s) (${currentReportCount} total). Analyzing for diagnostic conditions...`;
        
        toast.success(message, {
          duration: 4000,
          icon: '🤖',
          style: {
            background: '#10b981',
            color: '#fff',
          },
        });
        
        // Small delay to ensure reports are fully loaded after refetch
        const timeoutId = setTimeout(() => {
          console.log('Triggering scan due to report count increase (profile):', {
            userId,
            currentCount: currentReportCount,
            lastCount: lastReportCount,
            localStorageCheck,
            countIncreased,
          });
          handleAnalyzeDiagnosedConditions(true); // Silent mode - don't show toast
          // Reset trigger after a delay to allow re-triggering if needed
          setTimeout(() => {
            scanTriggeredRef.current = false;
          }, 5000);
        }, 1000); // 1 second delay to ensure reports are fully loaded
        
        return () => clearTimeout(timeoutId);
      } else {
        // Update stored count even if not analyzing (in case it was reset)
        storeReportCount(userId, currentReportCount);
      }
    } else if (reports && reports.length === 0) {
      // Reset count if no reports
      const { storeReportCount } = require('@/lib/utils/report-storage');
      storeReportCount(userId, 0);
      lastReportCountRef.current = 0;
      scanTriggeredRef.current = false;
    }
  }, [reports.length, reports, profileData?._id, profileData?.phoneNumber, handleAnalyzeDiagnosedConditions, isAnalyzingConditions]);

  // If edit form is shown, render the old ProfileDetails component
  if (showEditForm) {
    return (
      <div className="space-y-6 w-full overflow-x-hidden">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
          <button
            onClick={() => setShowEditForm(false)}
            className="px-5 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Back to Profile
          </button>
        </div>
        <ProfileDetails 
          profileData={profileData} 
          refreshProfile={refreshProfile}
          startInEditMode={true}
          onSave={() => setShowEditForm(false)}
        />
      </div>
    );
  }

  // Get member name for display
  const memberName = profileData?.name || profileData?.firstName || 'Member';
  const displayTitle = isMemberView ? memberName : 'Profile';

  return (
    <div className="space-y-6 w-full overflow-x-hidden">
      {/* Header with Breadcrumbs */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          {isMemberView && onBack && (
            <>
              <button
                onClick={onBack}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Members
              </button>
              <span>/</span>
            </>
          )}
          <span className="text-gray-900 font-medium">{displayTitle}</span>
          <span>/</span>
          <span className="text-gray-900 font-medium capitalize">{activeTab}</span>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {isMemberView && onBack && (
              <button
                onClick={onBack}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back to Members"
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
            )}
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{displayTitle}</h1>
            {isMemberView && (
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                {profileData?.isPediatric ? 'Pediatric' : 'Adult'}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {!isMemberView && (
              <button
                onClick={() => setShowEditForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <PencilIcon className="w-4 h-4" />
                <span>Edit Profile</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Profile Card & Recent Activities */}
        <div className="lg:col-span-1 space-y-6 h-full">
          {/* Profile Card */}
          <ProfileInfoCard 
            profileData={profileData}
            reports={reports}
            formatDate={formatDate}
            onProfileUpdate={refreshProfile}
            showDoctorToggle={true}
            onAnalyzeConditions={handleAnalyzeDiagnosedConditions}
            onAnalyzeBodyImpact={handleAnalyzeBodyImpact}
            isAnalyzingConditions={isAnalyzingConditions}
            suggestedConditions={[]}
            showSuggestedConditions={false}
            onAddSuggestedConditions={() => {}}
            onDismissSuggestedConditions={() => {}}
          />
        </div>

        {/* Right Column - Tabs Section */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-md border border-gray-200 w-full overflow-hidden">
            <div className="flex flex-wrap gap-3 p-4 sm:p-6 border-b border-gray-200 overflow-x-auto">
              {tabs.map((tab) => {
                const isPediatricOnly = tab.id === 'muac' || tab.id === 'immunization' || tab.id === 'anthropometric' || tab.id === 'iap';
                const isDisabled = isPediatricOnly && !isPediatric;
                const isActive = activeTab === tab.id;
                
                // Icon components for each tab
                const renderIcon = () => {
                  const iconColor = isDisabled ? '#9CA3AF' : isActive ? '#FFFFFF' : '#6B7280';
                  const iconSize = 16;
                  
                  switch (tab.id) {
                    case 'overview':
                      return (
                        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                          <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                      );
                    case 'reports':
                      return (
                        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                          <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                      );
                    case 'bodyImpact':
                      return (
                        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke={iconColor === '#FFFFFF' ? '#F97316' : '#F97316'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2v20M2 12h20"></path>
                          <circle cx="12" cy="5" r="2"></circle>
                          <circle cx="12" cy="12" r="2"></circle>
                          <circle cx="12" cy="19" r="2"></circle>
                          <circle cx="5" cy="12" r="2"></circle>
                          <circle cx="19" cy="12" r="2"></circle>
                        </svg>
                      );
                    case 'bmi':
                      return (
                        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="6" y1="20" x2="6" y2="10"></line>
                          <line x1="10" y1="20" x2="10" y2="4"></line>
                          <line x1="14" y1="20" x2="14" y2="14"></line>
                          <line x1="18" y1="20" x2="18" y2="8"></line>
                        </svg>
                      );
                    case 'muac':
                      return (
                        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 12h18M3 6h18M3 18h18"></path>
                          <path d="M6 3v18M9 3v18M12 3v18"></path>
                        </svg>
                      );
                    case 'anthropometric':
                      return (
                        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                          <path d="M2 17l10 5 10-5"></path>
                          <path d="M2 12l10 5 10-5"></path>
                        </svg>
                      );
                    case 'immunization':
                      const syringeColor = iconColor === '#FFFFFF' ? '#3B82F6' : '#3B82F6';
                      return (
                        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke={syringeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="8" y="2" width="8" height="16" rx="1"></rect>
                          <line x1="8" y1="6" x2="16" y2="6"></line>
                          <line x1="8" y1="10" x2="16" y2="10"></line>
                          <line x1="8" y1="14" x2="16" y2="14"></line>
                          <path d="M12 18v4M10 20h4"></path>
                          <path d="M6 8l-2-2v4l2-2z"></path>
                        </svg>
                      );
                    case 'iap':
                      return (
                        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke={iconColor === '#FFFFFF' ? '#EF4444' : '#EF4444'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="22 6 13.5 15.5 8.5 10.5 2 17"></polyline>
                          <polyline points="16 6 22 6 22 12"></polyline>
                        </svg>
                      );
                    case 'foodAllergies':
                      return (
                        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill={iconColor} stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <ellipse cx="9" cy="12" rx="3" ry="4"></ellipse>
                          <ellipse cx="15" cy="12" rx="3" ry="4"></ellipse>
                        </svg>
                      );
                    default:
                      return null;
                  }
                };
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => !isDisabled && setActiveTab(tab.id)}
                    disabled={isDisabled}
                    className={`px-5 py-2.5 rounded-lg font-medium transition-all text-sm whitespace-nowrap flex items-center gap-2 ${
                      isDisabled
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60'
                        : isActive
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {renderIcon()}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="p-4 sm:p-6 w-full overflow-x-hidden">
              {activeTab === 'overview' && <ProfileOverviewTab profileData={profileData} reports={reports} formatDate={formatDate} setDash={setDash} refreshProfile={refreshProfile} handleAnalyzeBodyImpact={handleAnalyzeBodyImpact} isAnalyzingBodyImpact={isAnalyzingBodyImpact} />}
              {activeTab === 'reports' && <ProfileReportsTab profileData={profileData} reports={reports} formatDate={formatDate} setDash={setDash} />}
              {activeTab === 'bmi' && <ProfileBMITab profileData={profileData} refreshProfile={refreshProfile} isMemberView={isMemberView} queryClient={queryClient} />}
              {activeTab === 'muac' && <ProfileMUACTab profileData={profileData} refreshProfile={refreshProfile} isMemberView={isMemberView} queryClient={queryClient} />}
              {activeTab === 'anthropometric' && <ProfileAnthropometricTab profileData={profileData} refreshProfile={refreshProfile} isMemberView={isMemberView} queryClient={queryClient} />}
              {activeTab === 'immunization' && <ProfileImmunizationTab profileData={profileData} refreshProfile={refreshProfile} isMemberView={isMemberView} queryClient={queryClient} />}
              {activeTab === 'iap' && <ProfileIAPTab profileData={profileData} refreshProfile={refreshProfile} isMemberView={isMemberView} queryClient={queryClient} />}
              {activeTab === 'foodAllergies' && <ProfileFoodAllergiesTab profileData={profileData} refreshProfile={refreshProfile} isMemberView={isMemberView} queryClient={queryClient} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProfileDetails = ({ profileData, refreshProfile, startInEditMode = false, onSave }: any) => {
  const [edit, setEdit] = useState(startInEditMode);
  const [updating, setUpdating] = useState(false);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showMoreFields, setShowMoreFields] = useState(false);
  const [showConditionsTooltip, setShowConditionsTooltip] = useState(false);

  // Form data state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    dob: '',
    gender: 'male',
    bloodGroup: 'A+',
    height: '',
    weight: '',
    about: '',
    isDoctor: false,
    majorHealthEvents: [] as string[],
    diagnosedConditions: [] as string[],
    foodAllergies: [] as string[],
    address: {
      street: '',
      city: '',
      state: '',
      pincode: '',
    },
  });

  const [newHealthEvent, setNewHealthEvent] = useState('');
  const [newDiagnosedCondition, setNewDiagnosedCondition] = useState('');
  const [newFoodAllergy, setNewFoodAllergy] = useState('');

  const updateProfiles = useUpdateProfile(
    updateProfile,
    () => {
      toast.success('Profile Updated Successfully');
      setEdit(false);
      refreshProfile?.();
      setUpdating(false);
      onSave?.(); // Call the onSave callback if provided
    },
    () => {
      toast.error('Failed to update profile');
      setUpdating(false);
    },
    ['getProfileByPhoneNumber']
  );

  useEffect(() => {
    if (profileData) {
      // Get latest BMI data
      const latestBmi = profileData.bmi && profileData.bmi.length > 0 
        ? profileData.bmi[profileData.bmi.length - 1] 
        : null;

      setFormData({
        firstName: profileData.firstName || '',
        lastName: profileData.lastName || '',
        email: profileData.email || '',
        dob: formatDate(profileData.dob) || '',
        gender: profileData.gender || 'male',
        bloodGroup: profileData.bloodGroup || 'A+',
        height: latestBmi?.height?.toString() || '',
        weight: latestBmi?.weight?.toString() || '',
        about: profileData.about || profileData.bio || '',
        isDoctor: profileData.isDoctor || false,
        majorHealthEvents: [],
        diagnosedConditions: profileData.diagnosedCondition?.map((dc: any) => 
          typeof dc === 'string' ? dc : dc.condition
        ) || [],
        foodAllergies: profileData.foodAllergies?.map((fa: any) => 
          typeof fa === 'string' ? fa : fa.foodItem
        ) || [],
        address: profileData.address || {
          street: '',
          city: '',
          state: '',
          pincode: '',
        },
      });

      if (profileData.profileUrl) {
        setImagePreview(profileData.profileUrl);
      }
    }
  }, [profileData]);

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return '';
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
  };

  const calculateBMI = () => {
    if (formData.height && formData.weight) {
      const heightInMeters = parseFloat(formData.height) / 100;
      const weightInKg = parseFloat(formData.weight);
      if (heightInMeters > 0 && weightInKg > 0) {
        const bmi = (weightInKg / (heightInMeters * heightInMeters)).toFixed(1);
        return bmi;
      }
    }
    return null;
  };

  const bmi = calculateBMI();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addHealthEvent = () => {
    if (newHealthEvent.trim()) {
      setFormData({
        ...formData,
        majorHealthEvents: [...formData.majorHealthEvents, newHealthEvent.trim()],
      });
      setNewHealthEvent('');
    }
  };

  const removeHealthEvent = (index: number) => {
    setFormData({
      ...formData,
      majorHealthEvents: formData.majorHealthEvents.filter((_, i) => i !== index),
    });
  };

  const addDiagnosedCondition = () => {
    if (newDiagnosedCondition.trim()) {
      setFormData({
        ...formData,
        diagnosedConditions: [...formData.diagnosedConditions, newDiagnosedCondition.trim()],
      });
      setNewDiagnosedCondition('');
    }
  };

  const removeDiagnosedCondition = (index: number) => {
    setFormData({
      ...formData,
      diagnosedConditions: formData.diagnosedConditions.filter((_, i) => i !== index),
    });
  };

  const addFoodAllergy = () => {
    if (newFoodAllergy.trim()) {
      setFormData({
        ...formData,
        foodAllergies: [...formData.foodAllergies, newFoodAllergy.trim()],
      });
      setNewFoodAllergy('');
    }
  };

  const removeFoodAllergy = (index: number) => {
    setFormData({
      ...formData,
      foodAllergies: formData.foodAllergies.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);

    try {
      // Prepare profile data
      const updatedProfile: any = {
        id: profileData._id,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email.toLowerCase().trim(),
        gender: formData.gender,
        bloodGroup: formData.bloodGroup,
        dob: new Date(formData.dob),
        about: formData.about,
        isDoctor: formData.isDoctor,
        address: formData.address,
      };

      // Update BMI if height/weight provided
      if (formData.height) {
        const existingBmi = profileData.bmi || [];
        const newBmiEntry = {
          height: parseFloat(formData.height),
          weight: formData.weight ? parseFloat(formData.weight) : 0,
          bmi: bmi ? parseFloat(bmi) : null,
          updatedDate: new Date(),
        };
        updatedProfile.bmi = [...existingBmi, newBmiEntry];
      }

      // Update diagnosed conditions
      if (formData.diagnosedConditions.length > 0) {
        updatedProfile.diagnosedCondition = formData.diagnosedConditions.map((condition) => ({
          condition,
          date: new Date(),
        }));
      }

      // Update food allergies
      if (formData.foodAllergies.length > 0) {
        updatedProfile.foodAllergies = formData.foodAllergies.map((foodItem) => ({
          foodItem,
          updatedDate: new Date(),
        }));
      }

      // Upload image if changed
      if (profileImage) {
        // TODO: Implement image upload to storage (e.g., Cloudinary, S3)
        // For now, we'll skip image upload
        toast.success('Profile updated! Note: Image upload will be implemented soon');
      }

      updateProfiles.mutate(updatedProfile);
    } catch (error: any) {
      toast.error('Failed to update profile');
      setUpdating(false);
    }
  };

  const handleEdit = () => {
    setEdit(!edit);
    if (edit) {
      // Reset form when canceling
      if (profileData) {
        const latestBmi = profileData.bmi && profileData.bmi.length > 0 
          ? profileData.bmi[profileData.bmi.length - 1] 
          : null;

        setFormData({
          firstName: profileData.firstName || '',
          lastName: profileData.lastName || '',
          email: profileData.email || '',
          dob: formatDate(profileData.dob) || '',
          gender: profileData.gender || 'male',
          bloodGroup: profileData.bloodGroup || 'A+',
          height: latestBmi?.height?.toString() || '',
          weight: latestBmi?.weight?.toString() || '',
          about: profileData.about || profileData.bio || '',
          isDoctor: profileData.isDoctor || false,
          majorHealthEvents: [],
          diagnosedConditions: profileData.diagnosedCondition?.map((dc: any) => 
            typeof dc === 'string' ? dc : dc.condition
          ) || [],
          foodAllergies: profileData.foodAllergies?.map((fa: any) => 
            typeof fa === 'string' ? fa : fa.foodItem
          ) || [],
          address: profileData.address || {
            street: '',
            city: '',
            state: '',
            pincode: '',
          },
        });
        setProfileImage(null);
        if (profileData.profileUrl) {
          setImagePreview(profileData.profileUrl);
        } else {
          setImagePreview(null);
        }
      }
    }
  };

  return (
    <div className="w-full">
      <div className="p-6 lg:p-8">
        {/* Header with Edit Button */}
        <div className="flex justify-between items-center mb-8 pb-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Profile Information</h2>
            <p className="text-sm text-gray-500 mt-1">Manage your personal information and preferences</p>
          </div>
          {!edit ? (
            <button
              type="button"
              onClick={handleEdit}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md font-medium"
            >
              <PencilIcon className="w-5 h-5" />
              Edit Profile
            </button>
          ) : (
            <button
              type="button"
              onClick={handleEdit}
              className="flex items-center gap-2 px-5 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              <XMarkIcon className="w-5 h-5" />
              Cancel
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Profile Image Section */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative">
              <div className="w-36 h-36 rounded-full overflow-hidden border-4 border-gray-100 shadow-xl ring-4 ring-gray-50">
                <Image
                  src={imagePreview || profileData?.profileUrl || AVATAR}
                  alt="Profile"
                  width={144}
                  height={144}
                  className="w-full h-full object-cover"
                />
              </div>
              {edit && (
                <label className="absolute bottom-2 right-2 bg-blue-600 text-white p-3 rounded-full cursor-pointer hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl">
                  <PencilIcon className="w-5 h-5" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            {edit && (
              <p className="mt-3 text-sm text-gray-500">Click the pencil icon to change photo</p>
            )}
          </div>

          {/* Basic Information */}
          <div className="bg-gray-50 rounded-xl p-6 space-y-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
              <h3 className="text-xl font-semibold text-gray-900">Basic Information</h3>
            </div>
            
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name <span className="text-red-500">*</span>
              </label>
              {edit ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="First Name"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors"
                  />
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors"
                  />
                </div>
              ) : (
                <div className="px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900">
                  {formData.firstName || formData.lastName 
                    ? `${formData.firstName || ''} ${formData.lastName || ''}`.trim()
                    : 'Not provided'}
                </div>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              {edit ? (
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors"
                />
              ) : (
                <div className="px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900">
                  {formData.email || 'Not provided'}
                </div>
              )}
            </div>

            {/* Phone Number (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
                {profileData?.phoneNumber || 'Not provided'}
              </div>
            </div>

            {/* DOB and Gender */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                {edit ? (
                  <input
                    type="date"
                    required
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors"
                  />
                ) : (
                  <div className="px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900">
                    {formData.dob ? new Date(formData.dob).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not provided'}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gender <span className="text-red-500">*</span>
                </label>
                {edit ? (
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors"
                    required
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                ) : (
                  <div className="px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 capitalize">
                    {formData.gender || 'Not provided'}
                  </div>
                )}
              </div>
            </div>

            {/* Blood Group */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Blood Group <span className="text-red-500">*</span>
              </label>
              {edit ? (
                <select
                  value={formData.bloodGroup}
                  onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors"
                  required
                >
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              ) : (
                <div className="px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900">
                  {formData.bloodGroup || 'Not provided'}
                </div>
              )}
            </div>

            {/* Doctor Toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Type
              </label>
              {edit ? (
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isDoctor}
                      onChange={(e) => setFormData({ ...formData, isDoctor: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    <span className="ml-3 text-sm font-medium text-gray-700">
                      {formData.isDoctor ? 'Doctor Account' : 'Regular Account'}
                    </span>
                  </label>
                  {formData.isDoctor && (
                    <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      ✓ Marked as Doctor
                    </span>
                  )}
                </div>
              ) : (
                <div className="px-4 py-3 bg-white border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    {formData.isDoctor ? (
                      <>
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                          👨‍⚕️ Doctor
                        </span>
                        <span className="text-sm text-gray-600">You are marked as a doctor</span>
                      </>
                    ) : (
                      <span className="text-sm text-gray-600">Regular User</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Height, Weight, BMI */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Height (cm)
                </label>
                {edit ? (
                  <input
                    type="number"
                    placeholder="Height (cm)"
                    value={formData.height}
                    onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors"
                  />
                ) : (
                  <div className="px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900">
                    {formData.height ? `${formData.height} cm` : 'Not provided'}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Weight (kg)
                </label>
                {edit ? (
                  <input
                    type="number"
                    placeholder="Weight (kg)"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors"
                  />
                ) : (
                  <div className="px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900">
                    {formData.weight ? `${formData.weight} kg` : 'Not provided'}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  BMI
                </label>
                <div className="px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900">
                  {bmi ? bmi : '---'}
                </div>
              </div>
            </div>

            {/* About */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                About Me
              </label>
              {edit ? (
                <textarea
                  value={formData.about}
                  onChange={(e) => setFormData({ ...formData, about: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors"
                  placeholder="Write something about yourself..."
                />
              ) : (
                <div className="px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 min-h-[100px] whitespace-pre-wrap">
                  {formData.about || 'Not provided'}
                </div>
              )}
            </div>
          </div>

          {/* Address Information */}
          <div className="bg-gray-50 rounded-xl p-6 space-y-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
              <h3 className="text-xl font-semibold text-gray-900">Address Information</h3>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Street Address
              </label>
              {edit ? (
                <input
                  type="text"
                  value={formData.address.street}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    address: { ...formData.address, street: e.target.value }
                  })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors"
                />
              ) : (
                <div className="px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900">
                  {formData.address.street || 'Not provided'}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City
                </label>
                {edit ? (
                  <input
                    type="text"
                    value={formData.address.city}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      address: { ...formData.address, city: e.target.value }
                    })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors"
                  />
                ) : (
                  <div className="px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900">
                    {formData.address.city || 'Not provided'}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State
                </label>
                {edit ? (
                  <input
                    type="text"
                    value={formData.address.state}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      address: { ...formData.address, state: e.target.value }
                    })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors"
                  />
                ) : (
                  <div className="px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900">
                    {formData.address.state || 'Not provided'}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ZIP / Postal Code
                </label>
                {edit ? (
                  <input
                    type="text"
                    value={formData.address.pincode}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      address: { ...formData.address, pincode: e.target.value }
                    })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors"
                  />
                ) : (
                  <div className="px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900">
                    {formData.address.pincode || 'Not provided'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Health Information - Expandable */}
          <div className="bg-gray-50 rounded-xl p-6 space-y-5">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
                <h3 className="text-xl font-semibold text-gray-900">Health Information</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMoreFields(!showMoreFields)}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium shadow-sm hover:shadow-md"
                disabled={!edit}
              >
                {showMoreFields ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
                {showMoreFields ? 'Show Less' : 'Show More'}
              </button>
            </div>

            {showMoreFields && (
              <div className="space-y-5 pt-2">
                {/* Diagnosed Conditions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Diagnosed Conditions
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Enter condition"
                      value={newDiagnosedCondition}
                      onChange={(e) => setNewDiagnosedCondition(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addDiagnosedCondition();
                        }
                      }}
                      disabled={!edit}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
                    />
                    <button
                      type="button"
                      onClick={addDiagnosedCondition}
                      disabled={!edit}
                      className="px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                  {formData.diagnosedConditions.length > 0 && (
                    <div className="flex flex-wrap gap-2 items-center">
                      {formData.diagnosedConditions.slice(0, 10).map((condition, index) => {
                        // Handle both string and object formats
                        const conditionText = typeof condition === 'string' 
                          ? condition 
                          : ((condition as any)?.condition || String(condition));
                        return (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                          >
                            {conditionText}
                            {edit && (
                              <button
                                type="button"
                                onClick={() => removeDiagnosedCondition(index)}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                ×
                              </button>
                            )}
                          </span>
                        );
                      })}
                      {formData.diagnosedConditions.length > 10 && (
                        <div className="relative">
                          <span 
                            className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium cursor-pointer hover:bg-gray-200 transition-colors"
                            onMouseEnter={() => setShowConditionsTooltip(true)}
                            onMouseLeave={() => setShowConditionsTooltip(false)}
                          >
                            +{formData.diagnosedConditions.length - 10} more...
                          </span>
                          {showConditionsTooltip && (
                            <div 
                              className="absolute z-50 mt-2 left-0 bg-white border border-gray-200 rounded-lg shadow-xl p-4 max-w-xs max-h-64 overflow-y-auto"
                              style={{ minWidth: '200px' }}
                              onMouseEnter={() => setShowConditionsTooltip(true)}
                              onMouseLeave={() => setShowConditionsTooltip(false)}
                            >
                              <p className="text-xs font-semibold text-gray-700 mb-2">All Diagnosed Conditions ({formData.diagnosedConditions.length}):</p>
                              <div className="flex flex-wrap gap-1.5">
                                {formData.diagnosedConditions.map((condition, idx) => {
                                  const conditionText = typeof condition === 'string' 
                                    ? condition 
                                    : ((condition as any)?.condition || String(condition));
                                  return (
                                    <span
                                      key={idx}
                                      className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs"
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
                    </div>
                  )}
                </div>

                {/* Food Allergies */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Food Allergies
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Enter allergy"
                      value={newFoodAllergy}
                      onChange={(e) => setNewFoodAllergy(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addFoodAllergy();
                        }
                      }}
                      disabled={!edit}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
                    />
                    <button
                      type="button"
                      onClick={addFoodAllergy}
                      disabled={!edit}
                      className="px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                  {formData.foodAllergies.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.foodAllergies.map((allergy, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm"
                        >
                          {allergy}
                          {edit && (
                            <button
                              type="button"
                              onClick={() => removeFoodAllergy(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              ×
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          {edit && (
            <div className="flex gap-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleEdit}
                className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updating}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-sm hover:shadow-md"
              >
                {updating ? 'Updating...' : 'Save Changes'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

// Profile Overview Tab - Clone from Member Details OverviewTab
function ProfileOverviewTab({ profileData, reports, formatDate, setDash, refreshProfile, handleAnalyzeBodyImpact, isAnalyzingBodyImpact }: any) {
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [showEditMemberModal, setShowEditMemberModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const queryClient = useQueryClient();
  const { profile, refreshProfile: refreshAuthProfile } = useAuthContext();
  const setMemberDetail = useSetRecoilState(memberDetail);
  const diagnosedConditions = profileData?.diagnosedCondition || [];
  
  // Fetch member profiles
  const memberIds: string[] = [];
  if (profileData?.members) {
    profileData.members.forEach((member: any) => {
      if (member.memberId) {
        memberIds.push(member.memberId);
      }
    });
  }
  const { data: memberProfiles = [] } = useGetMembersByIds(memberIds.length > 0 ? memberIds : undefined);
  
  // Map members with their profiles
  const membersWithProfiles = useMemo(() => {
    if (!profileData?.members || !memberProfiles) return [];
    return profileData.members.map((memberMeta: any) => {
      const memberProfile = memberProfiles.find((mp: any) => mp._id?.toString() === memberMeta.memberId?.toString());
      return {
        ...memberMeta,
        ...memberProfile,
        memberMetaId: memberMeta._id,
      };
    });
  }, [profileData?.members, memberProfiles]);
  
  const handleEditMember = (member: any) => {
    setEditingMember(member);
    setShowEditMemberModal(true);
  };
  
  const handleDeleteMember = async (memberId: string) => {
    const member = membersWithProfiles.find((m: any) => m._id === memberId);
    if (!member || !profileData) {
      toast.error('Member not found');
      return;
    }
    
    if (member.relation === 'Self') {
      toast.error('Cannot delete yourself');
      return;
    }
    
    if (!confirm(`Are you sure you want to remove ${member.firstName} ${member.lastName} from your profile? This will only remove them from your members list, not delete their account from Omerald.`)) {
      return;
    }
    
    try {
      const updatedMembers = profileData.members.filter((m: any) => {
        return !(
          (m._id?.toString() === member.memberMetaId?.toString()) ||
          (m.memberId?.toString() === member._id?.toString())
        );
      });
      
      const response = await axios.put(updateProfile, { 
        id: profileData._id, 
        members: updatedMembers 
      });
      
      if (response.data) {
        toast.success('Member removed successfully!');
        refreshProfile();
        refreshAuthProfile();
        queryClient.invalidateQueries({ queryKey: ['getProfileByPhoneNumber'] });
        queryClient.invalidateQueries({ queryKey: ['getMembersById'] });
      } else {
        toast.error('Failed to remove member');
      }
    } catch (error: any) {
      console.error('Error deleting member:', error);
      toast.error(error?.response?.data?.error || 'Failed to remove member');
    }
  };
  
  const handleViewMember = (member: any) => {
    if (member.memberId) {
      setMemberDetail(member.memberId);
      setDash('MemberDetails');
    } else if (member._id) {
      setMemberDetail(member._id);
      setDash('MemberDetails');
    }
  };

  const handleViewReport = (report: any) => {
    setSelectedReport(report);
    setShowViewModal(true);
  };

  const handleEditReport = (report: any) => {
    setSelectedReport(report);
    setShowEditModal(true);
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this report?')) {
      return;
    }

    setDeletingReportId(reportId);
    try {
      await axios.delete(deleteReport, { data: { id: reportId } });
      toast.success('Report deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['getManyReports'] });
    } catch (error: any) {
      console.error('Error deleting report:', error);
      toast.error(error?.response?.data?.error || 'Failed to delete report');
    } finally {
      setDeletingReportId(null);
    }
  };

  const handleShareReport = (report: any) => {
    setSelectedReport(report);
    setShowShareModal(true);
  };

  // Calculate health score - matching analytics calculation
  const healthScore = useMemo(() => {
    let score = 0;
    const maxScore = 100;
    
    // Process BMI data
    const bmiData = Array.isArray(profileData?.bmi) ? profileData.bmi : [];
    const validBmiValues = bmiData
      .map((bmi: any) => {
        if (bmi?.bmi && typeof bmi.bmi === 'number' && !isNaN(bmi.bmi)) {
          return bmi.bmi;
        }
        if (bmi?.weight && bmi?.height && typeof bmi.weight === 'number' && typeof bmi.height === 'number') {
          const bmiValue = bmi.weight / Math.pow(bmi.height / 100, 2);
          if (!isNaN(bmiValue) && isFinite(bmiValue)) {
            return bmiValue;
          }
        }
        return null;
      })
      .filter((v: number | null) => v !== null && typeof v === 'number' && !isNaN(v)) as number[];
    
    // Reports (40 points)
    const reportStats = {
      total: reports.length,
      accepted: reports.filter((r: any) => r && r.status === 'accepted').length,
    };
    if (reportStats.total > 0) {
      score += (reportStats.accepted / reportStats.total) * 40;
    }
    
    // BMI data (20 points)
    if (validBmiValues.length > 0) {
      const avgBmi = validBmiValues.reduce((a: number, b: number) => a + b, 0) / validBmiValues.length;
      if (avgBmi >= 18.5 && avgBmi <= 24.9) {
        score += 20;
      } else if (avgBmi >= 17 && avgBmi <= 30) {
        score += 10;
      }
    }
    
    // Conditions (20 points) - fewer conditions = better
    const conditionsCount = diagnosedConditions.length;
    if (conditionsCount === 0) {
      score += 20;
    } else if (conditionsCount <= 2) {
      score += 10;
    }
    
    // Activity tracking (10 points)
    const activities = profileData?.activities || [];
    if (activities.length > 0) {
      score += 10;
    }
    
    // Food allergies awareness (10 points)
    const foodAllergies = profileData?.foodAllergies || [];
    if (foodAllergies.length > 0) {
      score += 10;
    }
    
    return Math.min(Math.round(score), maxScore);
  }, [profileData, reports, diagnosedConditions]);

  return (
    <div className="space-y-6">
      {/* Top Section: Body Impact Visualization and Health Index */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Body Impact Visualization */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <BodyImpactVisualization
            bodyImpactAnalysis={profileData?.bodyImpactAnalysis}
            isLoading={isAnalyzingBodyImpact}
            onAnalyze={() => handleAnalyzeBodyImpact(false)}
            diagnosedConditions={diagnosedConditions}
          />
        </div>
        
        {/* Health Performance Index */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Health Performance Index</h3>
          <div className="flex items-center justify-center mb-6">
            <ReactSpeedometer
              maxValue={100}
              value={healthScore}
              needleColor="#40189D"
              startColor="#FF6B6B"
              segments={3}
              endColor="#A8D96D"
              textColor="#374151"
              height={250}
              width={300}
              customSegmentStops={[0, 33, 66, 100]}
              segmentColors={['#FF6B6B', '#FFB380', '#A8D96D']}
              currentValueText={`${healthScore}%`}
              ringWidth={30}
              needleHeightRatio={0.7}
            />
          </div>
          
          {/* Legend and Breakdown */}
          <div className="space-y-4">
            {/* Legend */}
            <div className="border-t border-gray-200 pt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Health Status Levels</h4>
              <div className="grid grid-cols-3 gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-[#FF6B6B]"></div>
                  <div>
                    <p className="text-xs font-medium text-gray-900">Low</p>
                    <p className="text-xs text-gray-500">0-33%</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-[#FFB380]"></div>
                  <div>
                    <p className="text-xs font-medium text-gray-900">Moderate</p>
                    <p className="text-xs text-gray-500">34-66%</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-[#A8D96D]"></div>
                  <div>
                    <p className="text-xs font-medium text-gray-900">Good</p>
                    <p className="text-xs text-gray-500">67-100%</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Score Breakdown Chart */}
            <div className="border-t border-gray-200 pt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Score Breakdown</h4>
              <div className="space-y-3">
                {/* BMI Tracking */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-gray-700">BMI Tracking</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {profileData?.bmi?.length > 0 ? `${profileData.bmi.length} BMI record(s)` : 'No BMI data'}
                  </p>
                </div>

                {/* Medical Reports */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-gray-700">Medical Reports</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {reports.length > 0 ? `${reports.length} report(s) uploaded` : 'No reports available'}
                  </p>
                </div>

                {/* Overall Score */}
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-semibold text-gray-900">Overall Health Score</span>
                    <span className="text-sm font-bold text-[#40189D]">{healthScore}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className={`h-2.5 rounded-full transition-all duration-500 ${
                        healthScore >= 67 ? 'bg-gradient-to-r from-green-500 to-green-600' :
                        healthScore >= 34 ? 'bg-gradient-to-r from-orange-400 to-orange-500' :
                        'bg-gradient-to-r from-red-500 to-red-600'
                      }`}
                      style={{ width: `${healthScore}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Metrics */}
            <div className="border-t border-gray-200 pt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Quick Stats</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                  <p className="text-xs text-gray-600 mb-1">Diagnosed Conditions</p>
                  <p className="text-lg font-bold text-blue-700">{diagnosedConditions.length}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                  <p className="text-xs text-gray-600 mb-1">Total Reports</p>
                  <p className="text-lg font-bold text-purple-700">{reports.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
                {/* Members Section */}
      {/* {membersWithProfiles.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Family Members ({membersWithProfiles.length})</h3>
            <button
              onClick={() => setShowAddMemberModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
            >
              <span>+</span>
              Add Member
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {membersWithProfiles.map((member: any) => (
              <div
                key={member._id || member.memberMetaId}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">
                      {member.firstName} {member.lastName}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">{member.relation || 'Member'}</p>
                    {member.phoneNumber && (
                      <p className="text-xs text-gray-500 mt-1">{member.phoneNumber}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleViewMember(member)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="View Details"
                    >
                      <EyeIcon className="w-4 h-4" />
                    </button>
                    {member.relation !== 'Self' && (
                      <>
                        <button
                          onClick={() => handleEditMember(member)}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="Edit"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteMember(member._id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )} */}

      {/* Add Member Button (if no members) */}
      {/* {membersWithProfiles.length === 0 && (
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200 text-center">
          <p className="text-gray-600 mb-4">No family members added yet</p>
          <button
            onClick={() => setShowAddMemberModal(true)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Family Member
          </button>
        </div>
      )} */}
        </div>
      </div>



      {/* Reports Section - Hidden */}
      {/* <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 justify-between">
          <>📋 Reports ({reports.length})</>
          <button
            onClick={() => setDash('Reports')}
            className="p-2 bg-gray-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <span>+</span>
            Upload Reports
          </button>
        </h3>
        {reports.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">Report Name</th>
                  <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">Report Type</th>
                  <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">Date</th>
                  <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">Shared With</th>
                  <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {reports.slice(0, 5).map((report: any, index: number) => {
                  const sharedWith = report.sharedWith || [];
                  return (
                    <tr key={report._id || index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3 text-sm">{report.name || report.testName || report.type || 'Report'}</td>
                      <td className="py-2 px-3 text-sm">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                          {report.type || report.documentType || 'Blood Report'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-sm text-gray-600">{formatDate(report.reportDate || report.uploadDate)}</td>
                      <td className="py-2 px-3 text-sm">
                        {sharedWith.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {sharedWith.slice(0, 2).map((share: any, idx: number) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs"
                                title={share.name || share.phoneNumber || 'Shared user'}
                              >
                                {share.name || share.phoneNumber || 'User'}
                              </span>
                            ))}
                            {sharedWith.length > 2 && (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                                +{sharedWith.length - 2}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">Not shared</span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleViewReport(report)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="View"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleEditReport(report)}
                            className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                            title="Edit"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleShareReport(report)}
                            className="p-1 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                            title="Share"
                          >
                            <ShareIcon className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteReport(report._id)}
                            disabled={deletingReportId === report._id}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No reports available</p>
        )}
      </div> */}

      {/* View Report Modal */}
      {showViewModal && selectedReport && (
        <ViewReportModal
          visible={showViewModal}
          setVisible={setShowViewModal}
          report={selectedReport}
        />
      )}

      {/* Edit Report Modal */}
      {showEditModal && selectedReport && (
        <EditReportModal
          visible={showEditModal}
          setVisible={setShowEditModal}
          report={selectedReport}
          onReportUpdated={() => {
            queryClient.invalidateQueries({ queryKey: ['getManyReports'] });
          }}
        />
      )}

      {/* Share Report Modal */}
      {showShareModal && selectedReport && profile && (
        <ShareReportModal
          visible={showShareModal}
          setVisible={setShowShareModal}
          report={selectedReport}
          profile={profile}
          onReportShared={() => {
            queryClient.invalidateQueries({ queryKey: ['getManyReports'] });
          }}
        />
      )}

      {/* Edit Member Modal */}
      {showEditMemberModal && editingMember && profile && (
        <EditMemberModal
          visible={showEditMemberModal}
          setVisible={setShowEditMemberModal}
          member={editingMember}
          profile={profile}
          onMemberUpdated={() => {
            refreshProfile();
            refreshAuthProfile();
            queryClient.invalidateQueries({ queryKey: ['getProfileByPhoneNumber'] });
            queryClient.invalidateQueries({ queryKey: ['getMembersById'] });
            setShowEditMemberModal(false);
          }}
        />
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && profile && (
        <AddMemberModal
          visible={showAddMemberModal}
          setVisible={setShowAddMemberModal}
          profile={profile}
          onMemberAdded={() => {
            refreshProfile();
            refreshAuthProfile();
            queryClient.invalidateQueries({ queryKey: ['getProfileByPhoneNumber'] });
            queryClient.invalidateQueries({ queryKey: ['getMembersById'] });
            setShowAddMemberModal(false);
          }}
        />
      )}
    </div>
  );
}

// Profile Skeleton Visualization - Clone from Member Details
function ProfileSkeletonVisualization({ profileData, reports, diagnosedConditions, bodyImpactAnalysis }: any) {
  const [rotation, setRotation] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [imageError, setImageError] = useState(false);
  const imageRef = useRef<HTMLDivElement>(null);
  
  const imagePaths = ['/body.jpg', '/pictures/body.png', '/pictures/anatomical-body.png'];

  // Auto-analyze coordinates once per app session using sessionStorage (for overview tab)
  // This ensures coordinates are analyzed only once when the app is first loaded/reloaded
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const shouldAnalyze = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_ENABLE_COORD_ANALYSIS === 'true';
    if (!shouldAnalyze) return;
    
    // Check if coordinates have been analyzed in this browser session
    // sessionStorage persists across page navigations but clears when tab is closed
    const sessionKey = 'bodyCoordinatesAnalyzed';
    const hasAnalyzed = sessionStorage.getItem(sessionKey);
    
    if (!hasAnalyzed) {
      // Mark as analyzed immediately to prevent multiple calls
      sessionStorage.setItem(sessionKey, 'true');
      const handleAnalyzeCoordinates = async () => {
        try {
          await axios.post(analyzeBodyCoordinates);
        } catch (error: any) {
          console.error('Error auto-analyzing coordinates:', error);
        }
      };
      handleAnalyzeCoordinates();
    }
  }, []);

  const handleRotate90 = () => {
    setRotation((prev) => prev + 90);
  };

  // Toggle 360° animation
  const handleToggleAnimation = () => {
    setIsAnimating((prev) => !prev);
  };

  // Use body impact analysis if available, otherwise fall back to simple keyword matching
  const getAreasOfConcern = () => {
    // If we have AI analysis data, use it
    if (bodyImpactAnalysis?.bodyParts && bodyImpactAnalysis.bodyParts.length > 0) {
      const { getBodyPartById } = require('@/lib/utils/bodyPartsMapping');
      return bodyImpactAnalysis.bodyParts.map((part: any) => {
        const bodyPart = getBodyPartById(part.partId);
        if (bodyPart?.coordinates) {
          return {
            area: part.partName,
            x: bodyPart.coordinates.x + bodyPart.coordinates.width / 2,
            y: bodyPart.coordinates.y + bodyPart.coordinates.height / 2,
            severity: part.severity,
            partId: part.partId,
            coordinates: bodyPart.coordinates,
            description: part.impactDescription,
            relatedConditions: part.relatedConditions || [],
            relatedParameters: part.relatedParameters || [],
          };
        }
        return null;
      }).filter(Boolean);
    }
    
    // Fallback to simple keyword matching based on conditions
    const areas: Array<{ area: string; x: number; y: number; severity: 'low' | 'medium' | 'high'; coordinates?: any; description?: string; relatedConditions?: string[] }> = [];
    
    const conditions = diagnosedConditions || [];
    const conditionText = conditions.map((c: any) => 
      typeof c === 'string' ? c.toLowerCase() : (c?.condition || '').toLowerCase()
    ).join(' ');
    
    const { BODY_PARTS } = require('@/lib/utils/bodyPartsMapping');
    
    // Map conditions to body parts using keywords
    BODY_PARTS.forEach((part: any) => {
      const matches = part.keywords.some((keyword: string) => 
        conditionText.includes(keyword.toLowerCase())
      );
      
      if (matches && part.coordinates) {
        // Determine severity based on condition type
        let severity: 'low' | 'medium' | 'high' = 'medium';
        if (conditionText.includes('tumor') || conditionText.includes('cancer') || conditionText.includes('fracture')) {
          severity = 'high';
        } else if (conditionText.includes('fever') || conditionText.includes('covid')) {
          severity = 'medium';
        } else {
          severity = 'low';
        }
        
        // Find which conditions match this body part
        const matchingConditions = conditions.filter((c: any) => {
          const conditionText = (typeof c === 'string' ? c : c.condition || '').toLowerCase();
          return part.keywords.some((keyword: string) => 
            conditionText.includes(keyword.toLowerCase())
          );
        }).map((c: any) => typeof c === 'string' ? c : c.condition);
        
        areas.push({
          area: part.name,
          x: part.coordinates.x + part.coordinates.width / 2,
          y: part.coordinates.y + part.coordinates.height / 2,
          severity,
          coordinates: part.coordinates,
          description: `This area may be affected based on diagnosed conditions.`,
          relatedConditions: matchingConditions,
        });
      }
    });
    
    // Legacy keyword matching for backward compatibility
    if (conditionText.includes('heart') || conditionText.includes('cardiac') || conditionText.includes('chest')) {
      if (!areas.some(a => a.area.includes('Chest'))) {
        areas.push({ area: 'Chest (Heart)', x: 50, y: 55, severity: 'high', coordinates: { x: 42, y: 52, width: 16, height: 12 } });
      }
    }
    if (conditionText.includes('lung') || conditionText.includes('respiratory') || conditionText.includes('breathing')) {
      if (!areas.some(a => a.area.includes('Chest'))) {
        areas.push({ area: 'Chest (Upper)', x: 50, y: 52, severity: 'high', coordinates: { x: 35, y: 45, width: 30, height: 15 } });
      }
    }
    if (conditionText.includes('stomach') || conditionText.includes('abdominal') || conditionText.includes('digestive')) {
      if (!areas.some(a => a.area.includes('Abdomen'))) {
        areas.push({ area: 'Abdomen', x: 50, y: 66, severity: 'medium', coordinates: { x: 38, y: 60, width: 24, height: 12 } });
      }
    }
    // Check for kidney/renal conditions specifically (before knee check to avoid false matches)
    if (conditionText.includes('kidney') || conditionText.includes('renal') || conditionText.includes('nephron') || conditionText.includes('nephritis') || conditionText.includes('nephropathy')) {
      if (!areas.some(a => a.area.includes('Kidney'))) {
        areas.push({ area: 'Kidney', x: 50, y: 70, severity: 'medium', coordinates: { x: 35, y: 65, width: 30, height: 10 } });
      }
    }
    // Check for knee specifically (as whole word to avoid matching 'kidney')
    if ((/\bknee\b/i.test(conditionText) || conditionText.includes('knee joint')) && !conditionText.includes('kidney')) {
      if (!areas.some(a => a.area.includes('Leg'))) {
        areas.push({ area: 'Legs', x: 50, y: 89, severity: 'medium', coordinates: { x: 38, y: 82, width: 24, height: 15 } });
      }
    }
    if (conditionText.includes('joint') || conditionText.includes('bone') || conditionText.includes('fracture')) {
      if (!areas.some(a => a.area.includes('Leg'))) {
        areas.push({ area: 'Legs', x: 50, y: 89, severity: 'medium', coordinates: { x: 38, y: 82, width: 24, height: 15 } });
      }
    }
    if (conditionText.includes('head') || conditionText.includes('headache') || conditionText.includes('migraine') || conditionText.includes('brain') || conditionText.includes('tumor')) {
      if (!areas.some(a => a.area.includes('Head') || a.area.includes('Brain'))) {
        areas.push({ area: 'Head', x: 50, y: 11, severity: 'high', coordinates: { x: 35, y: 5, width: 30, height: 12 } });
      }
    }
    if (conditionText.includes('thyroid')) {
      if (!areas.some(a => a.area.includes('Neck'))) {
        areas.push({ area: 'Neck', x: 50, y: 41, severity: 'medium', coordinates: { x: 43, y: 37, width: 14, height: 8 } });
      }
    }
    
    if (areas.length === 0 && reports.length > 0) {
      const reportTypes = reports.map((r: any) => (r.type || r.documentType || '').toLowerCase()).join(' ');
      if (reportTypes.includes('blood') || reportTypes.includes('cbc')) {
        areas.push({ area: 'General', x: 50, y: 40, severity: 'low', coordinates: { x: 40, y: 35, width: 20, height: 10 } });
      }
    }
    
    return areas;
  };

  const areasOfConcern = getAreasOfConcern();

  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Places to take care based on reports</h3>
        <div className="flex gap-2">
          <button
            onClick={handleToggleAnimation}
            className={`p-2 rounded-lg transition-colors ${
              isAnimating 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
            title={isAnimating ? "Stop 360° rotation" : "Start 360° rotation"}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <button
            onClick={handleRotate90}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="Rotate 90°"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>
      <div 
        className="relative flex items-center justify-center min-h-[400px] bg-white rounded-lg group"
        ref={imageRef}
      >
        <div
          className={`relative rotate-on-hover animate-on-hover ${isAnimating ? 'animate-active' : ''}`}
          style={{
            transform: `rotateY(${rotation}deg)`,
            transformStyle: 'preserve-3d',
          }}
        >
          {!imageError ? (
            <div className="relative">
              <img
                src={imagePaths[0]}
                alt="Anatomical body illustration"
                className="max-w-full h-auto object-contain"
                style={{
                  maxHeight: '500px',
                }}
                onError={(e) => {
                  console.error('Anatomical image not found at:', imagePaths[0]);
                  setImageError(true);
                }}
                onLoad={() => {
                  console.log('Anatomical image loaded successfully from:', imagePaths[0]);
                }}
              />
              {/* Overlay regions for affected body parts */}
              {areasOfConcern.length > 0 && (
                <div className="absolute inset-0" style={{ maxHeight: '500px', pointerEvents: 'none' }}>
                  {areasOfConcern.map((area: any, index: number) => {
                    if (!area.coordinates) return null;
                    const { getSeverityColor } = require('@/lib/utils/bodyPartsMapping');
                    const color = getSeverityColor(area.severity);
                    const { x, y, width, height } = area.coordinates;
                    
                    return (
                      <div
                        key={area.partId || area.area || `area-${index}`}
                        className="absolute rounded-lg border-2 transition-all duration-200"
                        style={{
                          left: `${x}%`,
                          top: `${y}%`,
                          width: `${width}%`,
                          height: `${height}%`,
                          backgroundColor: `${color}50`,
                          borderColor: `${color}90`,
                          borderWidth: '2px',
                          boxShadow: `0 0 12px ${color}70`,
                          pointerEvents: 'none',
                          zIndex: 10,
                        }}
                        title={`${area.area} - ${area.severity.toUpperCase()} severity${area.description ? `: ${area.description}` : ''}`}
                      >
                        <div
                          className="absolute -top-1 -right-1 w-5 h-5 rounded-full border-2 border-white shadow-md"
                          style={{ backgroundColor: color }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center p-8">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-gray-600 font-medium mb-2">Image not found</p>
              <p className="text-sm text-gray-500 mb-4">
                Please add your anatomical body image to:
              </p>
              <div className="bg-gray-100 rounded p-3 text-xs font-mono text-left max-w-md mx-auto">
                <p className="text-gray-700">public/body.jpg</p>
                <p className="text-gray-500 mt-1">or</p>
                <p className="text-gray-700">public/pictures/anatomical-body.png</p>
              </div>
            </div>
          )}
        </div>
        {isDragging && (
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-full text-xs z-10">
            Drag to rotate
          </div>
        )}
      </div>
      {areasOfConcern.length === 0 ? (
        <p className="text-center text-gray-500 text-sm mt-4">No specific areas of concern identified</p>
      ) : (
        <div className="mt-4">
          <p className="text-center text-sm font-medium text-gray-700 mb-2">
            {areasOfConcern.length} area{areasOfConcern.length !== 1 ? 's' : ''} of concern identified
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {(() => {
              // Group conditions by severity and show actual condition names
              const conditionMap = new Map<string, { condition: string; severity: 'low' | 'medium' | 'high'; count: number }>();
              
              areasOfConcern.forEach((area: any) => {
                const conditions = area.relatedConditions && area.relatedConditions.length > 0 
                  ? area.relatedConditions 
                  : diagnosedConditions.map((dc: any) => typeof dc === 'string' ? dc : dc.condition);
                
                conditions.forEach((condition: string) => {
                  const key = condition.toLowerCase();
                  if (!conditionMap.has(key)) {
                    conditionMap.set(key, {
                      condition: condition,
                      severity: area.severity,
                      count: 1,
                    });
                  } else {
                    const existing = conditionMap.get(key)!;
                    const severityOrder: { [key: string]: number } = { low: 1, medium: 2, high: 3 };
                    if (severityOrder[area.severity] > severityOrder[existing.severity]) {
                      existing.severity = area.severity;
                    }
                    existing.count++;
                  }
                });
              });
              
              // If no related conditions, use diagnosed conditions directly
              if (conditionMap.size === 0) {
                diagnosedConditions.forEach((dc: any) => {
                  const condition = typeof dc === 'string' ? dc : dc.condition;
                  if (condition) {
                    const key = condition.toLowerCase();
                    const matchingArea = areasOfConcern.find((area: any) => {
                      const conditionText = condition.toLowerCase();
                      return area.relatedConditions?.some((rc: string) => 
                        rc.toLowerCase().includes(conditionText) || conditionText.includes(rc.toLowerCase())
                      ) || area.description?.toLowerCase().includes(conditionText);
                    });
                    
                    conditionMap.set(key, {
                      condition: condition,
                      severity: matchingArea?.severity || 'medium',
                      count: 1,
                    });
                  }
                });
              }
              
              // Fallback: if still no conditions, map body parts to likely conditions
              if (conditionMap.size === 0) {
                const conditions = diagnosedConditions.map((dc: any) => typeof dc === 'string' ? dc : dc.condition);
                conditions.forEach((condition: string) => {
                  if (condition) {
                    const key = condition.toLowerCase();
                    const matchingArea = areasOfConcern.find((area: any) => {
                      const conditionLower = condition.toLowerCase();
                      const areaLower = area.area.toLowerCase();
                      return areaLower.includes(conditionLower) || 
                             conditionLower.includes('head') && areaLower.includes('head') ||
                             conditionLower.includes('brain') && areaLower.includes('head') ||
                             conditionLower.includes('thyroid') && areaLower.includes('neck') ||
                             conditionLower.includes('covid') && areaLower.includes('chest') ||
                             conditionLower.includes('fracture') && (areaLower.includes('leg') || areaLower.includes('arm'));
                    });
                    
                    conditionMap.set(key, {
                      condition: condition,
                      severity: matchingArea?.severity || 'medium',
                      count: 1,
                    });
                  }
                });
              }
              
              const conditionsList = Array.from(conditionMap.values());
              
              return (
                <>
                  {conditionsList.slice(0, 8).map((item, index) => {
                    const { getSeverityColor } = require('@/lib/utils/bodyPartsMapping');
                    const color = getSeverityColor(item.severity);
                    return (
                      <span
                        key={item.condition || index}
                        className="px-2 py-1 rounded-full text-xs font-medium border"
                        style={{
                          backgroundColor: `${color}20`,
                          borderColor: color,
                          color: color === '#fbbf24' ? '#92400e' : color === '#f97316' ? '#9a3412' : '#991b1b',
                        }}
                      >
                        {item.condition} ({item.severity})
                      </span>
                    );
                  })}
                  {conditionsList.length > 8 && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium text-gray-600">
                      +{conditionsList.length - 8} more
                    </span>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}
      <p className="text-center text-xs text-gray-400 mt-2">Click the play button to start 360° rotation • Hover over the image for auto-rotate • Click rotate button for 90° turns</p>
    </div>
  );
}

// Profile Reports Tab - Clone from Member Details ReportsTab
function ProfileReportsTab({ profileData, reports, formatDate, setDash }: any) {
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { profile } = useAuthContext();

  const handleViewReport = (report: any) => {
    setSelectedReport(report);
    setShowViewModal(true);
  };

  const handleEditReport = (report: any) => {
    setSelectedReport(report);
    setShowEditModal(true);
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this report?')) {
      return;
    }

    setDeletingReportId(reportId);
    try {
      await axios.delete(deleteReport, { data: { id: reportId } });
      toast.success('Report deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['getManyReports'] });
    } catch (error: any) {
      console.error('Error deleting report:', error);
      toast.error(error?.response?.data?.error || 'Failed to delete report');
    } finally {
      setDeletingReportId(null);
    }
  };

  const handleShareReport = (report: any) => {
    setSelectedReport(report);
    setShowShareModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 justify-between">
          <>📋 Reports ({reports.length})</>
          <button
            onClick={() => setShowAddModal(true)}
            className="p-2 bg-gray-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <span>+</span>
            Upload Reports
          </button>
        </h3>
        {reports.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">Report Name</th>
                  <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">Report Type</th>
                  <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">Date</th>
                  <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">Shared With</th>
                  <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report: any, index: number) => {
                  const sharedWith = report.sharedWith || [];
                  return (
                    <tr key={report._id || index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3 text-sm">{report.name || report.testName || report.type || 'Report'}</td>
                      <td className="py-2 px-3 text-sm">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                          {report.type || report.documentType || 'Blood Report'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-sm text-gray-600">{formatDate(report.reportDate || report.uploadDate)}</td>
                      <td className="py-2 px-3 text-sm">
                        {sharedWith.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {sharedWith.slice(0, 2).map((share: any, idx: number) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs"
                                title={share.name || share.phoneNumber || 'Shared user'}
                              >
                                {share.name || share.phoneNumber || 'User'}
                              </span>
                            ))}
                            {sharedWith.length > 2 && (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                                +{sharedWith.length - 2}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">Not shared</span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleViewReport(report)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="View"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleEditReport(report)}
                            className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                            title="Edit"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleShareReport(report)}
                            className="p-1 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                            title="Share"
                          >
                            <ShareIcon className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteReport(report._id)}
                            disabled={deletingReportId === report._id}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No reports available</p>
        )}
      </div>

      {/* View Report Modal */}
      {showViewModal && selectedReport && (
        <ViewReportModal
          visible={showViewModal}
          setVisible={setShowViewModal}
          report={selectedReport}
        />
      )}

      {/* Edit Report Modal */}
      {showEditModal && selectedReport && (
        <EditReportModal
          visible={showEditModal}
          setVisible={setShowEditModal}
          report={selectedReport}
          onReportUpdated={() => {
            queryClient.invalidateQueries({ queryKey: ['getManyReports'] });
          }}
        />
      )}

      {/* Share Report Modal */}
      {showShareModal && selectedReport && profile && (
        <ShareReportModal
          visible={showShareModal}
          setVisible={setShowShareModal}
          report={selectedReport}
          profile={profile}
          onReportShared={() => {
            queryClient.invalidateQueries({ queryKey: ['getManyReports'] });
          }}
        />
      )}

      {/* Add Report Modal */}
      {showAddModal && profileData && (
        <AddReportModal
          visible={showAddModal}
          setVisible={setShowAddModal}
          memberPhoneNumber={profileData.phoneNumber}
          memberName={profileData.firstName && profileData.lastName 
            ? `${profileData.firstName} ${profileData.lastName}`.trim()
            : profileData.name || profileData.firstName || 'User'}
          onReportAdded={() => {
            queryClient.invalidateQueries({ queryKey: ['getManyReports'] });
          }}
        />
      )}
    </div>
  );
}

// Profile Anthropometric Tab
function ProfileAnthropometricTab({ profileData, refreshProfile, isMemberView, queryClient }: any) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [activeView, setActiveView] = useState<'data' | 'charts'>('data');
  const [formData, setFormData] = useState({ 
    anthropometric: '', 
    date: new Date().toISOString().split('T')[0] 
  });
  const anthropometricData = profileData?.anthopometric || profileData?.anthropometric || [];

  const handleUpdate = async (updateData: any) => {
    try {
      await axios.put(updateProfile, {
        id: profileData._id,
        ...updateData
      });
      
      // Invalidate queries to refresh data immediately without navigation
      if (isMemberView) {
        queryClient.invalidateQueries({ queryKey: ['getProfileById', profileData._id] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['getProfileByPhone', profileData.phoneNumber] });
        queryClient.invalidateQueries({ queryKey: ['getProfileByPhoneNumber'] });
        // Refresh auth context profile asynchronously without blocking or causing navigation
        if (refreshProfile) {
          // Use setTimeout and catch errors to prevent navigation issues
          setTimeout(() => {
            refreshProfile().catch((err: any) => {
              // Silently handle errors to prevent navigation
              console.error('Error refreshing profile context:', err);
            });
          }, 50);
        }
      }
      
      toast.success('Anthropometric data updated successfully!');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to update anthropometric data');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newEntry = {
      anthopometric: parseFloat(formData.anthropometric),
      updatedDate: new Date(formData.date),
    };

    if (editingIndex !== null) {
      const updated = [...anthropometricData];
      updated[editingIndex] = newEntry;
      handleUpdate({ anthopometric: updated });
      setEditingIndex(null);
    } else {
      handleUpdate({ anthopometric: [...anthropometricData, newEntry] });
    }
    setIsAdding(false);
    setFormData({ anthropometric: '', date: new Date().toISOString().split('T')[0] });
  };

  const handleDelete = (index: number) => {
    if (confirm('Delete this entry?')) {
      const updated = anthropometricData.filter((_: any, i: number) => i !== index);
      handleUpdate({ anthopometric: updated });
      toast.success('Record deleted successfully!');
    }
  };

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Sort data by date for charts
  const sortedData = [...anthropometricData].sort((a: any, b: any) => 
    new Date(a.updatedDate || 0).getTime() - new Date(b.updatedDate || 0).getTime()
  );

  // Prepare chart data
  const chartData = {
    labels: sortedData.map((entry: any) => formatDate(entry.updatedDate)),
    anthropometricData: sortedData.map((entry: any) => entry.anthopometric || entry.anthropometric || null),
  };

  // Chart configuration
  const anthropometricChartConfig = {
    labels: chartData.labels.length > 0 ? chartData.labels : ['No Data'],
    datasets: [
      {
        label: 'Anthropometric Measurement',
        data: chartData.anthropometricData.length > 0 ? chartData.anthropometricData : [0],
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: 'rgb(99, 102, 241)',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
      },
      tooltip: {
        titleFont: { size: 13 },
        bodyFont: { size: 12 },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        ticks: {
          font: { size: 12 },
        },
      },
      x: {
        ticks: {
          font: { size: 12 },
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-indigo-700">Anthropometric Records</h3>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveView('data')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeView === 'data'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Data
            </button>
            <button
              onClick={() => setActiveView('charts')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeView === 'charts'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Charts
            </button>
          </div>
          {activeView === 'data' && (
            <button
              onClick={() => setIsAdding(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              Add Record
            </button>
          )}
        </div>
      </div>

      {activeView === 'data' && (
        <>
          {isAdding && (
            <form onSubmit={handleSubmit} className="bg-indigo-50 rounded-lg p-4 border-2 border-indigo-200">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Measurement Value</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formData.anthropometric}
                    onChange={(e) => setFormData({ ...formData, anthropometric: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Enter anthropometric measurement"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                  {editingIndex !== null ? 'Update' : 'Add'}
                </button>
                <button
                  type="button"
                  onClick={() => { setIsAdding(false); setEditingIndex(null); setFormData({ anthropometric: '', date: new Date().toISOString().split('T')[0] }); }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {anthropometricData.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {anthropometricData.map((entry: any, index: number) => (
                <div 
                  key={index} 
                  className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-4 border-2 border-indigo-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-indigo-800 text-lg mb-2">
                        Value: {entry.anthopometric || entry.anthropometric || 'N/A'}
                      </p>
                      {entry.updatedDate && (
                        <p className="text-sm text-gray-600">
                          Recorded: {formatDate(entry.updatedDate)}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setFormData({
                            anthropometric: (entry.anthopometric || entry.anthropometric || '').toString(),
                            date: entry.updatedDate ? new Date(entry.updatedDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                          });
                          setEditingIndex(index);
                          setIsAdding(true);
                        }}
                        className="p-1 text-indigo-600 hover:bg-indigo-200 rounded"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(index)} className="p-1 text-red-600 hover:bg-red-200 rounded">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-gray-500 text-lg font-medium mb-2">No anthropometric records found</p>
              <p className="text-gray-400 text-sm mb-4">Click "Add Record" to start tracking</p>
              {!isAdding && (
                <button
                  onClick={() => setIsAdding(true)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Add Anthropometric Record
                </button>
              )}
            </div>
          )}
        </>
      )}

      {activeView === 'charts' && (
        <div className="bg-white rounded-lg p-4 border border-gray-200 overflow-hidden">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Anthropometric Trend</h4>
          <div className="h-64 w-full">
            {chartData.anthropometricData.length > 0 && chartData.anthropometricData.some((val: any) => val !== null) ? (
              <Line data={anthropometricChartConfig} options={chartOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No anthropometric data available
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Profile IAP Tab
function ProfileIAPTab({ profileData, refreshProfile, isMemberView, queryClient }: any) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [activeView, setActiveView] = useState<'data' | 'charts'>('data');
  const [formData, setFormData] = useState({ 
    height: '', 
    weight: '',
    headCircumference: '',
    date: new Date().toISOString().split('T')[0] 
  });
  const iapData = profileData?.iapGrowthCharts || profileData?.iap || profileData?.iapGrowth || [];

  const handleUpdate = async (updateData: any) => {
    try {
      await axios.put(updateProfile, {
        id: profileData._id,
        ...updateData
      });
      
      // Invalidate queries to refresh data immediately without navigation
      if (isMemberView) {
        queryClient.invalidateQueries({ queryKey: ['getProfileById', profileData._id] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['getProfileByPhone', profileData.phoneNumber] });
        queryClient.invalidateQueries({ queryKey: ['getProfileByPhoneNumber'] });
        // Refresh auth context profile asynchronously without blocking or causing navigation
        if (refreshProfile) {
          // Use setTimeout and catch errors to prevent navigation issues
          setTimeout(() => {
            refreshProfile().catch((err: any) => {
              // Silently handle errors to prevent navigation
              console.error('Error refreshing profile context:', err);
            });
          }, 50);
        }
      }
      
      toast.success('IAP Growth Chart data updated successfully!');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to update IAP Growth Chart data');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that at least one value is provided
    if (!formData.height && !formData.weight) {
      toast.error('Please enter at least one measurement value (Height or Weight)');
      return;
    }
    
    // Calculate age if DOB is available
    let age = null;
    if (profileData?.dob) {
      const dob = new Date(profileData.dob);
      const today = new Date();
      age = Math.floor((today.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    }
    
    const newEntry = {
      age: age || 0,
      height: formData.height ? parseFloat(formData.height) : null,
      weight: formData.weight ? parseFloat(formData.weight) : null,
      date: new Date(formData.date),
    };

    if (editingIndex !== null) {
      const updated = [...iapData];
      updated[editingIndex] = newEntry;
      handleUpdate({ iapGrowthCharts: updated });
      setEditingIndex(null);
    } else {
      handleUpdate({ iapGrowthCharts: [...iapData, newEntry] });
    }
    setIsAdding(false);
    setFormData({ height: '', weight: '', headCircumference: '', date: new Date().toISOString().split('T')[0] });
  };

  const handleDelete = (index: number) => {
    if (confirm('Delete this entry?')) {
      const updated = iapData.filter((_: any, i: number) => i !== index);
      handleUpdate({ iapGrowthCharts: updated });
      toast.success('Record deleted successfully!');
    }
  };

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Sort data by date for charts
  const sortedData = useMemo(() => {
    return [...iapData].sort((a: any, b: any) => 
      new Date(a.date || a.updatedDate || 0).getTime() - new Date(b.date || b.updatedDate || 0).getTime()
    );
  }, [iapData]);

  // Prepare chart data
  const chartData = useMemo(() => {
    return {
      labels: sortedData.map((entry: any) => formatDate(entry.date || entry.updatedDate)),
      heightData: sortedData.map((entry: any) => (entry.height !== undefined && entry.height !== null) ? parseFloat(entry.height) : null),
      weightData: sortedData.map((entry: any) => (entry.weight !== undefined && entry.weight !== null) ? parseFloat(entry.weight) : null),
    };
  }, [sortedData]);

  // Chart configurations
  const heightChartConfig = {
    labels: chartData.labels.length > 0 ? chartData.labels : ['No Data'],
    datasets: [
      {
        label: 'Height (cm)',
        data: chartData.heightData.length > 0 ? chartData.heightData : [0],
        borderColor: 'rgb(236, 72, 153)',
        backgroundColor: 'rgba(236, 72, 153, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: 'rgb(236, 72, 153)',
      },
    ],
  };

  const weightChartConfig = {
    labels: chartData.labels.length > 0 ? chartData.labels : ['No Data'],
    datasets: [
      {
        label: 'Weight (kg)',
        data: chartData.weightData.length > 0 ? chartData.weightData : [0],
        borderColor: 'rgb(236, 72, 153)',
        backgroundColor: 'rgba(236, 72, 153, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: 'rgb(236, 72, 153)',
      },
    ],
  };


  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
      },
      tooltip: {
        titleFont: { size: 13 },
        bodyFont: { size: 12 },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        ticks: {
          font: { size: 12 },
        },
      },
      x: {
        ticks: {
          font: { size: 12 },
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-pink-700">IAP Growth Charts</h3>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveView('data')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeView === 'data'
                  ? 'bg-white text-pink-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Data
            </button>
            <button
              onClick={() => setActiveView('charts')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeView === 'charts'
                  ? 'bg-white text-pink-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Charts
            </button>
          </div>
          {activeView === 'data' && (
            <button
              onClick={() => setIsAdding(true)}
              className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 flex items-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              Add Record
            </button>
          )}
        </div>
      </div>

      {activeView === 'data' && (
        <>
          {isAdding && (
            <form onSubmit={handleSubmit} className="bg-pink-50 rounded-lg p-4 border-2 border-pink-200">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Height (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.height}
                    onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Enter height"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Enter weight"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700">
                  {editingIndex !== null ? 'Update' : 'Add'}
                </button>
                <button
                  type="button"
                  onClick={() => { setIsAdding(false); setEditingIndex(null); setFormData({ height: '', weight: '', headCircumference: '', date: new Date().toISOString().split('T')[0] }); }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {iapData.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {iapData.map((entry: any, index: number) => (
                <div 
                  key={index} 
                  className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-lg p-4 border-2 border-pink-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="space-y-1 mb-2">
                        {entry.height && (
                          <p className="text-sm text-pink-800">
                            <span className="font-semibold">Height:</span> {entry.height} cm
                          </p>
                        )}
                        {entry.weight && (
                          <p className="text-sm text-pink-800">
                            <span className="font-semibold">Weight:</span> {entry.weight} kg
                          </p>
                        )}
                      </div>
                      {(entry.date || entry.updatedDate) && (
                        <p className="text-xs text-gray-600">
                          Date: {formatDate(entry.date || entry.updatedDate)}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setFormData({
                            height: (entry.height !== undefined && entry.height !== null) ? entry.height.toString() : '',
                            weight: (entry.weight !== undefined && entry.weight !== null) ? entry.weight.toString() : '',
                            headCircumference: '',
                            date: (entry.date || entry.updatedDate) ? new Date(entry.date || entry.updatedDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                          });
                          setEditingIndex(index);
                          setIsAdding(true);
                        }}
                        className="p-1 text-pink-600 hover:bg-pink-200 rounded"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(index)} className="p-1 text-red-600 hover:bg-red-200 rounded">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-gray-500 text-lg font-medium mb-2">No IAP Growth Chart records found</p>
              <p className="text-gray-400 text-sm mb-4">Click "Add Record" to start tracking</p>
              {!isAdding && (
                <button
                  onClick={() => setIsAdding(true)}
                  className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
                >
                  Add IAP Growth Record
                </button>
              )}
            </div>
          )}
        </>
      )}

      {activeView === 'charts' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Height Chart */}
            <div className="bg-white rounded-lg p-4 border border-gray-200 overflow-hidden">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Height (cm)</h4>
              <div className="h-48 w-full">
                {chartData.heightData.length > 0 && chartData.heightData.some((val: any) => val !== null) ? (
                  <Line data={heightChartConfig} options={chartOptions} />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                    No height data available
                  </div>
                )}
              </div>
            </div>

            {/* Weight Chart */}
            <div className="bg-white rounded-lg p-4 border border-gray-200 overflow-hidden">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Weight (kg)</h4>
              <div className="h-48 w-full">
                {chartData.weightData.length > 0 && chartData.weightData.some((val: any) => val !== null) ? (
                  <Line data={weightChartConfig} options={chartOptions} />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                    No weight data available
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

// Profile BMI Tab
function ProfileBMITab({ profileData, refreshProfile, isMemberView, queryClient }: any) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [activeView, setActiveView] = useState<'data' | 'charts'>('data');
  const [formData, setFormData] = useState({ height: '', weight: '', date: new Date().toISOString().split('T')[0] });
  const bmiData = profileData?.bmi || [];

  const calculateBMI = (height: number, weight: number) => {
    if (!height || !weight) return null;
    const heightInMeters = height / 100;
    return parseFloat((weight / (heightInMeters * heightInMeters)).toFixed(1));
  };

  const handleUpdate = async (updateData: any) => {
    try {
      await axios.put(updateProfile, {
        id: profileData._id,
        ...updateData
      });
      
      // Invalidate queries to refresh data immediately without navigation
      if (isMemberView) {
        queryClient.invalidateQueries({ queryKey: ['getProfileById', profileData._id] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['getProfileByPhone', profileData.phoneNumber] });
        queryClient.invalidateQueries({ queryKey: ['getProfileByPhoneNumber'] });
        // Refresh auth context profile asynchronously without blocking or causing navigation
        if (refreshProfile) {
          // Use setTimeout and catch errors to prevent navigation issues
          setTimeout(() => {
            refreshProfile().catch((err: any) => {
              // Silently handle errors to prevent navigation
              console.error('Error refreshing profile context:', err);
            });
          }, 50);
        }
      }
      
      toast.success('BMI updated successfully!');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to update BMI');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newEntry = {
      height: parseFloat(formData.height),
      weight: parseFloat(formData.weight),
      bmi: calculateBMI(parseFloat(formData.height), parseFloat(formData.weight)) || 0,
      updatedDate: new Date(formData.date),
    };

    if (editingIndex !== null) {
      const updated = [...bmiData];
      updated[editingIndex] = newEntry;
      handleUpdate({ bmi: updated });
      setEditingIndex(null);
    } else {
      handleUpdate({ bmi: [...bmiData, newEntry] });
    }
    setIsAdding(false);
    setFormData({ height: '', weight: '', date: new Date().toISOString().split('T')[0] });
  };

  const handleDelete = (index: number) => {
    if (confirm('Delete this entry?')) {
      const updated = bmiData.filter((_: any, i: number) => i !== index);
      handleUpdate({ bmi: updated });
      toast.success('Record deleted successfully!');
    }
  };

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { label: 'Underweight', color: 'blue', min: 0, max: 18.4 };
    if (bmi < 25) return { label: 'Normal', color: 'green', min: 18.5, max: 24.9 };
    if (bmi < 30) return { label: 'Overweight', color: 'orange', min: 25, max: 29.9 };
    if (bmi < 35) return { label: 'Obese', color: 'red', min: 30, max: 34.9 };
    return { label: 'Extremely Obese', color: 'red', min: 35, max: 50 };
  };

  // Sort data by date for charts
  const sortedData = [...bmiData].sort((a: any, b: any) => 
    new Date(a.updatedDate || 0).getTime() - new Date(b.updatedDate || 0).getTime()
  );

  // Get latest BMI value for gauge
  const latestBMI = sortedData.length > 0 
    ? (sortedData[sortedData.length - 1].bmi || 
       (sortedData[sortedData.length - 1].weight && sortedData[sortedData.length - 1].height
         ? parseFloat((sortedData[sortedData.length - 1].weight / Math.pow(sortedData[sortedData.length - 1].height / 100, 2)).toFixed(1))
         : 0))
    : 0;

  const bmiCategory = latestBMI > 0 ? getBMICategory(latestBMI) : null;

  // Prepare chart data
  const chartData = {
    labels: sortedData.map((entry: any) => formatDate(entry.updatedDate)),
    heightData: sortedData.map((entry: any) => entry.height || null),
    weightData: sortedData.map((entry: any) => entry.weight || null),
    bmiData: sortedData.map((entry: any) => {
      if (entry.bmi) return entry.bmi;
      if (entry.weight && entry.height) {
        return parseFloat((entry.weight / Math.pow(entry.height / 100, 2)).toFixed(1));
      }
      return null;
    }),
  };

  // Chart configurations
  const heightChartConfig = {
    labels: chartData.labels.length > 0 ? chartData.labels : ['No Data'],
    datasets: [
      {
        label: 'Height (cm)',
        data: chartData.heightData.length > 0 ? chartData.heightData : [0],
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: 'rgb(34, 197, 94)',
      },
    ],
  };

  const weightChartConfig = {
    labels: chartData.labels.length > 0 ? chartData.labels : ['No Data'],
    datasets: [
      {
        label: 'Weight (kg)',
        data: chartData.weightData.length > 0 ? chartData.weightData : [0],
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: 'rgb(34, 197, 94)',
      },
    ],
  };

  const bmiChartConfig = {
    labels: chartData.labels.length > 0 ? chartData.labels : ['No Data'],
    datasets: [
      {
        label: 'BMI',
        data: chartData.bmiData.length > 0 ? chartData.bmiData : [0],
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: 'rgb(34, 197, 94)',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          font: {
            size: typeof window !== 'undefined' && window.innerWidth < 640 ? 10 : 12,
          },
          padding: typeof window !== 'undefined' && window.innerWidth < 640 ? 8 : 12,
        },
      },
      tooltip: {
        titleFont: {
          size: typeof window !== 'undefined' && window.innerWidth < 640 ? 11 : 13,
        },
        bodyFont: {
          size: typeof window !== 'undefined' && window.innerWidth < 640 ? 10 : 12,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        ticks: {
          font: {
            size: typeof window !== 'undefined' && window.innerWidth < 640 ? 10 : 12,
          },
        },
      },
      x: {
        ticks: {
          font: {
            size: typeof window !== 'undefined' && window.innerWidth < 640 ? 10 : 12,
          },
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-purple-700">BMI Records</h3>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveView('data')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeView === 'data'
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Data
            </button>
            <button
              onClick={() => setActiveView('charts')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeView === 'charts'
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Charts
            </button>
          </div>
          {activeView === 'data' && (
            <button
              onClick={() => setIsAdding(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              Add BMI
            </button>
          )}
        </div>
      </div>

      {activeView === 'data' && (
        <>
          {isAdding && (
            <form onSubmit={handleSubmit} className="bg-purple-50 rounded-lg p-4 border-2 border-purple-200">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Height (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formData.height}
                    onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              {formData.height && formData.weight && (
                <p className="text-purple-700 font-semibold mb-2">
                  BMI: {calculateBMI(parseFloat(formData.height), parseFloat(formData.weight))?.toFixed(2)}
                </p>
              )}
              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                  {editingIndex !== null ? 'Update' : 'Add'}
                </button>
                <button
                  type="button"
                  onClick={() => { setIsAdding(false); setEditingIndex(null); setFormData({ height: '', weight: '', date: new Date().toISOString().split('T')[0] }); }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {bmiData.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bmiData.map((entry: any, index: number) => {
                const bmiValue = entry.bmi || (entry.weight && entry.height 
                  ? (entry.weight / Math.pow(entry.height / 100, 2)).toFixed(1) 
                  : null);
                const category = bmiValue ? getBMICategory(parseFloat(bmiValue)) : null;
                
                return (
                  <div 
                    key={index} 
                    className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border-2 border-purple-200 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-semibold text-purple-800 text-lg">
                            BMI: {bmiValue || 'N/A'}
                          </p>
                        </div>
                        {category && (
                          <p className={`text-sm font-medium mb-2 px-2 py-1 rounded inline-block ${
                            category.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                            category.color === 'green' ? 'bg-green-100 text-green-800' :
                            category.color === 'orange' ? 'bg-orange-100 text-orange-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {category.label}
                          </p>
                        )}
                        <div className="text-sm text-gray-600 mt-2 space-y-1">
                          {entry.weight && (
                            <p>Weight: {entry.weight} kg</p>
                          )}
                          {entry.height && (
                            <p>Height: {entry.height} cm</p>
                          )}
                          {entry.updatedDate && (
                            <p className="text-xs text-gray-500 mt-1">
                              Recorded: {formatDate(entry.updatedDate)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setFormData({
                              height: entry.height?.toString() || '',
                              weight: entry.weight?.toString() || '',
                              date: entry.updatedDate ? new Date(entry.updatedDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                            });
                            setEditingIndex(index);
                            setIsAdding(true);
                          }}
                          className="p-1 text-purple-600 hover:bg-purple-200 rounded"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(index)} className="p-1 text-red-600 hover:bg-red-200 rounded">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <svg 
                className="w-16 h-16 text-gray-400 mx-auto mb-4" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" 
                />
              </svg>
              <p className="text-gray-500 text-lg font-medium mb-2">No BMI records found</p>
              <p className="text-gray-400 text-sm mb-4">
                Click "Add BMI" to start tracking your BMI
              </p>
              {!isAdding && (
                <button
                  onClick={() => setIsAdding(true)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Add BMI Record
                </button>
              )}
            </div>
          )}
        </>
      )}

      {activeView === 'charts' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Top Row: Height, Weight, and BMI Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
            {/* BMI Height Chart */}
            <div className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200 overflow-hidden">
              <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Height (cm)</h4>
              <div className="h-48 sm:h-56 lg:h-64 w-full">
                {chartData.heightData.length > 0 && chartData.heightData.some((val: any) => val !== null) ? (
                  <Line data={heightChartConfig} options={chartOptions} />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500 text-sm sm:text-base">
                    No height data available
                  </div>
                )}
              </div>
            </div>

            {/* BMI Weight Chart */}
            <div className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200 overflow-hidden">
              <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Weight (kg)</h4>
              <div className="h-48 sm:h-56 lg:h-64 w-full">
                {chartData.weightData.length > 0 && chartData.weightData.some((val: any) => val !== null) ? (
                  <Line data={weightChartConfig} options={chartOptions} />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500 text-sm sm:text-base">
                    No weight data available
                  </div>
                )}
              </div>
            </div>

            {/* BMI Value Chart */}
            <div className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200 overflow-hidden">
              <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">BMI Trend</h4>
              <div className="h-48 sm:h-56 lg:h-64 w-full">
                {chartData.bmiData.length > 0 && chartData.bmiData.some((val: any) => val !== null) ? (
                  <Line data={bmiChartConfig} options={chartOptions} />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500 text-sm sm:text-base">
                    No BMI data available
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Row: BMI Gauge Chart */}
          {latestBMI > 0 && (
            <div className="bg-white rounded-lg p-3 sm:p-4 lg:p-6 border border-gray-200">
              <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Current BMI Gauge</h4>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 items-center">
                <div className="lg:col-span-2 flex justify-center">
                  <ReactSpeedometer
                    maxValue={50}
                    minValue={0}
                    value={latestBMI}
                    needleColor="rgb(34, 197, 94)"
                    startColor="#9CA3AF"
                    segments={5}
                    endColor="#EF4444"
                    textColor="#374151"
                    valueFormat=".1f"
                    customSegmentLabels={[
                      { text: '< 18.4', position: 'OUTSIDE' as any, color: '#374151' },
                      { text: '18.5-24.9', position: 'OUTSIDE' as any, color: '#374151' },
                      { text: '25-29.9', position: 'OUTSIDE' as any, color: '#374151' },
                      { text: '30-34.9', position: 'OUTSIDE' as any, color: '#374151' },
                      { text: '35 >', position: 'OUTSIDE' as any, color: '#374151' },
                    ]}
                    customSegmentStops={[0, 18.5, 25, 30, 35, 50]}
                    ringWidth={47}
                    needleTransitionDuration={4000}
                    currentValueText={`BMI: ${latestBMI.toFixed(1)}`}
                  />
                </div>
                <div className="space-y-3">
                  <h5 className="font-semibold text-gray-900 mb-3">BMI Categories</h5>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#9CA3AF' }}></div>
                    <span className="text-sm text-gray-700">Underweight</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#22C55E' }}></div>
                    <span className="text-sm text-gray-700">Normal</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#EAB308' }}></div>
                    <span className="text-sm text-gray-700">Overweight</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#F97316' }}></div>
                    <span className="text-sm text-gray-700">Obese</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#EF4444' }}></div>
                    <span className="text-sm text-gray-700">Extremely Obese</span>
                  </div>
                  {bmiCategory && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm text-gray-600">Current BMI</p>
                      <p className="text-2xl font-bold" style={{ color: bmiCategory.color === 'blue' ? '#3B82F6' : bmiCategory.color === 'green' ? '#22C55E' : bmiCategory.color === 'orange' ? '#F97316' : '#EF4444' }}>
                        {latestBMI.toFixed(1)}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">{bmiCategory.label}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Profile MUAC Tab
function ProfileMUACTab({ profileData, refreshProfile, isMemberView, queryClient }: any) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [activeView, setActiveView] = useState<'data' | 'charts'>('data');
  const [formData, setFormData] = useState({ muac: '', date: new Date().toISOString().split('T')[0] });
  const muacData = profileData?.muac || [];

  const handleUpdate = async (updateData: any) => {
    try {
      await axios.put(updateProfile, {
        id: profileData._id,
        ...updateData
      });
      
      // Invalidate queries to refresh data immediately without navigation
      if (isMemberView) {
        queryClient.invalidateQueries({ queryKey: ['getProfileById', profileData._id] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['getProfileByPhone', profileData.phoneNumber] });
        queryClient.invalidateQueries({ queryKey: ['getProfileByPhoneNumber'] });
        // Refresh auth context profile asynchronously without blocking or causing navigation
        if (refreshProfile) {
          // Use setTimeout and catch errors to prevent navigation issues
          setTimeout(() => {
            refreshProfile().catch((err: any) => {
              // Silently handle errors to prevent navigation
              console.error('Error refreshing profile context:', err);
            });
          }, 50);
        }
      }
      
      toast.success('MUAC updated successfully!');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to update MUAC');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const muacValue = parseFloat(formData.muac);
    
    // Validate that the value is a valid number
    if (isNaN(muacValue)) {
      toast.error('Please enter a valid MUAC value');
      return;
    }
    
    // Schema uses 'height' field for MUAC data
    const newEntry = {
      height: muacValue,
      updatedDate: new Date(formData.date),
    };

    if (editingIndex !== null) {
      const updated = [...muacData];
      updated[editingIndex] = newEntry;
      handleUpdate({ muac: updated });
      setEditingIndex(null);
    } else {
      handleUpdate({ muac: [...muacData, newEntry] });
    }
    setIsAdding(false);
    setFormData({ muac: '', date: new Date().toISOString().split('T')[0] });
  };

  const handleDelete = (index: number) => {
    if (confirm('Delete this entry?')) {
      const updated = muacData.filter((_: any, i: number) => i !== index);
      handleUpdate({ muac: updated });
      toast.success('Record deleted successfully!');
    }
  };

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Sort data by date for charts
  const sortedData = useMemo(() => {
    return [...muacData].sort((a: any, b: any) => 
      new Date(a.updatedDate || 0).getTime() - new Date(b.updatedDate || 0).getTime()
    );
  }, [muacData]);

  // Prepare chart data
  const chartData = useMemo(() => {
    const labels = sortedData.map((entry: any) => formatDate(entry.updatedDate));
    const muacData = sortedData.map((entry: any) => {
      // Schema uses 'height' field for MUAC, check that first
      const value = (entry.height !== undefined && entry.height !== null) 
        ? entry.height 
        : (entry.muac !== undefined && entry.muac !== null)
          ? entry.muac
          : null;
      return value !== null && value !== undefined && !isNaN(value) ? parseFloat(value) : null;
    });
    
    return {
      labels,
      muacData,
    };
  }, [sortedData]);

  // Chart configuration
  const muacChartConfig = useMemo(() => {
    const hasValidData = chartData.muacData.some((val: any) => val !== null && val !== undefined);
    
    return {
      labels: chartData.labels.length > 0 ? chartData.labels : ['No Data'],
      datasets: [
        {
          label: 'MUAC (cm)',
          data: hasValidData ? chartData.muacData : [],
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: 'rgb(34, 197, 94)',
        },
      ],
    };
  }, [chartData]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
      },
      tooltip: {
        titleFont: { size: 13 },
        bodyFont: { size: 12 },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        ticks: {
          font: { size: 12 },
        },
      },
      x: {
        ticks: {
          font: { size: 12 },
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-green-700">MUAC Records</h3>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveView('data')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeView === 'data'
                  ? 'bg-white text-green-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Data
            </button>
            <button
              onClick={() => setActiveView('charts')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeView === 'charts'
                  ? 'bg-white text-green-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Charts
            </button>
          </div>
          {activeView === 'data' && (
            <button
              onClick={() => setIsAdding(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              Add MUAC
            </button>
          )}
        </div>
      </div>

      {activeView === 'data' && (
        <>
          {isAdding && (
            <form onSubmit={handleSubmit} className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">MUAC (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formData.muac}
                    onChange={(e) => setFormData({ ...formData, muac: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Enter MUAC measurement"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                  {editingIndex !== null ? 'Update' : 'Add'}
                </button>
                <button
                  type="button"
                  onClick={() => { setIsAdding(false); setEditingIndex(null); setFormData({ muac: '', date: new Date().toISOString().split('T')[0] }); }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {muacData.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {muacData.map((entry: any, index: number) => (
                <div 
                  key={index} 
                  className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border-2 border-green-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-green-800 text-lg mb-2">
                        MUAC: {(entry.height !== undefined && entry.height !== null) 
                          ? `${entry.height} cm` 
                          : (entry.muac !== undefined && entry.muac !== null)
                            ? `${entry.muac} cm`
                            : 'N/A cm'}
                      </p>
                      {entry.updatedDate && (
                        <p className="text-sm text-gray-600">
                          Recorded: {formatDate(entry.updatedDate)}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          // Schema uses 'height' field for MUAC
                          const muacValue = (entry.height !== undefined && entry.height !== null) 
                            ? entry.height 
                            : (entry.muac !== undefined && entry.muac !== null)
                              ? entry.muac
                              : '';
                          setFormData({
                            muac: muacValue.toString(),
                            date: entry.updatedDate ? new Date(entry.updatedDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                          });
                          setEditingIndex(index);
                          setIsAdding(true);
                        }}
                        className="p-1 text-green-600 hover:bg-green-200 rounded"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(index)} className="p-1 text-red-600 hover:bg-red-200 rounded">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-gray-500 text-lg font-medium mb-2">No MUAC records found</p>
              <p className="text-gray-400 text-sm mb-4">Click "Add MUAC" to start tracking</p>
              {!isAdding && (
                <button
                  onClick={() => setIsAdding(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Add MUAC Record
                </button>
              )}
            </div>
          )}
        </>
      )}

      {activeView === 'charts' && (
        <div className="bg-white rounded-lg p-4 border border-gray-200 overflow-hidden">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">MUAC Trend</h4>
          <div className="h-64 w-full">
            {chartData.muacData.length > 0 && chartData.muacData.some((val: any) => val !== null && val !== undefined) ? (
              <Line data={muacChartConfig} options={chartOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No MUAC data available
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Profile Immunization Tab
function ProfileImmunizationTab({ profileData, refreshProfile, isMemberView, queryClient }: any) {
  // Use React Query hook for vaccine data with automatic caching
  const { data: vaccineData, isLoading: loading, isError, error } = useGetAllVaccineData();
  
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/2fbc7e35-288c-4e48-8204-8ecc0d034a57',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'profile.tsx:4256',message:'ProfileImmunizationTab render - React Query state',data:{loading,isError,hasData:!!vaccineData,hasVaccines:!!vaccineData?.vaccines,hasDoses:!!vaccineData?.doses,hasDurations:!!vaccineData?.durations,vaccinesLength:vaccineData?.vaccines?.length||0,dosesLength:vaccineData?.doses?.length||0,durationsLength:vaccineData?.durations?.length||0,errorMessage:error?.message||null,errorString:error?.toString()||null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  const [selectedDose, setSelectedDose] = useState<any>(null);
  const [selectedVaccine, setSelectedVaccine] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  
  // Initialize vaccineCompletions from profileData if available (now it's a Map/Object)
  const [vaccineCompletions, setVaccineCompletions] = useState<Record<string, any>>(() => {
    if (profileData?.vaccineCompletions) {
      // Handle both Map and plain object
      if (profileData.vaccineCompletions instanceof Map) {
        return Object.fromEntries(profileData.vaccineCompletions);
      }
      return profileData.vaccineCompletions || {};
    }
    return {};
  });

  // Update local state when profileData changes - this ensures data persists after refresh
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/2fbc7e35-288c-4e48-8204-8ecc0d034a57',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'profile.tsx:4242',message:'profileData changed, syncing vaccineCompletions',data:{hasProfileData:!!profileData,profileId:profileData?._id||profileData?.id,hasVaccineCompletions:!!profileData?.vaccineCompletions,vaccineCompletionsType:typeof profileData?.vaccineCompletions,vaccineCompletionsKeys:profileData?.vaccineCompletions?Object.keys(profileData.vaccineCompletions):[]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion

    if (profileData && (profileData._id || profileData.id)) {
      if (profileData.vaccineCompletions) {
        // Handle both Map and plain object
        let completions: Record<string, any> = {};
        if (profileData.vaccineCompletions instanceof Map) {
          completions = Object.fromEntries(profileData.vaccineCompletions);
        } else if (typeof profileData.vaccineCompletions === 'object' && profileData.vaccineCompletions !== null) {
          completions = profileData.vaccineCompletions;
        }
        
        // Ensure all values are properly formatted
        const normalizedCompletions: Record<string, any> = {};
        Object.keys(completions).forEach((key) => {
          const completion = completions[key];
          if (completion && typeof completion === 'object') {
            normalizedCompletions[key] = {
              ...completion,
              completed: completion.completed !== false, // Ensure completed is true if not explicitly false
            };
          }
        });
        
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/2fbc7e35-288c-4e48-8204-8ecc0d034a57',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'profile.tsx:4260',message:'Setting vaccineCompletions state',data:{normalizedKeys:Object.keys(normalizedCompletions),normalizedCompletions},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        
        setVaccineCompletions(normalizedCompletions);
      } else {
        setVaccineCompletions({});
      }
    }
  }, [profileData]);

  // Vaccine data is now fetched via React Query hook above

  // Helper function to convert duration to hours for sorting
  const convertToHours = (durationObj: any) => {
    if (!durationObj) return 0;
    const { duration, type } = durationObj;
    switch (type) {
      case 'hour':
        return duration;
      case 'day':
        return duration * 24;
      case 'month':
        return duration * 24 * 30;
      case 'year':
        return duration * 24 * 30 * 12;
      case 'minute':
        return duration / 60;
      case 'birth':
        return 0;
      default:
        return duration;
    }
  };

  // Helper function to format duration for display
  const formatDuration = (duration: any, type: string) => {
    if (duration === 1 && type === 'birth') return '1 birth';
    if (duration === 10 && type === 'minute') return '10 minute';
    if (duration === 1 && type === 'month') return '1m';
    if (duration === 6 && type === 'month') return '6m';
    if (duration === 10 && type === 'year') return '10Y';
    return `${duration} ${type}`;
  };

  // Get color based on dose type from the dose object
  const getCellColor = (doseType: string | null | undefined) => {
    if (!doseType) return 'transparent';
    
    // Normalize the doseType string for comparison (trim and handle case variations)
    const normalizedType = doseType.toString().trim();
    
    // Handle multiple possible values for the same type
    // Recommended age/type - Yellow
    if (normalizedType === 'Recommended Type' || 
        normalizedType === 'Recommended age' ||
        normalizedType.toLowerCase().includes('recommended')) {
      return '#fffbe6'; // Yellow
    }
    
    // Catch up age range - Light green
    if (normalizedType === 'Catch up age range' ||
        normalizedType.toLowerCase().includes('catch up')) {
      return '#f6ffed'; // Light green
    }
    
    // Vaccine in special situations - Light blue
    if (normalizedType === 'Vaccine in special situations' || 
        normalizedType === 'Vaccines in special situations' ||
        normalizedType.toLowerCase().includes('special situation')) {
      return '#e6f7ff'; // Light blue
    }
    
    return 'transparent';
  };

  // Helper to normalize ID (handle both _id and id fields)
  const normalizeId = (obj: any): string | null => {
    if (!obj) return null;
    const id = obj._id || obj.id || null;
    return id ? id.toString() : null;
  };

  // Check if a dose is completed (now using Map/Object lookup)
  const isDoseCompleted = (doseId: string | null) => {
    if (!doseId) return false;
    const normalizedDoseId = doseId.toString();
    const completion = vaccineCompletions[normalizedDoseId];
    
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/2fbc7e35-288c-4e48-8204-8ecc0d034a57',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'profile.tsx:4326',message:'Checking if dose is completed',data:{doseId,normalizedDoseId,hasCompletion:!!completion,completion,allKeys:Object.keys(vaccineCompletions)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    return completion?.completed === true;
  };

  // Get completion data for a dose
  const getDoseCompletion = (doseId: string | null) => {
    if (!doseId) return null;
    const normalizedDoseId = doseId.toString();
    return vaccineCompletions[normalizedDoseId] || null;
  };

  // Handle dose click
  const handleDoseClick = (dose: any, vaccine: any) => {
    setSelectedDose(dose);
    setSelectedVaccine(vaccine);
    setShowModal(true);
  };

  // Handle vaccine completion - receives the new completion data from modal
  const handleVaccineCompleted = async (newCompletion?: any) => {
    try {
      // If we have the new completion data, add it immediately to local state (optimistic update)
      if (newCompletion && newCompletion.doseId) {
        const doseId = newCompletion.doseId.toString();
        setVaccineCompletions((prev) => ({
          ...prev,
          [doseId]: {
            ...newCompletion,
            completed: true, // Ensure completed is true
          },
        }));
      }
      
      // Refresh profile data from server to ensure persistence
      try {
        if (isMemberView) {
          // For member view, use getProfileById
          await queryClient.invalidateQueries({ queryKey: ['getProfileById', profileData._id] });
          const result = await queryClient.refetchQueries({ queryKey: ['getProfileById', profileData._id] });
          if (result && result[0]?.state?.data?.vaccineCompletions) {
            const completions = result[0].state.data.vaccineCompletions instanceof Map
              ? Object.fromEntries(result[0].state.data.vaccineCompletions)
              : result[0].state.data.vaccineCompletions || {};
            setVaccineCompletions(completions);
          } else {
            // Fallback: fetch directly
            const response = await axios.get(`/api/profile/getProfileById?id=${profileData._id}`);
            if (response.data?.vaccineCompletions) {
              const completions = response.data.vaccineCompletions instanceof Map
                ? Object.fromEntries(response.data.vaccineCompletions)
                : response.data.vaccineCompletions || {};
              setVaccineCompletions(completions);
            }
          }
        } else {
          // For main profile view, use getProfileByPhoneNumber (correct query key)
          // Invalidate all related queries
          await queryClient.invalidateQueries({ queryKey: ['getProfileByPhoneNumber'] });
          await queryClient.invalidateQueries({ queryKey: ['getProfileByPhoneNumber', profileData.phoneNumber] });
          
          // Refetch the query with the correct key
          const result = await queryClient.refetchQueries({ 
            queryKey: ['getProfileByPhoneNumber', profileData.phoneNumber] 
          });
          
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/2fbc7e35-288c-4e48-8204-8ecc0d034a57',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'profile.tsx:4402',message:'Query refetch result',data:{hasResult:!!result,resultLength:result?.length,hasData:!!result?.[0]?.state?.data,hasVaccineCompletions:!!result?.[0]?.state?.data?.vaccineCompletions,vaccineCompletionsKeys:result?.[0]?.state?.data?.vaccineCompletions?Object.keys(result[0].state.data.vaccineCompletions):[]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          
          if (result && result[0]?.state?.data?.vaccineCompletions) {
            const completions = result[0].state.data.vaccineCompletions instanceof Map
              ? Object.fromEntries(result[0].state.data.vaccineCompletions)
              : result[0].state.data.vaccineCompletions || {};
            setVaccineCompletions(completions);
          } else {
            // Fallback: fetch directly
            const response = await axios.get(`/api/profile/getProfileByPhone?phoneNumber=${encodeURIComponent(profileData.phoneNumber)}`);
            
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/2fbc7e35-288c-4e48-8204-8ecc0d034a57',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'profile.tsx:4413',message:'Fallback direct fetch result',data:{hasVaccineCompletions:!!response.data?.vaccineCompletions,vaccineCompletionsKeys:response.data?.vaccineCompletions?Object.keys(response.data.vaccineCompletions):[]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
            
            if (response.data?.vaccineCompletions) {
              const completions = response.data.vaccineCompletions instanceof Map
                ? Object.fromEntries(response.data.vaccineCompletions)
                : response.data.vaccineCompletions || {};
              setVaccineCompletions(completions);
            }
          }
          
          // Refresh profile context to update the auth context profile
          if (refreshProfile) {
            setTimeout(() => {
              refreshProfile().catch((err: any) => {
                console.error('Error refreshing profile context:', err);
              });
            }, 100);
          }
        }
      } catch (error) {
        console.error('Error refreshing vaccine completions from server:', error);
      }
    } catch (error) {
      console.error('Error refreshing vaccine completions:', error);
    }
  };

  // Sort durations
  const sortedDurations = useMemo(() => {
    if (!vaccineData?.durations) return [];
    return [...vaccineData.durations].sort((a: any, b: any) => {
      const aHours = convertToHours(a);
      const bHours = convertToHours(b);
      return aHours - bHours;
    });
  }, [vaccineData?.durations]);

  // Create table data
  const tableData = useMemo(() => {
    // Allow table to render even if doses is empty (will show vaccines with empty cells)
    if (!vaccineData?.vaccines) return [];
    // If doses is missing/undefined, use empty array to allow rendering
    const doses = vaccineData.doses || [];

    return vaccineData.vaccines.map((vaccine: any) => {
      const row: any = {
        key: vaccine._id || vaccine.id,
        vaccineName: vaccine.name,
        vaccine,
      };

      sortedDurations.forEach((duration: any) => {
        const matchingDose = doses.find(
          (doseItem: any) => {
            // Match vaccine
            const doseVaccineId = typeof doseItem.vaccine === 'string' 
              ? doseItem.vaccine 
              : doseItem.vaccine?._id || doseItem.vaccine?.id;
            const vaccineId = vaccine._id || vaccine.id;
            
            if (doseVaccineId !== vaccineId) return false;
            
            // Match duration - handle both populated object and ID reference
            const doseDuration = doseItem.doseDuration;
            if (!doseDuration) return false;
            
            // If doseDuration is populated (object with duration and type)
            if (typeof doseDuration === 'object' && doseDuration.duration !== undefined) {
              return (
                doseDuration.duration === duration.duration &&
                doseDuration.type === duration.type
              );
            }
            
            // If doseDuration is an ID reference, match by ID
            if (typeof doseDuration === 'string' || doseDuration._id) {
              const durationId = duration._id || duration.id;
              const doseDurationId = typeof doseDuration === 'string' ? doseDuration : doseDuration._id || doseDuration.id;
              return doseDurationId === durationId;
            }
            
            return false;
          }
        );

        if (matchingDose) {
          // Extract doseType directly from the dose object
          const doseType = matchingDose.doseType || null;
          
          row[`duration_${duration._id || duration.id}`] = {
            dose: matchingDose,
            name: matchingDose.name,
            doseType: doseType, // Use doseType from the dose object for coloring
          };
        } else {
          row[`duration_${duration._id || duration.id}`] = null;
        }
      });

      return row;
    });
  }, [vaccineData, sortedDurations]);

  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/2fbc7e35-288c-4e48-8204-8ecc0d034a57',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'profile.tsx:4577',message:'Rendering decision point',data:{loading,isError,willShowLoading:loading,willShowNoVaccines:!loading&&(!vaccineData||!vaccineData.vaccines||vaccineData.vaccines.length===0),willShowSchedule:!loading&&vaccineData&&vaccineData.vaccines&&vaccineData.vaccines.length>0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion

  if (loading) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/2fbc7e35-288c-4e48-8204-8ecc0d034a57',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'profile.tsx:4580',message:'Rendering loading state',data:{loading},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    return (
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-yellow-700">Immunization Schedule</h3>
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">Loading immunization schedule...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/2fbc7e35-288c-4e48-8204-8ecc0d034a57',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'profile.tsx:4592',message:'Rendering error state',data:{isError,errorMessage:error?.message,errorString:error?.toString(),errorType:error?.constructor?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    return (
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-yellow-700">Immunization Schedule</h3>
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-red-300">
          <p className="text-red-500 text-lg font-medium mb-2">Failed to load immunization schedule</p>
          <p className="text-gray-400 text-sm mb-4">{error instanceof Error ? error.message : 'An error occurred'}</p>
        </div>
      </div>
    );
  }

  if (!vaccineData || !vaccineData.vaccines || vaccineData.vaccines.length === 0) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/2fbc7e35-288c-4e48-8204-8ecc0d034a57',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'profile.tsx:4605',message:'Rendering no vaccines state',data:{hasVaccineData:!!vaccineData,hasVaccines:!!vaccineData?.vaccines,vaccinesLength:vaccineData?.vaccines?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    return (
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-yellow-700">Immunization Schedule</h3>
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500 text-lg font-medium mb-2">No vaccines available</p>
          <p className="text-gray-400 text-sm">Please check back later</p>
        </div>
      </div>
    );
  }

  // Warn if doses are missing but vaccines are available
  const hasDoses = vaccineData.doses && vaccineData.doses.length > 0;
  const hasDurations = vaccineData.durations && vaccineData.durations.length > 0;

  return (
    <div className="space-y-6">
      {!hasDoses && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 text-sm">
            <strong>Note:</strong> Vaccine dose information is temporarily unavailable. The schedule will show vaccines but may not display all dose timing details.
          </p>
        </div>
      )}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-yellow-700">Immunization Schedule</h3>
        <button
          onClick={() => setShowScheduleModal(true)}
          className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          View Schedule
        </button>
      </div>

      {/* Vaccine Completion Modal */}
      {showModal && selectedDose && selectedVaccine && (
        <MarkVaccineCompletedModal
          visible={showModal}
          setVisible={(visible) => {
            setShowModal(visible);
            // Clear selections when modal closes
            if (!visible) {
              setSelectedDose(null);
              setSelectedVaccine(null);
            }
          }}
          dose={selectedDose}
          vaccine={selectedVaccine}
          profileId={profileData._id}
          onVaccineCompleted={async (completionData?: any) => {
            await handleVaccineCompleted(completionData);
            // Optionally reopen schedule modal after successful completion
            // User can manually reopen if needed
          }}
        />
      )}

      {/* Vaccination Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
              onClick={() => setShowScheduleModal(false)}
            ></div>

            {/* Modal panel */}
            <div className="relative z-50 inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-7xl sm:w-full">
              {/* Header */}
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Immunization Schedule</h3>
                  <button
                    onClick={() => setShowScheduleModal(false)}
                    className="text-gray-400 hover:text-gray-500 transition-colors"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Content - Vaccine Table */}
              <div className="px-4 pt-4 pb-4 sm:p-6">
                <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto max-h-[70vh] overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-20 border-r border-gray-200">
                          Vaccine
                        </th>
                        {sortedDurations.map((duration: any) => (
                          <th
                            key={duration._id || duration.id}
                            className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]"
                          >
                            {formatDuration(duration.duration, duration.type)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {tableData.map((row: any) => (
                        <tr key={row.key} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900 sticky left-0 bg-white z-10 border-r border-gray-200">
                            {row.vaccineName}
                          </td>
                          {sortedDurations.map((duration: any) => {
                            const cellData = row[`duration_${duration._id || duration.id}`];
                            const doseId = normalizeId(cellData?.dose);
                            const isCompleted = isDoseCompleted(doseId);
                            const completion = getDoseCompletion(doseId);

                            return (
                              <td
                                key={duration._id || duration.id}
                                className="px-4 py-3 text-center align-middle"
                              >
                                {cellData ? (
                                  <div
                                    onClick={() => {
                                      handleDoseClick(cellData.dose, row.vaccine);
                                      setShowScheduleModal(false);
                                    }}
                                    className={`
                                      inline-block px-3 py-2 rounded-lg cursor-pointer transition-all
                                      ${isCompleted 
                                        ? 'bg-green-100 border-2 border-green-500 hover:bg-green-200' 
                                        : 'hover:opacity-80'
                                      }
                                    `}
                                    style={{
                                      backgroundColor: isCompleted 
                                        ? undefined // Use className for green when completed
                                        : (() => {
                                            // Get color based on doseType from the dose object
                                            const color = getCellColor(cellData.doseType);
                                            // Apply the color if found, otherwise use gray fallback
                                            return color !== 'transparent' ? color : '#f9fafb';
                                          })(),
                                      minHeight: '40px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      border: isCompleted ? '2px solid #10b981' : '1px solid #e5e7eb',
                                    }}
                                    title={isCompleted && completion 
                                      ? `Completed on ${new Date(completion.dateAdministered).toLocaleDateString()}${completion.remark ? ` - ${completion.remark}` : ''}`
                                      : 'Click to mark as completed'
                                    }
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium">{cellData.name}</span>
                                      {isCompleted && (
                                        <svg
                                          className="w-5 h-5 text-green-600"
                                          fill="currentColor"
                                          viewBox="0 0 20 20"
                                        >
                                          <path
                                            fillRule="evenodd"
                                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                            clipRule="evenodd"
                                          />
                                        </svg>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Color Legends */}
                <div className="flex flex-wrap gap-4 justify-center pt-4 mt-4">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-5 h-5 border border-gray-300"
                      style={{ backgroundColor: '#fffbe6' }}
                    />
                    <span className="text-sm text-gray-600">Recommended age</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-5 h-5 border border-gray-300"
                      style={{ backgroundColor: '#f6ffed' }}
                    />
                    <span className="text-sm text-gray-600">Catch up age range</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-5 h-5 border border-gray-300"
                      style={{ backgroundColor: '#e6f7ff' }}
                    />
                    <span className="text-sm text-gray-600">Vaccines in special situations</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-green-100 border-2 border-green-500 rounded flex items-center justify-center">
                      <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <span className="text-sm text-gray-600">Completed</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Profile Food Allergies Tab
function ProfileFoodAllergiesTab({ profileData, refreshProfile, isMemberView, queryClient }: any) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState({ foodItem: '', date: new Date().toISOString().split('T')[0] });
  const allergiesData = profileData?.foodAllergies || [];

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const handleUpdate = async (updateData: any) => {
    try {
      await axios.put(updateProfile, {
        id: profileData._id,
        ...updateData
      });
      
      // Invalidate queries to refresh data immediately without navigation
      if (isMemberView) {
        queryClient.invalidateQueries({ queryKey: ['getProfileById', profileData._id] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['getProfileByPhone', profileData.phoneNumber] });
        queryClient.invalidateQueries({ queryKey: ['getProfileByPhoneNumber'] });
        // Refresh auth context profile asynchronously without blocking or causing navigation
        if (refreshProfile) {
          // Use setTimeout and catch errors to prevent navigation issues
          setTimeout(() => {
            refreshProfile().catch((err: any) => {
              // Silently handle errors to prevent navigation
              console.error('Error refreshing profile context:', err);
            });
          }, 50);
        }
      }
      
      toast.success('Food allergies updated successfully!');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to update food allergies');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newEntry = {
      foodItem: formData.foodItem,
      updatedDate: new Date(formData.date),
    };

    if (editingIndex !== null) {
      const updated = [...allergiesData];
      updated[editingIndex] = newEntry;
      handleUpdate({ foodAllergies: updated });
      setEditingIndex(null);
    } else {
      handleUpdate({ foodAllergies: [...allergiesData, newEntry] });
    }
    setIsAdding(false);
    setFormData({ foodItem: '', date: new Date().toISOString().split('T')[0] });
  };

  const handleDelete = (index: number) => {
    if (confirm('Delete this allergy?')) {
      const updated = allergiesData.filter((_: any, i: number) => i !== index);
      handleUpdate({ foodAllergies: updated });
      toast.success('Allergy deleted successfully!');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-red-700">Food Allergies</h3>
        <button
          onClick={() => setIsAdding(true)}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          Add Allergy
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-red-50 rounded-lg p-4 border-2 border-red-200">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Food Item</label>
              <input
                type="text"
                required
                value={formData.foodItem}
                onChange={(e) => setFormData({ ...formData, foodItem: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="e.g., Peanuts, Dairy"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
              {editingIndex !== null ? 'Update' : 'Add'}
            </button>
            <button
              type="button"
              onClick={() => { setIsAdding(false); setEditingIndex(null); setFormData({ foodItem: '', date: new Date().toISOString().split('T')[0] }); }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {allergiesData.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allergiesData.map((entry: any, index: number) => {
            const foodItem = typeof entry === 'string' ? entry : (entry?.foodItem || entry);
            const updatedDate = typeof entry === 'object' && entry?.updatedDate ? entry.updatedDate : null;
            
            return (
              <div 
                key={index} 
                className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border-2 border-red-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <svg 
                        className="w-5 h-5 text-red-600" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                        />
                      </svg>
                      <p className="font-semibold text-red-800 text-lg">{foodItem}</p>
                    </div>
                    {updatedDate && (
                      <p className="text-sm text-gray-600 mt-1">
                        Recorded: {formatDate(updatedDate)}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setFormData({
                          foodItem: foodItem,
                          date: updatedDate || entry.date ? new Date(updatedDate || entry.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                        });
                        setEditingIndex(index);
                        setIsAdding(true);
                      }}
                      className="p-1 text-red-600 hover:bg-red-200 rounded"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(index)} className="p-1 text-red-600 hover:bg-red-200 rounded">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <svg 
            className="w-16 h-16 text-gray-400 mx-auto mb-4" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
            />
          </svg>
          <p className="text-gray-500 text-lg font-medium mb-2">No food allergies recorded</p>
          <p className="text-gray-400 text-sm mb-4">
            Click "Add Allergy" to start recording food allergies
          </p>
          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Add Food Allergy
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default Profile;
