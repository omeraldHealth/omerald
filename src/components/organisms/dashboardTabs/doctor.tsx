'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuthContext } from '@/components/common/utils/context/auth.context';
import { useGetPendingSharedMembers, useGetMembersByIds } from '@/hooks/reactQuery/profile';
import { useGetPendingSharedReports, useGetManyReports, useGetSharedReports, useGetReportsFromDC } from '@/hooks/reactQuery/reports';
import MemberCard from '@/components/molecules/MemberCard';
import { useSetRecoilState } from 'recoil';
import { dashTabs } from '@/components/common/recoil/dashboard';
import { UserIcon, DocumentTextIcon, ClockIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import moment from 'moment';
import ViewReportModal from '@/components/molecules/ViewReportModal';
import axios from 'axios';
import { insertReport, updateReport } from '@/components/common/lib/constants/urls';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useAcceptSharedReport } from '@/hooks/reactQuery/reports';
import { getDiagnosticCenterNames, getBranchNames } from '@/services/diagnosticCenterService';

type TabType = 'members' | 'reports';

export default function Doctor() {
  const { profile, phoneNumber } = useAuthContext();
  const [activeTab, setActiveTab] = useState<TabType>('members');
  const setDash = useSetRecoilState(dashTabs);

  const tabs = [
    { id: 'members' as TabType, label: 'Members', icon: UserIcon },
    { id: 'reports' as TabType, label: 'Reports', icon: DocumentTextIcon },
  ];

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="flex space-x-1 p-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200
                    ${
                      activeTab === tab.id
                        ? 'bg-white text-[#40189D] shadow-sm border border-gray-200'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-6">
          {activeTab === 'members' && <DoctorMembersTab />}
          {activeTab === 'reports' && <DoctorReportsTab />}
        </div>
      </div>
    </div>
  );
}

function DoctorMembersTab() {
  const { phoneNumber, profile } = useAuthContext();
  const setDash = useSetRecoilState(dashTabs);
  const queryClient = useQueryClient();

  // Fetch pending shared members
  const { data: pendingMembersData, isLoading: isLoadingPending } = useGetPendingSharedMembers(
    phoneNumber || undefined
  );
  const pendingMembers = pendingMembersData?.all || [];

  // Fetch accepted shared members from profile
  const acceptedMemberIds = useMemo(() => {
    if (!profile?.sharedMembers) return [];
    return profile.sharedMembers
      .filter((sm: any) => sm.status === 'accepted')
      .map((sm: any) => sm.memberId)
      .filter(Boolean);
  }, [profile]);

  const acceptedMemberProfiles = useGetMembersByIds(
    acceptedMemberIds.length > 0 ? acceptedMemberIds : undefined
  );

  // Combine pending and accepted members
  const allMembers = useMemo(() => {
    const members: any[] = [];
    
    // Add pending members
    pendingMembers.forEach((pm: any) => {
      if (pm.member) {
        members.push({
          ...pm.member,
          isPending: true,
          shareInfo: pm,
        });
      }
    });

    // Add accepted members
    if (acceptedMemberProfiles.data) {
      acceptedMemberProfiles.data.forEach((member: any) => {
        // Check if not already added as pending
        const isAlreadyAdded = members.some(
          (m) => m._id?.toString() === member._id?.toString()
        );
        if (!isAlreadyAdded) {
          members.push({
            ...member,
            isPending: false,
          });
        }
      });
    }

    return members;
  }, [pendingMembers, acceptedMemberProfiles.data]);

  if (isLoadingPending || acceptedMemberProfiles.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-700"></div>
      </div>
    );
  }

  if (allMembers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <UserIcon className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-base text-gray-500 font-medium">No Members Shared With You</p>
        <p className="text-sm text-gray-400 mt-1">
          Members shared with you will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Members Shared With You ({allMembers.length})
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {allMembers.map((member: any) => (
          <div key={member._id || member.memberId} className="relative">
            {member.isPending && (
              <div className="absolute top-2 right-2 z-10">
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full border border-yellow-200">
                  <ClockIcon className="w-3 h-3" />
                  Pending
                </span>
              </div>
            )}
            <MemberCard
              member={member}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function DoctorReportsTab() {
  const { phoneNumber, profile } = useAuthContext();
  const queryClient = useQueryClient();
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Cache for DC and branch names (like dashboard)
  const [dcNamesMap, setDcNamesMap] = useState<Map<string, string>>(new Map());
  const [branchNamesMap, setBranchNamesMap] = useState<Map<string, string>>(new Map());

  // Fetch pending shared reports from omerald users
  const { data: pendingSharedReports, isLoading: isLoadingPending } = useGetPendingSharedReports(
    phoneNumber || undefined
  );

  // Fetch pending shared reports from DC app (old endpoint)
  const { data: sharedReportsDataPending, isLoading: isLoadingSharedPending } = useGetSharedReports(
    phoneNumber || undefined,
    'pending'
  );

  // Fetch accepted shared reports from DC app (old endpoint) - for approved DC reports
  const { data: sharedReportsDataAccepted, isLoading: isLoadingSharedAccepted } = useGetSharedReports(
    phoneNumber || undefined,
    'accepted'
  );

  // Fetch reports from new DC app endpoint (includes both pending and approved)
  const { data: dcReportsData, isLoading: isLoadingDCReports } = useGetReportsFromDC(
    phoneNumber || undefined
  );


  // Fetch DC and branch names for new DC reports (like dashboard)
  useEffect(() => {
    if (!dcReportsData?.reports || dcReportsData.reports.length === 0) return;

    const fetchNames = async () => {
      const dcIds = new Set<string>();
      const branchIds = new Set<string>();

      dcReportsData.reports.forEach((report: any) => {
        if (report.diagnosticCenter?.diagnostic) {
          const diagnostic = report.diagnosticCenter.diagnostic;
          const dcId = typeof diagnostic === 'string' 
            ? diagnostic 
            : (diagnostic as any)?.id || String(diagnostic);
          if (dcId) dcIds.add(String(dcId));
        }
        if (report.diagnosticCenter?.branch) {
          const branch = report.diagnosticCenter.branch;
          const branchId = typeof branch === 'string' 
            ? branch 
            : (branch as any)?.id || String(branch);
          if (branchId) branchIds.add(String(branchId));
        }
      });

      const [dcNames, branchNames] = await Promise.all([
        getDiagnosticCenterNames(Array.from(dcIds)),
        getBranchNames(Array.from(branchIds)),
      ]);

      setDcNamesMap(dcNames);
      setBranchNamesMap(branchNames);
    };

    fetchNames();
  }, [dcReportsData]);

  // Fetch accepted shared reports - get all reports where user's phone is in sharedWith
  // For accepted reports, we check reports that belong to the user (userId === phoneNumber)
  // These are reports that were shared with the user and they accepted
  const users: string[] = [];
  if (phoneNumber) {
    users.push(phoneNumber);
  }
  const { data: userReports = [] } = useGetManyReports(users.length > 0 ? users : undefined);
  
  const acceptedSharedReports = useMemo(() => {
    if (!phoneNumber || !userReports) return [];
    
    // These are reports that belong to the user, which means they were accepted
    // We can identify shared reports by checking if they have a specific pattern in reportId
    // or by checking if they have sharedWith info in metadata
    // For now, we'll show all user reports as they could be shared reports that were accepted
    // In a more sophisticated implementation, you'd track which reports were originally shared
    return userReports.filter((report: any) => {
      // Filter to show reports that might have been shared (have sharedWith or specific reportId pattern)
      // Or show all reports for simplicity - user can see all their accepted reports
      return true;
    });
  }, [userReports, phoneNumber]);

  // Transform omerald user shared reports
  const omeraldPendingReports = useMemo(() => {
    if (!pendingSharedReports || !Array.isArray(pendingSharedReports)) return [];
    return pendingSharedReports
      .filter((report: any) => {
        const reportId = report.reportId || report._id?.toString() || report.id;
        return reportId;
      })
      .map((report: any) => ({
      ...report,
      _id: report._id || report.reportId || report.id,
      id: report.id || report.reportId || report._id?.toString(),
      name: report.name || report.testName || 'Report',
      testName: report.testName || report.name || 'Report',
      type: report.type || report.documentType || 'Report',
      documentType: report.documentType || report.type || 'Report',
      diagnosticCenter: report.diagnosticCenter || 'Unknown',
      createdBy: report.sharedBy || report.userName || report.createdBy || 'Unknown',
      uploadDate: report.sharedAt || report.uploadDate || report.uploadedAt || new Date().toISOString(),
      reportDate: report.reportDate || report.uploadDate || report.uploadedAt,
      status: 'pending',
      reportUrl: report.reportUrl || report.reportDoc || '',
      reportDoc: report.reportDoc || report.reportUrl || '',
      isOmeraldSharedReport: true,
      isSharedReport: true,
      isPending: true,
    }));
  }, [pendingSharedReports]);

  // Transform DC shared reports (pending) from old endpoint
  const dcPendingReportsOld = useMemo(() => {
    // Handle both 'reports' and 'data' properties for backward compatibility
    const reportsArray = (sharedReportsDataPending as any)?.data || [];
    if (!reportsArray || reportsArray.length === 0) return [];
    
    // Normalize phone number for comparison
    const normalizePhone = (phone: string) => {
      if (!phone) return '';
      return phone.replace(/\s/g, '').startsWith('+') ? phone.replace(/\s/g, '') : `+${phone.replace(/\s/g, '')}`;
    };
    const normalizedUserPhone = phoneNumber ? normalizePhone(phoneNumber) : '';
    
    // Filter out rejected reports and filter by sharedReportDetails
    // ONLY include reports where accepted === false (explicitly pending)
    return reportsArray
      .filter((dcReport: any) => {
        // If report has sharedReportDetails array, filter based on it
        if (dcReport.sharedReportDetails && Array.isArray(dcReport.sharedReportDetails)) {
          const matchingDetail = dcReport.sharedReportDetails.find((detail: any) => {
            const normalizedDetailPhone = normalizePhone(detail.userContact || '');
            return normalizedDetailPhone === normalizedUserPhone 
              && detail.accepted === false  // Explicitly false (pending)
              && detail.rejected !== true;
          });

          return !!matchingDetail;
        }
    
        return false;
      })
      .map((dcReport: any) => {
        // Find the matching shareDetail from sharedReportDetails array
        const matchingDetail = dcReport.sharedReportDetails?.find((detail: any) => {
          const normalizedDetailPhone = normalizePhone(detail.userContact || '');
          return normalizedDetailPhone === normalizedUserPhone && 
                 detail.accepted === false && 
                 detail.rejected !== false;
        });
        
        const shareDetail = matchingDetail || dcReport.shareDetail;
        const diagnostic = dcReport.diagnosticCenter?.diagnostic;
        const branch = dcReport.diagnosticCenter?.branch;
        
        return {
          ...dcReport,
          _id: dcReport.id,
          id: dcReport.id,
          name: dcReport.reportData?.reportName || 'Report',
          testName: dcReport.reportData?.reportName || 'Report',
          diagnosticCenter: typeof diagnostic === 'object' && diagnostic?.name 
            ? diagnostic.name 
            : (typeof diagnostic === 'string' ? dcNamesMap.get(diagnostic) || 'Diagnostic Center' : 'Diagnostic Center'),
          branch: typeof branch === 'object' && branch?.name 
            ? branch.name 
            : (typeof branch === 'string' ? branchNamesMap.get(branch) || '' : ''),
          // Store IDs for DiagnosticReport component
          diagnosticCenterId: typeof diagnostic === 'string' 
            ? diagnostic 
            : (diagnostic as any)?.id,
          branchId: typeof branch === 'string' 
            ? branch 
            : (branch as any)?.id,
          createdBy: dcReport.pathologist?.name || (typeof diagnostic === 'object' && diagnostic?.name ? diagnostic.name : 'Unknown'),
          uploadDate: shareDetail?.sharedAt || dcReport.shareDetail?.sharedAt,
          reportDate: dcReport.reportData?.reportDate,
          status: 'pending', // Always pending for this list
          reportUrl: dcReport.reportData?.url || dcReport.reportData?.pdfUrl || dcReport.reportData?.imageUrl || dcReport.reportData?.parsedData?.components?.[0]?.images?.[0],
          reportDoc: dcReport.reportData?.url || dcReport.reportData?.pdfUrl || dcReport.reportData?.imageUrl,
          fileType: dcReport.reportData?.fileType,
          parsedData: dcReport.reportData?.parsedData,
          isDCReport: true,
          shareDetail: shareDetail || dcReport.shareDetail,
          sharedReportDetails: dcReport.sharedReportDetails,
          patient: dcReport.patient,
          userName: dcReport.patient?.name || 'Unknown',
          type: dcReport.reportData?.parsedData?.test?.testName || 'Diagnostic Report',
          documentType: dcReport.reportData?.parsedData?.test?.testName || 'Diagnostic Report',
          isPending: true, // Always true for this list
        };
      });
  }, [sharedReportsDataPending, phoneNumber, dcNamesMap, branchNamesMap]);

  // Process ALL new DC reports and categorize by accepted status
  // This ensures each report only appears once (either pending or approved, not both)
  const processedNewDCReports = useMemo(() => {
    if (!dcReportsData?.reports) return { pending: [], approved: [] };
    
    const normalizePhone = (phone: string) => {
      if (!phone) return '';
      return phone.replace(/\s/g, '').startsWith('+') ? phone.replace(/\s/g, '') : `+${phone.replace(/\s/g, '')}`;
    };
    const normalizedUserPhone = phoneNumber ? normalizePhone(phoneNumber) : '';
    
    const pending: any[] = [];
    const approved: any[] = [];
    
    dcReportsData.reports.forEach((dcReport: any) => {
      // Skip if no sharedReportDetails
      if (!dcReport.sharedReportDetails || !Array.isArray(dcReport.sharedReportDetails)) {
        return;
      }
      
      // Find the share detail for THIS user
      const userShareDetail = dcReport.sharedReportDetails.find(
        (detail: any) => {
          const normalizedDetailPhone = normalizePhone(detail.userContact || '');
          return normalizedDetailPhone === normalizedUserPhone;
        }
      );
      
      // Skip if no share detail found for this user or if rejected
      if (!userShareDetail || userShareDetail.rejected === true) {
        return;
      }
      
      // Process the report once
      const testName = typeof dcReport.reportData?.parsedData?.test === 'object' 
        ? dcReport.reportData.parsedData.test.testName 
        : (typeof dcReport.reportData?.parsedData?.test === 'string' 
          ? dcReport.reportData.parsedData.test 
          : 'Diagnostic Report');
      
      let diagnosticCenterName = 'Diagnostic Center';
      let branchName = '';
      const diagnostic = dcReport.diagnosticCenter?.diagnostic;
      const branch = dcReport.diagnosticCenter?.branch;
      
      if (diagnostic) {
        if (typeof diagnostic === 'object' && diagnostic !== null && 'name' in diagnostic) {
          diagnosticCenterName = (diagnostic as any).name;
        } else if (typeof diagnostic === 'string') {
          diagnosticCenterName = dcNamesMap.get(diagnostic) || 'Diagnostic Center';
        }
      }
      
      if (branch) {
        if (typeof branch === 'object' && branch !== null && 'name' in branch) {
          branchName = (branch as any).name;
        } else if (typeof branch === 'string') {
          branchName = branchNamesMap.get(branch) || '';
        }
      }
      
      const processedReport = {
        ...dcReport,
        _id: dcReport.id,
        id: dcReport.id,
        name: dcReport.reportData?.reportName || 'Report',
        testName: dcReport.reportData?.reportName || 'Report',
        diagnosticCenter: diagnosticCenterName,
        branch: branchName,
        diagnosticCenterId: typeof diagnostic === 'string' 
          ? diagnostic 
          : (diagnostic as any)?.id,
        branchId: typeof branch === 'string' 
          ? branch 
          : (branch as any)?.id,
        createdBy: dcReport.pathologist?.name || diagnosticCenterName,
        uploadDate: userShareDetail?.sharedAt || dcReport.reportData?.reportDate || new Date().toISOString(),
        reportDate: dcReport.reportData?.reportDate,
        reportUrl: dcReport.reportData?.url || dcReport.reportData?.pdfUrl || dcReport.reportData?.imageUrl || '',
        reportDoc: dcReport.reportData?.url || dcReport.reportData?.pdfUrl || dcReport.reportData?.imageUrl || '',
        fileType: dcReport.reportData?.fileType || (dcReport.reportData?.pdfUrl ? 'pdf' : 'image'),
        parsedData: dcReport.reportData?.parsedData,
        isDCReport: true,
        isNewDCReport: true,
        shareDetail: userShareDetail,
        sharedReportDetails: dcReport.sharedReportDetails,
        patient: dcReport.patient,
        userName: dcReport.patient?.name || phoneNumber || 'User',
        type: testName,
        documentType: testName,
      };
      
      // Categorize based on accepted status - EXCLUSIVE check
      if (userShareDetail.accepted === true) {
        // APPROVED - accepted is explicitly true
        approved.push({
          ...processedReport,
          status: 'accepted',
          isPending: false,
        });
      } else if (userShareDetail.accepted === false) {
        // PENDING - accepted is explicitly false
        pending.push({
          ...processedReport,
          status: 'pending',
          isPending: true,
        });
      }
      // If accepted is undefined/null, skip it (shouldn't happen, but safety check)
    });
    
    return { pending, approved };
  }, [dcReportsData, phoneNumber, dcNamesMap, branchNamesMap]);

  const newDCPendingReports = processedNewDCReports.pending;
  const dcApprovedReportsNew = processedNewDCReports.approved;

  // Transform DC shared reports (accepted) from old endpoint - for approved DC reports
  // ONLY include reports where accepted === true (explicitly approved)
  const dcApprovedReportsOld = useMemo(() => {
    const reportsArray = (sharedReportsDataAccepted as any)?.data || [];
    if (!reportsArray || reportsArray.length === 0) return [];
    
    const normalizePhone = (phone: string) => {
      if (!phone) return '';
      return phone.replace(/\s/g, '').startsWith('+') ? phone.replace(/\s/g, '') : `+${phone.replace(/\s/g, '')}`;
    };
    const normalizedUserPhone = phoneNumber ? normalizePhone(phoneNumber) : '';
    
    return reportsArray
      .filter((dcReport: any) => {
        if (dcReport.sharedReportDetails && Array.isArray(dcReport.sharedReportDetails)) {
          const matchingDetail = dcReport.sharedReportDetails.find((detail: any) => {
            const normalizedDetailPhone = normalizePhone(detail.userContact || '');
            return normalizedDetailPhone === normalizedUserPhone 
              && detail.accepted === true  // Explicitly true (approved)
              && detail.rejected !== true;
          });
          return !!matchingDetail;
        }
        if (dcReport.shareDetail && dcReport.shareDetail.accepted === true && dcReport.shareDetail.rejected !== true) {
          return true;
        }
        return false;
      })
      .map((dcReport: any) => {
        let shareDetail = dcReport.shareDetail;
        if (dcReport.sharedReportDetails && Array.isArray(dcReport.sharedReportDetails)) {
          const matchingDetail = dcReport.sharedReportDetails.find((detail: any) => {
            const normalizedDetailPhone = normalizePhone(detail.userContact || '');
            return normalizedDetailPhone === normalizedUserPhone && detail.accepted === true;
          });
          if (matchingDetail) {
            shareDetail = matchingDetail;
          }
        }
        
        const diagnostic = dcReport.diagnosticCenter?.diagnostic;
        const branch = dcReport.diagnosticCenter?.branch;
        
        return {
          ...dcReport,
          _id: dcReport.id,
          id: dcReport.id,
          name: dcReport.reportData?.reportName || 'Report',
          testName: dcReport.reportData?.reportName || 'Report',
          diagnosticCenter: typeof diagnostic === 'object' && diagnostic?.name 
            ? diagnostic.name 
            : (typeof diagnostic === 'string' ? dcNamesMap.get(diagnostic) || 'Diagnostic Center' : 'Diagnostic Center'),
          branch: typeof branch === 'object' && branch?.name 
            ? branch.name 
            : (typeof branch === 'string' ? branchNamesMap.get(branch) || '' : ''),
          diagnosticCenterId: typeof diagnostic === 'string' 
            ? diagnostic 
            : (diagnostic as any)?.id,
          branchId: typeof branch === 'string' 
            ? branch 
            : (branch as any)?.id,
          createdBy: dcReport.pathologist?.name || 'Diagnostic Center',
          uploadDate: shareDetail?.sharedAt || dcReport.shareDetail?.sharedAt,
          reportDate: dcReport.reportData?.reportDate,
          status: 'accepted', // Always accepted for this list
          reportUrl: dcReport.reportData?.url || dcReport.reportData?.pdfUrl || dcReport.reportData?.imageUrl || dcReport.reportData?.parsedData?.components?.[0]?.images?.[0],
          reportDoc: dcReport.reportData?.url || dcReport.reportData?.pdfUrl || dcReport.reportData?.imageUrl,
          fileType: dcReport.reportData?.fileType,
          parsedData: dcReport.reportData?.parsedData,
          isDCReport: true,
          isDCShared: true,
          shareDetail: shareDetail || dcReport.shareDetail,
          sharedReportDetails: dcReport.sharedReportDetails,
          patient: dcReport.patient,
          userName: dcReport.patient?.name || 'Unknown',
          type: dcReport.reportData?.parsedData?.test?.testName || 'Diagnostic Report',
          documentType: dcReport.reportData?.parsedData?.test?.testName || 'Diagnostic Report',
          sharedWith: [],
          isPending: false, // Always false for this list
        };
      });
  }, [sharedReportsDataAccepted, phoneNumber, dcNamesMap, branchNamesMap]);


  // Merge all reports with deduplication
  // Use a Map to track unique reports by ID, prioritizing newer endpoint data
  const reportsMap = useMemo(() => {
    const map = new Map<string, any>();

    // Helper function to get unique report ID
    const getReportId = (report: any): string => {
      return report.id || report._id || report.reportId || `${report.userId}-${report.reportUrl}-${report.reportDate}`;
    };

    // Helper function to normalize phone for comparison
    const normalizePhone = (phone: string) => {
      if (!phone) return '';
      return phone.replace(/\s/g, '').startsWith('+') ? phone.replace(/\s/g, '') : `+${phone.replace(/\s/g, '')}`;
    };

    // Helper function to check if two reports are duplicates
    const isDuplicate = (report1: any, report2: any): boolean => {
      const id1 = getReportId(report1);
      const id2 = getReportId(report2);
      
      // Same ID means duplicate
      if (id1 && id2 && id1 === id2) return true;
      
      // For DC reports, check if they have the same DC report ID
      if (report1.isDCReport && report2.isDCReport) {
        const dcId1 = report1.id || report1._id || report1.reportId;
        const dcId2 = report2.id || report2._id || report2.reportId;
        if (dcId1 && dcId2 && dcId1 === dcId2) {
          // Same DC report ID means duplicate (regardless of share detail)
          return true;
        }
      }
      
      // Check if report2 is an accepted version of report1 (has originalReportId matching report1's ID)
      if (report2.originalReportId) {
        const originalId1 = report1.id || report1._id || report1.reportId;
        if (originalId1 && report2.originalReportId === originalId1) {
          return true;
        }
      }
      
      // Check if report1 is an accepted version of report2
      if (report1.originalReportId) {
        const originalId2 = report2.id || report2._id || report2.reportId;
        if (originalId2 && report1.originalReportId === originalId2) {
          return true;
        }
      }
      
      // For reports with same reportUrl and reportDate, they might be duplicates
      if (report1.reportUrl && report2.reportUrl && report1.reportUrl === report2.reportUrl) {
        const date1 = report1.reportDate || report1.uploadDate;
        const date2 = report2.reportDate || report2.uploadDate;
        if (date1 && date2 && new Date(date1).getTime() === new Date(date2).getTime()) {
          // Same URL and date - likely duplicate
          return true;
        }
      }
      
      return false;
    };

    // Add reports to map with deduplication
    const addReport = (report: any, priority: number = 0) => {
      const reportId = getReportId(report);
      
      // Check if report already exists
      const existingReport = map.get(reportId);
      if (existingReport) {
        // If new report has higher priority (lower number = higher priority), replace it
        const existingPriority = existingReport._mergePriority || 999;
        if (priority < existingPriority) {
          map.set(reportId, { ...report, _mergePriority: priority });
        }
      } else {
        // Check for duplicates by comparing with all existing reports
        let isDuplicateReport = false;
        for (const [id, existingReport] of map.entries()) {
          if (isDuplicate(report, existingReport)) {
            isDuplicateReport = true;
            // If new report has higher priority, replace the duplicate
            const existingPriority = existingReport._mergePriority || 999;
            if (priority < existingPriority) {
              map.delete(id);
              map.set(reportId, { ...report, _mergePriority: priority });
            }
            break;
          }
        }
        
        if (!isDuplicateReport) {
          map.set(reportId, { ...report, _mergePriority: priority });
        }
      }
    };

    // Priority order (lower number = higher priority):
    // 1. New DC reports (highest priority - most up-to-date)
    // 2. Old DC reports
    // 3. Omerald shared reports
    // 4. Accepted shared reports from user's own reports

    // Add new DC pending reports (priority 1)
    newDCPendingReports.forEach((report: any) => addReport(report, 1));
    
    // Add new DC approved reports (priority 1)
    dcApprovedReportsNew.forEach((report: any) => addReport(report, 1));
    
    // Add old DC pending reports (priority 2) - only if not already added
    dcPendingReportsOld.forEach((report: any) => addReport(report, 2));
    
    // Add old DC approved reports (priority 2) - only if not already added
    dcApprovedReportsOld.forEach((report: any) => addReport(report, 2));
    
    // Add Omerald pending reports (priority 3)
    omeraldPendingReports.forEach((report: any) => addReport(report, 3));
    
    // Add accepted shared reports from user's own reports (priority 4)
    acceptedSharedReports.forEach((report: any) => {
      addReport({ ...report, isPending: false }, 4);
    });

    return map;
  }, [
    newDCPendingReports,
    dcApprovedReportsNew,
    dcPendingReportsOld,
    dcApprovedReportsOld,
    omeraldPendingReports,
    acceptedSharedReports,
  ]);

  // Convert map to array and remove merge priority metadata
  const allSharedReports = useMemo(() => {
    return Array.from(reportsMap.values()).map((report: any) => {
      const { _mergePriority, ...cleanReport } = report;
      return cleanReport;
    });
  }, [reportsMap]);

  // Determine if report is from DC (doctor) or user
  const getIsDCReport = (report: any) => {
    return report?.isDCReport || report?.shareDetail || false;
  };

  // Helper function to normalize phone for comparison
  const normalizePhone = useCallback((phone: string) => {
    if (!phone) return '';
    return phone.replace(/\s/g, '').startsWith('+') ? phone.replace(/\s/g, '') : `+${phone.replace(/\s/g, '')}`;
  }, []);

  // Helper function to get accepted status for current user
  // Returns: true = approved, false = pending, null = unknown
  const getAcceptedStatus = useCallback((report: any): boolean | null => {
    if (!phoneNumber) return null;
    
    const normalizedUserPhone = normalizePhone(phoneNumber);
    
    // Check sharedReportDetails array first (for DC reports)
    if (report.sharedReportDetails && Array.isArray(report.sharedReportDetails)) {
      const userDetail = report.sharedReportDetails.find((detail: any) => {
        const normalizedDetailPhone = normalizePhone(detail.userContact || '');
        return normalizedDetailPhone === normalizedUserPhone && detail.rejected !== true;
      });
      
      if (userDetail !== undefined) {
        // Return the accepted status (true/false)
        return userDetail.accepted === true;
      }
    }
    
    // Check shareDetail (fallback for old format)
    if (report.shareDetail) {
      const normalizedSharePhone = normalizePhone(report.shareDetail.userContact || '');
      if (normalizedSharePhone === normalizedUserPhone && report.shareDetail.rejected !== true) {
        return report.shareDetail.accepted === true;
      }
    }
    
    // For Omerald shared reports, check isPending flag
    if (report.isOmeraldSharedReport || report.isSharedReport) {
      return report.isPending === false; // false isPending means accepted
    }
    
    // Default: if status is 'accepted', consider it approved
    if (report.status === 'accepted' || report.status === 'approved') {
      return true;
    }
    
    // If status is 'pending', consider it pending (accepted = false)
    if (report.status === 'pending') {
      return false;
    }
    
    // Fallback to isPending flag
    return report.isPending === false;
  }, [phoneNumber, normalizePhone]);

  // Filter and search reports
  const filteredReports = useMemo(() => {
    let filtered = allSharedReports;

    // Apply status filter based on accepted status
    if (filter === 'pending') {
      // Pending: accepted === false
      filtered = filtered.filter((r: any) => {
        const accepted = getAcceptedStatus(r);
        return accepted === false; // Explicitly false (pending)
      });
    } else if (filter === 'approved') {
      // Approved: accepted === true
      filtered = filtered.filter((r: any) => {
        const accepted = getAcceptedStatus(r);
        return accepted === true; // Explicitly true (approved)
      });
    }
    // If filter is 'all', show all reports (no filtering)

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((report: any) => {
        const sharedBy = report?.createdBy || report?.sharedBy || report?.sharedByUser || report?.userName || '';
        const sharedByName = report?.sharedByName || report?.patient?.name || '';
        const sharedByPhone = report?.sharedByPhone || report?.createdBy || report?.sharedBy || '';
        const reportName = report?.name || report?.testName || report?.type || report?.documentType || '';
        const diagnosticCenter = report?.diagnosticCenter || '';
        
        return (
          sharedBy.toLowerCase().includes(query) ||
          sharedByName.toLowerCase().includes(query) ||
          sharedByPhone.toLowerCase().includes(query) ||
          reportName.toLowerCase().includes(query) ||
          diagnosticCenter.toLowerCase().includes(query)
        );
      });
    }

    // Sort by date (newest first)
    filtered.sort((a: any, b: any) => {
      const dateA = a.uploadDate || a.reportDate || a.sharedAt || 0;
      const dateB = b.uploadDate || b.reportDate || b.sharedAt || 0;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    return filtered;
  }, [allSharedReports, filter, searchQuery, getAcceptedStatus]);

  const acceptDCReport = useAcceptSharedReport(
    () => {
      queryClient.invalidateQueries({ queryKey: ['getSharedReports'] });
      queryClient.invalidateQueries({ queryKey: ['getManyReports'] });
      queryClient.invalidateQueries({ queryKey: ['getPendingSharedReports'] });
      queryClient.invalidateQueries({ queryKey: ['getReportsFromDC'] });
      setShowViewModal(false);
    },
    () => {}
  );

  const handleAcceptReport = async (report: any) => {
    if (!phoneNumber) return;

    const isDCReport = report?.isDCReport || report?.shareDetail;
    const isOmeraldShared = report?.isOmeraldSharedReport || report?.isSharedReport;
    const isNewDCReport = report?.isNewDCReport;

    // Handle DC reports (old endpoint)
    if (isDCReport && !isNewDCReport && !isOmeraldShared) {
      acceptDCReport.mutate({
        phoneNumber,
        reportId: report._id || report.id,
        userId: profile?.id,
      });
      return;
    }

    // Handle new DC reports
    if (isNewDCReport) {
      // Use a stable reportId based on DC report ID and user phone to prevent duplicates
      const normalizedPhone = phoneNumber.replace(/\s/g, '').replace(/\+/g, '');
      const stableReportId = `DC-${report.id}-${normalizedPhone}`;
      
      // Check if report already exists in user's reports to prevent duplicates
      const existingReports = userReports || [];
      const reportExists = existingReports.some((r: any) => 
        r.reportId === stableReportId || 
        r.originalReportId === report.id ||
        (r.reportUrl === report.reportUrl && r.reportDate && report.reportDate && 
         new Date(r.reportDate).getTime() === new Date(report.reportDate).getTime())
      );
      
      if (reportExists) {
        toast('This report has already been accepted');
        // Still refresh to update the UI
        await Promise.all([
          queryClient.refetchQueries({ queryKey: ['getManyReports'] }),
          queryClient.refetchQueries({ queryKey: ['getReportsFromDC'] }),
          queryClient.refetchQueries({ queryKey: ['getSharedReports'] }),
          queryClient.refetchQueries({ queryKey: ['getPendingSharedReports'] }),
        ]);
        setShowViewModal(false);
        return;
      }
      
      const reportData = {
        userId: phoneNumber,
        userName: report?.userName || report?.patient?.name || `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || phoneNumber,
        reportId: stableReportId,
        originalReportId: report.id, // Store reference to original DC report
        reportUrl: report.reportUrl || report.reportDoc,
        reportDoc: report.reportDoc || report.reportUrl,
        name: report.name || report.testName || 'Report',
        type: report.type || report.documentType || 'Diagnostic Report',
        testName: report.testName || report.name || 'Report',
        documentType: report.documentType || report.type || 'Diagnostic Report',
        reportDate: report.reportDate ? new Date(report.reportDate) : new Date(),
        uploadDate: new Date(),
        uploadedAt: new Date(),
        status: 'accepted',
        description: '',
        remarks: '',
        conditions: [],
        sharedWith: [],
        diagnosticCenter: report.diagnosticCenter || 'Diagnostic Center',
        createdBy: phoneNumber,
        updatedBy: phoneNumber,
        parsedData: report.parsedData,
      };

      try {
        const response = await axios.post(insertReport, reportData);
        if (response.data.success) {
          toast.success('Report accepted and added to your profile!');
          // Refetch all reports queries to get updated data
          await Promise.all([
            queryClient.refetchQueries({ queryKey: ['getManyReports'] }),
            queryClient.refetchQueries({ queryKey: ['getReportsFromDC'] }),
            queryClient.refetchQueries({ queryKey: ['getSharedReports'] }),
            queryClient.refetchQueries({ queryKey: ['getPendingSharedReports'] }),
          ]);
          setShowViewModal(false);
        }
      } catch (error: any) {
        // Check if error is due to duplicate reportId
        if (error.response?.data?.error?.message?.includes('duplicate') || 
            error.response?.data?.error?.code === 'DUPLICATE_REPORT') {
          toast('This report has already been accepted');
        } else {
          toast.error('Error accepting report: ' + (error.response?.data?.error || error.message));
        }
        // Still refresh to update the UI
        await Promise.all([
          queryClient.refetchQueries({ queryKey: ['getManyReports'] }),
          queryClient.refetchQueries({ queryKey: ['getReportsFromDC'] }),
          queryClient.refetchQueries({ queryKey: ['getSharedReports'] }),
          queryClient.refetchQueries({ queryKey: ['getPendingSharedReports'] }),
        ]);
      }
      return;
    }

    // Handle Omerald user shared reports
    if (isOmeraldShared && !isDCReport) {
      // Get the original reportId
      const originalReportId = report.reportId || report._id || report.id;
      
      // Generate a unique reportId for this user (includes userId to ensure uniqueness)
      // Format: USER-{phoneNumber}-ACCEPTED-{originalReportId}-{timestamp}
      const normalizedPhone = phoneNumber.replace(/\s/g, '').replace(/\+/g, '');
      const uniqueReportId = `USER-${normalizedPhone}-ACCEPTED-${originalReportId}-${Date.now()}`;
      
      const reportData = {
        userId: phoneNumber,
        userName: report?.userName || `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || phoneNumber,
        reportId: uniqueReportId,
        originalReportId: originalReportId, // Reference to original shared report
        reportUrl: report.reportUrl || report.reportDoc,
        reportDoc: report.reportDoc || report.reportUrl,
        name: report.name || report.testName || 'Report',
        type: report.type || report.documentType || 'Report',
        testName: report.testName || report.name || 'Report',
        documentType: report.documentType || report.type || 'Report',
        reportDate: report.reportDate ? new Date(report.reportDate) : new Date(),
        uploadDate: new Date(),
        uploadedAt: new Date(),
        status: 'accepted',
        description: report.description || '',
        remarks: report.remarks || '',
        conditions: report.conditions || [],
        sharedWith: [],
        diagnosticCenter: report.diagnosticCenter || 'Unknown',
        createdBy: phoneNumber,
        updatedBy: phoneNumber,
        parsedData: report.parsedData || [],
      };

      try {
        const response = await axios.post(insertReport, reportData);
        if (response.data.success || response.data._id) {
          // Remove from sharedWith array of original report
          const reportId = report._id || report.id || report.reportId;
          const sharedWith = report.sharedWith || [];
          const normalizedUserPhone = phoneNumber.replace(/\s/g, '').startsWith('+') 
            ? phoneNumber.replace(/\s/g, '') 
            : `+${phoneNumber.replace(/\s/g, '')}`;
          
          const updatedSharedWith = sharedWith.filter((share: any) => {
            const sharePhone = (share.phoneNumber || '').replace(/\s/g, '');
            const normalizedSharePhone = sharePhone.startsWith('+') ? sharePhone : `+${sharePhone}`;
            return normalizedSharePhone !== normalizedUserPhone;
          });
          
          await axios.put(`${updateReport}?id=${reportId}`, { sharedWith: updatedSharedWith });
          toast.success('Report accepted and added to your profile!');
          queryClient.invalidateQueries({ queryKey: ['getManyReports'] });
          queryClient.invalidateQueries({ queryKey: ['getPendingSharedReports'] });
          setShowViewModal(false);
        }
      } catch (error: any) {
        toast.error('Error accepting report: ' + (error.response?.data?.error || error.message));
      }
    }
  };

  const handleRejectReport = async (report: any) => {
    if (!phoneNumber) return;

    if (!confirm('Are you sure you want to reject this report? It will be removed from your profile but not deleted (DC reports are managed by the diagnostic center).')) {
      return;
    }

    const isDCReport = report?.isDCReport || report?.shareDetail;
    const isOmeraldShared = report?.isOmeraldSharedReport || report?.isSharedReport;
    const isNewDCReport = report?.isNewDCReport;

    // Handle DC reports (both old and new) - call API to set rejected = true
    if (isDCReport || isNewDCReport) {
      const reportId = report?.id || report?._id;
      if (!reportId) {
        toast.error('Report ID is required');
        return;
      }

      try {
        // Call Next.js API route (server-side proxy to avoid CORS)
        const response = await axios.post('/api/reports/reject', {
          reportId: reportId,
          userContact: phoneNumber
        }, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.data.success) {
          toast.success('Report rejected and removed from your profile');
          
          // Refetch all reports queries to get updated data
          await Promise.all([
            queryClient.refetchQueries({ queryKey: ['getSharedReports'] }),
            queryClient.refetchQueries({ queryKey: ['getReportsFromDC'] }),
            queryClient.refetchQueries({ queryKey: ['getPendingSharedReports'] }),
            queryClient.refetchQueries({ queryKey: ['getManyReports'] }),
          ]);
          setShowViewModal(false);
        } else {
          throw new Error(response.data.error?.message || 'Failed to reject report');
        }
      } catch (error: any) {
        console.error('Error rejecting report:', error);
        const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Unknown error';
        toast.error('Error rejecting report: ' + errorMessage);
      }
      return;
    }

    // Handle Omerald user shared reports
    if (isOmeraldShared && !isDCReport) {
      const reportId = report._id || report.id || report.reportId;
      const sharedWith = report.sharedWith || [];
      const normalizedUserPhone = phoneNumber.replace(/\s/g, '').startsWith('+') 
        ? phoneNumber.replace(/\s/g, '') 
        : `+${phoneNumber.replace(/\s/g, '')}`;
      
      const updatedSharedWith = sharedWith.filter((share: any) => {
        const sharePhone = (share.phoneNumber || '').replace(/\s/g, '');
        const normalizedSharePhone = sharePhone.startsWith('+') ? sharePhone : `+${sharePhone}`;
        return normalizedSharePhone !== normalizedUserPhone;
      });
      
      try {
        await axios.put(`${updateReport}?id=${reportId}`, { sharedWith: updatedSharedWith });
        toast.success('Report rejected');
        queryClient.invalidateQueries({ queryKey: ['getManyReports'] });
        queryClient.invalidateQueries({ queryKey: ['getPendingSharedReports'] });
        setShowViewModal(false);
      } catch (error: any) {
        toast.error('Error rejecting report: ' + error.message);
      }
    }
  };

  const isLoading = isLoadingPending || isLoadingSharedPending || isLoadingSharedAccepted || isLoadingDCReports;

  // Calculate counts for each filter using the same logic
  // MUST be called before any early returns to follow Rules of Hooks
  const reportCounts = useMemo(() => {
    const pending = allSharedReports.filter((r: any) => {
      const accepted = getAcceptedStatus(r);
      return accepted === false; // Explicitly false (pending)
    }).length;
    
    const approved = allSharedReports.filter((r: any) => {
      const accepted = getAcceptedStatus(r);
      return accepted === true; // Explicitly true (approved)
    }).length;
    
    return {
      all: allSharedReports.length,
      pending,
      approved,
    };
  }, [allSharedReports, getAcceptedStatus]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-700"></div>
      </div>
    );
  }

  if (allSharedReports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <DocumentTextIcon className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-base text-gray-500 font-medium">No Reports Shared With You</p>
        <p className="text-sm text-gray-400 mt-1">
          Reports shared with you will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Reports Shared With You ({reportCounts.all})
        </h3>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        {/* Filter Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              filter === 'all'
                ? 'bg-[#40189D] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
            {reportCounts.all > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                filter === 'all' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {reportCounts.all}
              </span>
            )}
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              filter === 'pending'
                ? 'bg-[#40189D] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Pending
            {reportCounts.pending > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                filter === 'pending' ? 'bg-white/20 text-white' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {reportCounts.pending}
              </span>
            )}
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              filter === 'approved'
                ? 'bg-[#40189D] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Approved
            {reportCounts.approved > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                filter === 'approved' ? 'bg-white/20 text-white' : 'bg-green-100 text-green-800'
              }`}>
                {reportCounts.approved}
              </span>
            )}
          </button>
        </div>

        {/* Search Input */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or phone number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40189D] focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Reports Grid */}
      {filteredReports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <DocumentTextIcon className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-base text-gray-500 font-medium">
            {searchQuery 
              ? 'No reports match your search' 
              : filter === 'pending' 
                ? 'No pending reports'
                : filter === 'approved'
                  ? 'No approved reports'
                  : 'No reports found'}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {searchQuery 
              ? 'Try adjusting your search terms' 
              : filter !== 'all'
                ? 'Reports matching this filter will appear here'
                : 'Reports shared with you will appear here'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReports.map((report: any, index: number) => {
            const sharedBy = report?.createdBy || report?.sharedBy || report?.sharedByUser || 'Unknown';
            const sharedDate = report?.uploadDate || report?.sharedAt || report?.reportDate || new Date();
            const formattedDate = moment(sharedDate).format('DD-MMM-YYYY');
            const reportType = report?.name || report?.testName || report?.type || report?.documentType || 'Report';
            const isDCReport = getIsDCReport(report);

            return (
              <div
                key={report._id || report.id || index}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer relative"
                onClick={() => {
                  setSelectedReport(report);
                  setShowViewModal(true);
                }}
              >
                {/* Status and Source Indicators */}
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {report.isPending && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full border border-yellow-200">
                      <ClockIcon className="w-3 h-3" />
                      Pending
                    </span>
                  )}
                  {isDCReport ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full border border-blue-200">
                      DC Shared
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full border border-green-200">
                      User Shared
                    </span>
                  )}
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <DocumentTextIcon className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 truncate">{reportType}</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Shared by <span className="font-medium">{sharedBy}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{formattedDate}</p>
                    {report.diagnosticCenter && (
                      <p className="text-xs text-gray-500 mt-1">{report.diagnosticCenter}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showViewModal && selectedReport && (
        <ViewReportModal
          visible={showViewModal}
          setVisible={setShowViewModal}
          report={selectedReport}
          showActions={selectedReport.isPending}
          onAccept={selectedReport.isPending ? () => handleAcceptReport(selectedReport) : undefined}
          onReject={selectedReport.isPending ? () => handleRejectReport(selectedReport) : undefined}
        />
      )}
    </div>
  );
}

