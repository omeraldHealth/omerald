'use client';

import React, { useState, useMemo } from 'react';
import { useAuthContext } from '@/components/common/utils/context/auth.context';
import { useGetProfileByPhone, useGetMembersByIds } from '@/hooks/reactQuery/profile';
import { useGetManyReports } from '@/hooks/reactQuery/reports';
import ErrorBoundary from '@/components/common/utils/ErrorBoundary';
import { hasAnalyticsAccess, getSubscriptionPlan } from '@/lib/utils/subscription';
import { useSetRecoilState } from 'recoil';
import { dashTabs } from '@/components/common/recoil/dashboard';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function AnalyticsContent() {
  const { profile: authProfile } = useAuthContext();
  const [selectedMemberId, setSelectedMemberId] = useState<string>('self');
  const [isMobile, setIsMobile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setDash = useSetRecoilState(dashTabs);

  React.useEffect(() => {
    try {
      const checkMobile = () => {
        if (typeof window !== 'undefined') {
          setIsMobile(window.innerWidth < 640);
        }
      };
      checkMobile();
      if (typeof window !== 'undefined') {
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
      }
    } catch (err: any) {
      console.error('Error in mobile check:', err);
      setError('Failed to initialize analytics');
    }
  }, []);
  
  // Get current user's profile to access members list
  const currentUserProfileQuery = useGetProfileByPhone(authProfile?.phoneNumber);
  const currentUserProfile = currentUserProfileQuery.data || authProfile;
  
  // Check if user has analytics access
  const subscription = currentUserProfile?.subscription || 'Free';
  const hasAccess = hasAnalyticsAccess(subscription);
  
  // Show upgrade message for free users
  if (!hasAccess) {
    const currentPlan = getSubscriptionPlan(subscription);
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-center max-w-md mx-auto p-8 bg-white rounded-xl shadow-lg border border-gray-200">
          <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">Analytics Unlocked</h3>
          <p className="text-gray-600 mb-6">
            Advanced analytics is available for Premium and Enterprise subscribers. 
            Upgrade your plan to access detailed health insights, trends, and comprehensive analytics.
          </p>
          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Health trends and insights</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Comprehensive data visualization</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Advanced reporting features</span>
            </div>
          </div>
          <button
            onClick={() => setDash('Subscription')}
            className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-purple-700 transition-colors shadow-md hover:shadow-lg"
          >
            Upgrade to {currentPlan.tier === 'Free' ? 'Premium' : 'Enterprise'}
          </button>
          <p className="text-xs text-gray-500 mt-4">
            Current plan: {currentPlan.name}
          </p>
        </div>
      </div>
    );
  }

  // Get member IDs to fetch their profiles
  const memberIds = useMemo(() => {
    try {
      const ids: string[] = [];
      if (currentUserProfile?.members && Array.isArray(currentUserProfile.members)) {
        currentUserProfile.members.forEach((member: any) => {
          if (member && member.memberId) {
            ids.push(member.memberId);
          }
        });
      }
      return ids;
    } catch (err: any) {
      console.error('Error processing member IDs:', err);
      return [];
    }
  }, [currentUserProfile]);

  // Fetch member profiles to get their names
  const membersProfilesQuery = useGetMembersByIds(memberIds.length > 0 ? memberIds : undefined);
  const membersProfiles = Array.isArray(membersProfilesQuery.data) ? membersProfilesQuery.data : [];

  // Build members list for dropdown (Self + all members with relations)
  const membersList = useMemo(() => {
    try {
      const list: Array<{ id: string; phoneNumber: string; name: string; relation: string }> = [];
      
      // Add self
      if (currentUserProfile?._id && currentUserProfile?.phoneNumber) {
        list.push({
          id: 'self',
          phoneNumber: currentUserProfile.phoneNumber,
          name: `${currentUserProfile.firstName || ''} ${currentUserProfile.lastName || ''}`.trim() || 'Self',
          relation: 'Self',
        });
      }

      // Add all members with their names from fetched profiles
      if (currentUserProfile?.members && Array.isArray(currentUserProfile.members)) {
        if (membersProfiles.length > 0) {
          currentUserProfile.members.forEach((memberMeta: any) => {
            if (memberMeta && memberMeta.memberId && memberMeta.phoneNumber) {
              try {
                // Find the member's profile to get their name
                const memberProfile = membersProfiles.find((mp: any) => 
                  mp && String(mp._id) === String(memberMeta.memberId)
                );
                
                const memberName = memberProfile
                  ? `${memberProfile.firstName || ''} ${memberProfile.lastName || ''}`.trim() || memberMeta.phoneNumber
                  : memberMeta.phoneNumber;

                list.push({
                  id: memberMeta.memberId,
                  phoneNumber: memberMeta.phoneNumber,
                  name: memberName,
                  relation: memberMeta.relation || 'Member',
                });
              } catch (err: any) {
                console.error('Error processing member:', err);
              }
            }
          });
        } else {
          // Fallback: use phone number if profiles not loaded yet
          currentUserProfile.members.forEach((memberMeta: any) => {
            if (memberMeta && memberMeta.memberId && memberMeta.phoneNumber) {
              list.push({
                id: memberMeta.memberId,
                phoneNumber: memberMeta.phoneNumber,
                name: memberMeta.phoneNumber,
                relation: memberMeta.relation || 'Member',
              });
            }
          });
        }
      }

      return list;
    } catch (err: any) {
      console.error('Error building members list:', err);
      return [];
    }
  }, [currentUserProfile, membersProfiles]);

  // Get selected member's phone number
  const selectedMember = useMemo(() => {
    try {
      if (!Array.isArray(membersList) || membersList.length === 0) return null;
      return membersList.find(m => m && m.id === selectedMemberId) || membersList[0] || null;
    } catch (err: any) {
      console.error('Error getting selected member:', err);
      return null;
    }
  }, [membersList, selectedMemberId]);

  // Fetch profile data for selected member
  const profileQuery = useGetProfileByPhone(selectedMember?.phoneNumber);
  const profile = profileQuery.data;

  // Get reports for selected member only
  const reportsQuery = useGetManyReports(
    selectedMember?.phoneNumber ? [selectedMember.phoneNumber] : undefined
  );
  const reports = Array.isArray(reportsQuery.data) ? reportsQuery.data : [];

  // Calculate age from DOB
  const calculateAge = (dob: string | Date) => {
    try {
      if (!dob) return null;
      const birthDate = new Date(dob);
      if (isNaN(birthDate.getTime())) return null;
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age >= 0 ? age : null;
    } catch (err: any) {
      console.error('Error calculating age:', err);
      return null;
    }
  };

  const age = profile?.dob ? calculateAge(profile.dob) : null;

  // Update reports query to only fetch for selected member
  const selectedMemberReports = useMemo(() => {
    if (!selectedMember?.phoneNumber) return [];
    return reports.filter((r: any) => r.userId === selectedMember.phoneNumber);
  }, [reports, selectedMember]);

  // BMI Data Processing
  const bmiData = Array.isArray(profile?.bmi) ? profile.bmi : [];
  const bmiChartData = useMemo(() => {
    try {
      if (!Array.isArray(bmiData)) return { labels: [], values: [] };
      
      const sortedBmi = [...bmiData].sort((a: any, b: any) => {
        try {
          const dateA = a?.updatedDate ? new Date(a.updatedDate).getTime() : 0;
          const dateB = b?.updatedDate ? new Date(b.updatedDate).getTime() : 0;
          if (isNaN(dateA)) return 1;
          if (isNaN(dateB)) return -1;
          return dateA - dateB;
        } catch {
          return 0;
        }
      });
      
      const labels = sortedBmi.map((bmi: any, index: number) => {
        try {
          if (bmi?.updatedDate) {
            const date = new Date(bmi.updatedDate);
            if (!isNaN(date.getTime())) {
              return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            }
          }
          return `Entry ${index + 1}`;
        } catch {
          return `Entry ${index + 1}`;
        }
      });
      
      const values = sortedBmi.map((bmi: any) => {
        try {
          if (bmi?.bmi && typeof bmi.bmi === 'number' && !isNaN(bmi.bmi)) {
            return Number(bmi.bmi.toFixed(1));
          }
          if (bmi?.weight && bmi?.height && typeof bmi.weight === 'number' && typeof bmi.height === 'number') {
            const bmiValue = bmi.weight / Math.pow(bmi.height / 100, 2);
            if (!isNaN(bmiValue) && isFinite(bmiValue)) {
              return Number(bmiValue.toFixed(1));
            }
          }
          return null;
        } catch {
          return null;
        }
      }).filter((v: any) => v !== null && typeof v === 'number' && !isNaN(v));

      return { labels, values };
    } catch (err: any) {
      console.error('Error processing BMI data:', err);
      return { labels: [], values: [] };
    }
  }, [bmiData]);

  // Weight and Height Trends
  const weightHeightData = useMemo(() => {
    try {
      if (!Array.isArray(bmiData)) return { labels: [], weights: [], heights: [] };
      
      const sorted = [...bmiData].sort((a: any, b: any) => {
        try {
          const dateA = a?.updatedDate ? new Date(a.updatedDate).getTime() : 0;
          const dateB = b?.updatedDate ? new Date(b.updatedDate).getTime() : 0;
          if (isNaN(dateA)) return 1;
          if (isNaN(dateB)) return -1;
          return dateA - dateB;
        } catch {
          return 0;
        }
      });
      
      const labels = sorted.map((bmi: any, index: number) => {
        try {
          if (bmi?.updatedDate) {
            const date = new Date(bmi.updatedDate);
            if (!isNaN(date.getTime())) {
              return date.toLocaleDateString('en-US', { month: 'short' });
            }
          }
          return `Entry ${index + 1}`;
        } catch {
          return `Entry ${index + 1}`;
        }
      });
      
      return {
        labels,
        weights: sorted.map((bmi: any) => {
          const weight = bmi?.weight;
          return (typeof weight === 'number' && !isNaN(weight)) ? weight : null;
        }).filter((v: any) => v !== null),
        heights: sorted.map((bmi: any) => {
          const height = bmi?.height;
          return (typeof height === 'number' && !isNaN(height)) ? height : null;
        }).filter((v: any) => v !== null),
      };
    } catch (err: any) {
      console.error('Error processing weight/height data:', err);
      return { labels: [], weights: [], heights: [] };
    }
  }, [bmiData]);

  // Diagnosed Conditions Timeline
  const conditionsData = Array.isArray(profile?.diagnosedCondition) ? profile.diagnosedCondition : [];
  const conditionsByDate = useMemo(() => {
    try {
      if (!Array.isArray(conditionsData)) return { labels: [], values: [], timeline: [] };
      
      const sorted = [...conditionsData].sort((a: any, b: any) => {
        try {
          const dateA = a?.date ? new Date(a.date).getTime() : 0;
          const dateB = b?.date ? new Date(b.date).getTime() : 0;
          if (isNaN(dateA)) return 1;
          if (isNaN(dateB)) return -1;
          return dateA - dateB;
        } catch {
          return 0;
        }
      });
      
      const conditionCount: { [key: string]: number } = {};
      sorted.forEach((condition: any) => {
        try {
          if (condition) {
            const conditionName = condition.condition || 'Unknown';
            conditionCount[conditionName] = (conditionCount[conditionName] || 0) + 1;
          }
        } catch {
          // Skip invalid conditions
        }
      });
      
      return {
        labels: Object.keys(conditionCount),
        values: Object.values(conditionCount),
        timeline: sorted.map((c: any) => {
          try {
            return {
              condition: c?.condition || 'Unknown',
              date: c?.date ? (() => {
                const date = new Date(c.date);
                return !isNaN(date.getTime()) ? date.toLocaleDateString() : 'Unknown';
              })() : 'Unknown',
            };
          } catch {
            return { condition: 'Unknown', date: 'Unknown' };
          }
        }),
      };
    } catch (err: any) {
      console.error('Error processing conditions data:', err);
      return { labels: [], values: [], timeline: [] };
    }
  }, [conditionsData]);

  // Report Statistics - use selected member's reports only
  const reportStats = useMemo(() => {
    try {
      const memberReports = Array.isArray(selectedMemberReports) && selectedMemberReports.length > 0 
        ? selectedMemberReports 
        : (Array.isArray(reports) ? reports : []);
      
      const total = memberReports.length;
      const accepted = memberReports.filter((r: any) => r && r.status === 'accepted').length;
      const pending = memberReports.filter((r: any) => r && r.status === 'pending').length;
      const rejected = memberReports.filter((r: any) => r && r.status === 'rejected').length;

      // Reports by type
      const reportTypes: { [key: string]: number } = {};
      memberReports.forEach((r: any) => {
        try {
          if (!r) return;
          // Use report name if available, otherwise fall back to type/documentType
          let type = r.reportName || r.testName || r.name || r.type || r.documentType || 'Unknown';
          
          // Skip if it looks like an ID (long alphanumeric string like MongoDB ObjectId)
          if (type.length > 20 && /^[a-f0-9]{20,}$/i.test(type)) {
            // Try to get a better name from other fields
            type = r.category || r.reportCategory || 'Report';
          }
          
          // If still looks like an ID, use a generic name
          if (type.length > 20 && /^[a-f0-9]{20,}$/i.test(type)) {
            type = 'Report';
          }
          
          reportTypes[type] = (reportTypes[type] || 0) + 1;
        } catch {
          // Skip invalid reports
        }
      });

      // Reports by month
      const reportsByMonth: { [key: string]: number } = {};
      memberReports.forEach((r: any) => {
        try {
          if (!r) return;
          const date = r.reportDate || r.uploadDate || r.uploadedAt;
          if (date) {
            const dateObj = new Date(date);
            if (!isNaN(dateObj.getTime())) {
              const month = dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
              reportsByMonth[month] = (reportsByMonth[month] || 0) + 1;
            }
          }
        } catch {
          // Skip invalid dates
        }
      });

      return {
        total,
        accepted,
        pending,
        rejected,
        reportTypes,
        reportsByMonth,
      };
    } catch (err: any) {
      console.error('Error processing report stats:', err);
      return {
        total: 0,
        accepted: 0,
        pending: 0,
        rejected: 0,
        reportTypes: {},
        reportsByMonth: {},
      };
    }
  }, [selectedMemberReports, reports]);

  // Activities Timeline
  const activities = profile?.activities || [];
  const recentActivities = useMemo(() => {
    return [...activities]
      .sort((a: any, b: any) => 
        new Date(b.actionTime || 0).getTime() - new Date(a.actionTime || 0).getTime()
      )
      .slice(0, 10);
  }, [activities]);

  // Food Allergies
  const foodAllergies = profile?.foodAllergies || [];

  // Anthropometric Data
  const anthropometricData = profile?.anthopometric || [];
  const anthropometricChart = useMemo(() => {
    const sorted = [...anthropometricData].sort((a: any, b: any) => 
      new Date(a.updatedDate || 0).getTime() - new Date(b.updatedDate || 0).getTime()
    );
    
    return {
      labels: sorted.map((a: any, index: number) => {
        if (a.updatedDate) {
          return new Date(a.updatedDate).toLocaleDateString('en-US', { month: 'short' });
        }
        return `Entry ${index + 1}`;
      }),
      values: sorted.map((a: any) => a.anthopometric || null).filter((v: any) => v !== null),
    };
  }, [anthropometricData]);

  // MUAC Data
  const muacData = profile?.muac || [];
  const muacChart = useMemo(() => {
    const sorted = [...muacData].sort((a: any, b: any) => 
      new Date(a.updatedDate || 0).getTime() - new Date(b.updatedDate || 0).getTime()
    );
    
    return {
      labels: sorted.map((a: any, index: number) => {
        if (a.updatedDate) {
          return new Date(a.updatedDate).toLocaleDateString('en-US', { month: 'short' });
        }
        return `Entry ${index + 1}`;
      }),
      values: sorted.map((a: any) => a.height || null).filter((v: any) => v !== null),
    };
  }, [muacData]);

  // Health Topics
  const healthTopics = profile?.healthTopics || [];

  // Chart Configurations
  const bmiChartConfig = {
    labels: bmiChartData.labels.length > 0 ? bmiChartData.labels : ['No Data'],
    datasets: [
      {
        label: 'BMI',
        data: bmiChartData.values.length > 0 ? bmiChartData.values : [0],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Normal Range (18.5-24.9)',
        data: bmiChartData.labels.map(() => 18.5),
        borderColor: 'rgb(34, 197, 94)',
        borderDash: [5, 5],
        fill: false,
        pointRadius: 0,
      },
      {
        label: 'Normal Range Max',
        data: bmiChartData.labels.map(() => 24.9),
        borderColor: 'rgb(34, 197, 94)',
        borderDash: [5, 5],
        fill: false,
        pointRadius: 0,
      },
    ],
  };

  const reportStatusChart = {
    labels: ['Accepted', 'Pending', 'Rejected'],
    datasets: [
      {
        data: [reportStats.accepted, reportStats.pending, reportStats.rejected],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(251, 191, 36, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(251, 191, 36)',
          'rgb(239, 68, 68)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const reportTypesChart = {
    labels: Object.keys(reportStats.reportTypes),
    datasets: [
      {
        label: 'Reports by Type',
        data: Object.values(reportStats.reportTypes),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(168, 85, 247, 0.8)',
          'rgba(236, 72, 153, 0.8)',
          'rgba(251, 191, 36, 0.8)',
          'rgba(34, 197, 94, 0.8)',
        ],
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(168, 85, 247)',
          'rgb(236, 72, 153)',
          'rgb(251, 191, 36)',
          'rgb(34, 197, 94)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const reportsByMonthChart = {
    labels: Object.keys(reportStats.reportsByMonth),
    datasets: [
      {
        label: 'Reports Uploaded',
        data: Object.values(reportStats.reportsByMonth),
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 2,
      },
    ],
  };

  const conditionsChart = {
    labels: conditionsByDate.labels,
    datasets: [
      {
        label: 'Conditions',
        data: conditionsByDate.values,
        backgroundColor: 'rgba(239, 68, 68, 0.6)',
        borderColor: 'rgb(239, 68, 68)',
        borderWidth: 2,
      },
    ],
  };

  // Calculate Health Score
  const healthScore = useMemo(() => {
    let score = 0;
    const maxScore = 100;
    
    // Reports (40 points)
    if (reportStats.total > 0) {
      score += (reportStats.accepted / reportStats.total) * 40;
    }
    
    // BMI data (20 points)
    if (bmiChartData.values.length > 0) {
      const validBmiValues = bmiChartData.values.filter((v: number | null) => v !== null) as number[];
      if (validBmiValues.length > 0) {
        const avgBmi = validBmiValues.reduce((a: number, b: number) => a + b, 0) / validBmiValues.length;
        if (avgBmi >= 18.5 && avgBmi <= 24.9) {
          score += 20;
        } else if (avgBmi >= 17 && avgBmi <= 30) {
          score += 10;
        }
      }
    }
    
    // Conditions (20 points) - fewer conditions = better
    if (conditionsByDate.labels.length === 0) {
      score += 20;
    } else if (conditionsByDate.labels.length <= 2) {
      score += 10;
    }
    
    // Activity tracking (10 points)
    if (activities.length > 0) {
      score += 10;
    }
    
    // Food allergies awareness (10 points)
    if (foodAllergies.length > 0) {
      score += 10;
    }
    
    return Math.min(Math.round(score), maxScore);
  }, [reportStats, bmiChartData, conditionsByDate, activities, foodAllergies]);

  // Helper function to check if value is in range
  const isValueInRange = (value: string | number, normalRange: string): boolean => {
    if (!normalRange) return true;
    
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return true;
    
    // Parse range like "12-17.5" or "70-100"
    const rangeMatch = normalRange.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/);
    if (rangeMatch) {
      const min = parseFloat(rangeMatch[1]);
      const max = parseFloat(rangeMatch[2]);
      return numValue >= min && numValue <= max;
    }
    
    // Parse range like "> 12" or "< 100"
    const greaterThan = normalRange.match(/>\s*(\d+\.?\d*)/);
    if (greaterThan) {
      return numValue > parseFloat(greaterThan[1]);
    }
    
    const lessThan = normalRange.match(/<\s*(\d+\.?\d*)/);
    if (lessThan) {
      return numValue < parseFloat(lessThan[1]);
    }
    
    return true; // If can't parse, assume in range
  };

  // Extract all parameters from reports' parsedData
  const allReportParameters = useMemo(() => {
    const paramsMap: { [key: string]: Array<{ value: number; date: Date; unit?: string; normalRange?: string; isAbnormal?: boolean }> } = {};
    
    selectedMemberReports.forEach((report: any) => {
      if (report.parsedData && Array.isArray(report.parsedData)) {
        const reportDate = report.reportDate || report.uploadDate || new Date();
        
        report.parsedData.forEach((param: any) => {
          if (param.keyword && param.value) {
            const paramName = param.keyword.trim();
            const numValue = parseFloat(param.value);
            
            if (!isNaN(numValue)) {
              if (!paramsMap[paramName]) {
                paramsMap[paramName] = [];
              }
              
              const isAbnormal = param.normalRange 
                ? !isValueInRange(numValue, param.normalRange)
                : false;
              
              paramsMap[paramName].push({
                value: numValue,
                date: new Date(reportDate),
                unit: param.unit || '',
                normalRange: param.normalRange || '',
                isAbnormal,
              });
            }
          }
        });
      }
    });
    
    // Sort each parameter's values by date
    Object.keys(paramsMap).forEach(key => {
      paramsMap[key].sort((a, b) => a.date.getTime() - b.date.getTime());
    });
    
    return paramsMap;
  }, [selectedMemberReports]);

  // Get available parameters for dropdown
  const availableParameters = useMemo(() => {
    return Object.keys(allReportParameters).sort();
  }, [allReportParameters]);

  // State for selected parameter
  const [selectedParameter, setSelectedParameter] = useState<string>('');

  // Set default parameter when available or when member changes
  React.useEffect(() => {
    if (availableParameters.length > 0) {
      // Prefer common parameters, otherwise use first available
      const preferred = ['Hemoglobin', 'Sugar', 'Glucose', 'Creatinine', 'Platelets', 'BMI'];
      const preferredParam = preferred.find(p => availableParameters.includes(p));
      setSelectedParameter(preferredParam || availableParameters[0]);
    } else {
      setSelectedParameter('');
    }
  }, [availableParameters, selectedMemberId]); // Reset when member changes

  // Get parameter history data for selected parameter
  const parameterHistoryData = useMemo(() => {
    if (!selectedParameter || !allReportParameters[selectedParameter]) {
      return null;
    }
    
    const paramData = allReportParameters[selectedParameter];
    const labels = paramData.map(p => 
      new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    );
    const values = paramData.map(p => p.value);
    
    // Parse reference range from first entry
    let referenceMin: number | null = null;
    let referenceMax: number | null = null;
    if (paramData[0]?.normalRange) {
      const rangeMatch = paramData[0].normalRange.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/);
      if (rangeMatch) {
        referenceMin = parseFloat(rangeMatch[1]);
        referenceMax = parseFloat(rangeMatch[2]);
      }
    }
    
    return {
      labels,
      values,
      referenceMin,
      referenceMax,
      unit: paramData[0]?.unit || '',
      abnormalCount: paramData.filter(p => p.isAbnormal).length,
    };
  }, [selectedParameter, allReportParameters]);

  // Get focus areas from body impact analysis or diagnosed conditions
  const focusAreas = useMemo(() => {
    const areas: Array<{ name: string; severity: 'low' | 'medium' | 'high' }> = [];
    
    // First, try to get from body impact analysis
    if (profile?.bodyImpactAnalysis?.bodyParts && profile.bodyImpactAnalysis.bodyParts.length > 0) {
      profile.bodyImpactAnalysis.bodyParts.forEach((part: any) => {
        areas.push({
          name: part.partName || part.partId,
          severity: part.severity || 'medium',
        });
      });
    }
    
    // If no body impact analysis, derive from diagnosed conditions
    if (areas.length === 0 && conditionsData.length > 0) {
      const { BODY_PARTS } = require('@/lib/utils/bodyPartsMapping');
      const conditionText = conditionsData.map((c: any) => 
        typeof c === 'string' ? c.toLowerCase() : (c?.condition || '').toLowerCase()
      ).join(' ');
      
      BODY_PARTS.forEach((part: any) => {
        const matches = part.keywords.some((keyword: string) => 
          conditionText.includes(keyword.toLowerCase())
        );
        
        if (matches) {
          let severity: 'low' | 'medium' | 'high' = 'medium';
          if (conditionText.includes('tumor') || conditionText.includes('cancer') || conditionText.includes('fracture')) {
            severity = 'high';
          } else if (conditionText.includes('fever') || conditionText.includes('covid')) {
            severity = 'medium';
          } else {
            severity = 'low';
          }
          
          areas.push({
            name: part.name,
            severity,
          });
        }
      });
    }
    
    // Limit to top 3 by severity
    const severityOrder: { [key: string]: number } = { high: 3, medium: 2, low: 1 };
    return areas
      .sort((a, b) => severityOrder[b.severity] - severityOrder[a.severity])
      .slice(0, 3);
  }, [profile?.bodyImpactAnalysis, conditionsData]);

  // Calculate Report Trends from actual report data
  const reportTrends = useMemo(() => {
    const trends: Array<{ name: string; percentage: number; issues: number }> = [];
    
    // Common health parameters to track
    const parameterMap: { [key: string]: { name: string; normalRange?: [number, number] } } = {
      hemoglobin: { name: 'Hemoglobin', normalRange: [12, 17.5] },
      hb: { name: 'Hemoglobin', normalRange: [12, 17.5] },
      sugar: { name: 'Sugar', normalRange: [70, 100] },
      glucose: { name: 'Sugar', normalRange: [70, 100] },
      fbs: { name: 'Sugar', normalRange: [70, 100] },
      creatinine: { name: 'Creatinine', normalRange: [0.6, 1.2] },
      platelets: { name: 'Blood Platelets', normalRange: [150, 450] },
      platelet: { name: 'Blood Platelets', normalRange: [150, 450] },
    };

    const parameterData: { [key: string]: { values: number[]; issues: number } } = {};

    // Extract parameters from reports' parsedData
    selectedMemberReports.forEach((report: any) => {
      if (report.parsedData && Array.isArray(report.parsedData)) {
        report.parsedData.forEach((param: any) => {
          if (param.keyword && param.value) {
            const paramName = (param.keyword || '').toLowerCase();
            const value = parseFloat(param.value);
            
            if (!isNaN(value) && paramName) {
              // Find matching parameter
              for (const [key, config] of Object.entries(parameterMap)) {
                if (paramName.includes(key)) {
                  if (!parameterData[config.name]) {
                    parameterData[config.name] = { values: [], issues: 0 };
                  }
                  parameterData[config.name].values.push(value);
                  
                  // Check if value is outside normal range
                  if (param.normalRange) {
                    const isAbnormal = !isValueInRange(value, param.normalRange);
                    if (isAbnormal) {
                      parameterData[config.name].issues++;
                    }
                  } else if (config.normalRange) {
                    const [min, max] = config.normalRange;
                    if (value < min || value > max) {
                      parameterData[config.name].issues++;
                    }
                  }
                  break;
                }
              }
            }
          }
        });
      }
    });

    // Calculate percentages and create trends array
    Object.entries(parameterData).forEach(([name, data]) => {
      if (data.values.length > 0) {
        // Calculate percentage based on normal values
        const normalCount = data.values.length - data.issues;
        const percentage = Math.round((normalCount / data.values.length) * 100);
        trends.push({
          name,
          percentage,
          issues: data.issues,
        });
      }
    });

    // Sort by issues (most issues first) and limit to 4
    return trends.sort((a, b) => b.issues - a.issues).slice(0, 4);
  }, [selectedMemberReports]);

  // Calculate average BMI
  const avgBmi = useMemo(() => {
    if (bmiChartData.values.length === 0) return 0;
    const validValues = bmiChartData.values.filter((v: number | null) => v !== null) as number[];
    if (validValues.length === 0) return 0;
    return (validValues.reduce((a, b) => a + b, 0) / validValues.length).toFixed(1);
  }, [bmiChartData]);

  // Get shared count from member data
  const sharedCount = profile?.sharedWith?.length || 0;

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-gray-900 font-medium mb-2">Error loading analytics</p>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  if (profileQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (profileQuery.isError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-gray-900 font-medium mb-2">Failed to load profile data</p>
          <p className="text-sm text-gray-600 mb-4">Please try again later</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  if (!profile && selectedMember) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No profile data found for {selectedMember?.name || 'selected member'}</p>
        <p className="text-sm text-gray-500 mt-2">Please check the member and try again</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Member Selector */}
      {membersList.length > 1 && (
        <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">View Analytics for:</label>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
            >
              {membersList.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} ({member.relation})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Key Metrics Cards - Top Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Health Score Card */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl text-white shadow-lg">
          <div className="text-sm opacity-90 mb-1">Health Score</div>
          <div className="text-4xl font-bold">{healthScore}</div>
          <div className="text-sm opacity-75 mt-2">out of 100</div>
        </div>

        {/* Total Reports Card */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-md">
          <div className="text-sm text-gray-600 mb-1">Total Reports</div>
          <div className="text-3xl font-bold text-gray-900">{reportStats.total}</div>
          <div className="text-sm text-gray-500 mt-2">
            {reportStats.accepted} accepted, {reportStats.pending} pending
          </div>
        </div>

        {/* BMI Entries Card */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-md">
          <div className="text-sm text-gray-600 mb-1">BMI Entries</div>
          <div className="text-3xl font-bold text-gray-900">{bmiData.length}</div>
          {bmiChartData.values.length > 0 && (
            <div className="text-sm text-gray-500 mt-2">
              Avg: {avgBmi}
            </div>
          )}
        </div>

        {/* Health Conditions Card */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-md">
          <div className="text-sm text-gray-600 mb-1">Health Conditions</div>
          <div className="text-3xl font-bold text-gray-900">{conditionsByDate.labels.length}</div>
          <div className="text-sm text-gray-500 mt-2">Tracked conditions</div>
        </div>
      </div>

      {/* Stats Grid - Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Age Mapping Card */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Age Mapping</h3>
            <p className="text-xs text-gray-500">True vs Biological</p>
          </div>
          <div className="h-40">
            {bmiChartData.values.length > 0 && age !== null && age !== undefined ? (
              <ErrorBoundary fallback={
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                  Chart error
                </div>
              }>
                <Bar
                  data={{
                    labels: [profile?.firstName?.slice(0, 6) || 'User'],
                    datasets: [
                      {
                        label: 'True Age',
                        data: [age || 0],
                        backgroundColor: '#40189D',
                        borderRadius: 4,
                      },
                      {
                        label: 'Bio Age',
                        data: [(age || 0) - 2],
                        backgroundColor: '#FFB380',
                        borderRadius: 4,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      y: { beginAtZero: true, max: 100 },
                    },
                  }}
                />
              </ErrorBoundary>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                No data
              </div>
            )}
          </div>
        </div>

        {/* Focus Area Card */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Focus Areas</h3>
          {focusAreas.length > 0 ? (
            <div className="space-y-2">
              {focusAreas.map((area, index) => {
                const severityColors: { [key: string]: { bg: string; text: string } } = {
                  high: { bg: 'bg-red-100', text: 'text-red-800' },
                  medium: { bg: 'bg-orange-100', text: 'text-orange-800' },
                  low: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
                };
                const color = severityColors[area.severity] || severityColors.medium;
                
                return (
                  <div key={index} className={`${color.bg} ${color.text} px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-between`}>
                    <span>{area.name}</span>
                    <span className="text-xs opacity-75 capitalize">{area.severity}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-20 text-gray-400 text-sm">
              No focus areas identified
            </div>
          )}
        </div>

        {/* Reports Uploaded */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Reports Uploaded</h3>
          <div className="text-4xl font-bold text-gray-900 mb-4">{reportStats.total}</div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div>
              <div className="text-green-600 text-sm font-semibold">+24%</div>
              <div className="text-xs text-gray-500">than last month</div>
            </div>
          </div>
        </div>

        {/* Reports Shared */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Reports Shared to</h3>
          <div className="text-4xl font-bold text-gray-900 mb-4">{sharedCount}</div>
          <div className="flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Diagnosed Conditions */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Diagnosed Conditions</h3>
          <div className="text-4xl font-bold text-gray-900 mb-4">{conditionsByDate.labels.length}</div>
          <div className="flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid - Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Applicable Blogs */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Applicable Blogs</h3>
          <div className="text-4xl font-bold text-gray-900 mb-4">{healthTopics.length || 24}</div>
          <div className="flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
              </svg>
            </div>
          </div>
        </div>

        {/* Critical Parameters */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Critical Parameters</h3>
          <div className="text-4xl font-bold text-gray-900 mb-4">{Math.min(bmiData.length, 3)}</div>
          <div className="flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Biological Age */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Biological Age</h3>
          <div className="text-4xl font-bold text-gray-900 mb-4">Good</div>
          <div className="flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Section - Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reports/Month */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Reports/Month</h3>
          </div>
          {Object.keys(reportStats.reportsByMonth).length > 0 ? (
            <div className="h-64">
              <Bar
                data={reportsByMonthChart}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (context: any) => {
                          const count = context.parsed.y;
                          return `${count} ${count === 1 ? 'report' : 'reports'}`;
                        },
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
                      title: {
                        display: true,
                        text: 'Number of Reports',
                      },
                    },
                    x: {
                      title: {
                        display: true,
                        text: 'Month',
                      },
                    },
                  },
                }}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">
              No reports data available
            </div>
          )}
        </div>

        {/* Reports Category */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Reports Category</h3>
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-8">
            {/* Category List */}
            <div className="flex-1 space-y-4">
              {Object.entries(reportStats.reportTypes).slice(0, 2).map(([type, count], index) => (
                <div key={type} className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full ${index === 0 ? 'bg-[#40189D]' : 'bg-orange-400'}`}></div>
                  <div>
                    <div className="font-semibold text-gray-900">{type}</div>
                    <div className="text-sm text-gray-500">{count} Reports</div>
                  </div>
                </div>
              ))}
            </div>
            {/* Donut Chart */}
            <div className="w-48 h-48">
              {reportStats.total > 0 ? (
                <Doughnut
                  data={{
                    labels: Object.keys(reportStats.reportTypes),
                    datasets: [
                      {
                        data: Object.values(reportStats.reportTypes),
                        backgroundColor: ['#40189D', '#FFB380', '#A8D96D'],
                        borderWidth: 0,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: true,
                    cutout: '70%',
                    plugins: {
                      legend: { display: false },
                      tooltip: { enabled: true },
                    },
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">No reports</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Report Trends */}
      {reportTrends.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Report Trends</h3>
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {reportTrends.map((trend, index) => {
              // Calculate stroke dash offset for circular progress
              // circumference = 2 * π * radius (radius = 40)
              const circumference = 2 * Math.PI * 40; // ≈ 251.33
              const offset = circumference - (trend.percentage / 100) * circumference;
              
              return (
                <div key={index} className="text-center">
                  <div className="relative inline-block mb-3">
                    <svg className="w-32 h-32" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#E5E7EB" strokeWidth="8" />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="#40189D"
                        strokeWidth="8"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        transform="rotate(-90 50 50)"
                      />
                      <text x="50" y="55" textAnchor="middle" fontSize="20" fontWeight="bold" fill="#1F2937">
                        {trend.percentage}%
                      </text>
                    </svg>
                  </div>
                  <div className="font-semibold text-gray-900">{trend.name}</div>
                  <div className="text-sm text-gray-500">
                    {trend.issues} {trend.issues === 1 ? 'Issue' : 'Issues'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Analytics() {
  return (
    <ErrorBoundary>
      <AnalyticsContent />
    </ErrorBoundary>
  );
}
