'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useGetManyReports, useGetSharedReports, useGetReportsFromDC, useGetPendingSharedReports, useAcceptSharedReport } from '@/hooks/reactQuery/reports';
import { useAuthContext } from '@/components/common/utils/context/auth.context';
import debounce from 'lodash.debounce';
import { getReportsLimit, getSubscriptionPlan } from '@/lib/utils/subscription';
import { PencilIcon, EyeIcon, ShareIcon, TrashIcon, CheckCircleIcon, XCircleIcon, ClockIcon, DocumentIcon } from '@heroicons/react/24/solid';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { deleteReport, updateReport, insertReport } from '@/components/common/lib/constants/urls';
import AddReportModal from '@/components/molecules/AddReportModal';
import ViewReportModal from '@/components/molecules/ViewReportModal';
import EditReportModal from '@/components/molecules/EditReportModal';
import ShareReportModal from '@/components/molecules/ShareReportModal';
import { SharedReport, ReportWithSharedDetails } from '@/services/reportSharingService';
import { getDiagnosticCenterNames, getBranchNames } from '@/services/diagnosticCenterService';
import moment from 'moment';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { memberDetail } from '@/components/common/recoil/member';

// Helper function to check if a string looks like a MongoDB ObjectId
const isObjectId = (str: string): boolean => {
  return /^[0-9a-fA-F]{24}$/.test(str);
};

// Cache for report type names
const reportTypeNameCache = new Map<string, string>();

  // Helper function to get report type name (handles both ID and name)
const getReportTypeName = async (typeOrId: string | undefined): Promise<string> => {
  if (!typeOrId) return 'Blood Report';
  
  // If it's already a name (not an ObjectId), return it
  if (!isObjectId(typeOrId)) {
    return typeOrId;
  }
  
  // Check cache first
  if (reportTypeNameCache.has(typeOrId)) {
    const cached = reportTypeNameCache.get(typeOrId);
    if (cached && cached !== typeOrId) {
      return cached;
    }
  }
  
  // Fetch from API
  try {
    const response = await axios.post('/api/reportType/getReportType', { _id: typeOrId });
    if (response.data && response.status === 200) {
      // Handle both old format (direct data) and new format (data wrapper)
      const reportType = response.data.data || response.data;
      const name = reportType?.testName || reportType?.name || reportType?.type || response.data.testName || response.data.name || response.data.type;
      if (name && name !== typeOrId && typeof name === 'string') {
        reportTypeNameCache.set(typeOrId, name);
        return name;
      }
    }
    // If no valid name found, return ID
    console.warn(`Report type ${typeOrId} found but no name field available`);
    return typeOrId;
  } catch (error: any) {
    // Handle 404 specifically
    if (error?.response?.status === 404) {
      console.warn(`Report type ${typeOrId} not found in database`);
      // Cache the ID itself to avoid repeated failed requests
      reportTypeNameCache.set(typeOrId, typeOrId);
    } else if (error?.response?.status === 405 || error?.code === 'ECONNREFUSED') {
      // CORS or connection issue - might be prod-specific
      console.warn(`Report type API error for ${typeOrId}:`, error?.response?.statusText || error?.message);
      // Don't cache failed lookups to allow retry
    } else {
      console.error(`Error fetching report type name for ${typeOrId}:`, error?.response?.data || error?.message || error);
    }
    return typeOrId; // Return the ID if fetch fails
  }
};

export default function Reports() {
  const { profile, phoneNumber } = useAuthContext();
  const queryClient = useQueryClient();
  const selectedMemberId = useRecoilValue(memberDetail);
  const setMemberDetail = useSetRecoilState(memberDetail);
  const [searchString, setSearch] = useState('');
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMemberForUpload, setSelectedMemberForUpload] = useState<{ phoneNumber?: string; name?: string } | null>(null);
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null);
  const [reportTypeNames, setReportTypeNames] = useState<Map<string, string>>(new Map());
  const [sourceFilter, setSourceFilter] = useState<'all' | 'my-upload' | 'dc-shared' | 'user-shared'>('all');

  // Filter reports by selected member or current user only
  const users: string[] = [];
  if (selectedMemberId && profile) {
    // If viewing as a member, only show that member's reports
    const member = profile.members?.find((m: any) => m.memberId === selectedMemberId);
    if (member?.phoneNumber) {
      users.push(member.phoneNumber);
    } else if (selectedMemberId === profile._id) {
      // If viewing own profile
      users.push(profile.phoneNumber);
    }
  } else {
    // Default: show current user's reports only (not all members)
    if (profile?.phoneNumber) {
      users.push(profile.phoneNumber);
    }
  }

  // Fetch local reports
  const reportsQuery = useGetManyReports(users.length > 0 ? users : undefined);
  const localReports = reportsQuery.data || [];

  // Fetch pending shared reports from omerald users
  const { data: omeraldPendingSharedReports, isLoading: isLoadingOmeraldShared } = useGetPendingSharedReports(
    phoneNumber || undefined
  );

  // Fetch pending shared reports from DC app (old endpoint) - same API as pending reports
  const { data: sharedReportsDataPending, isLoading: isLoadingSharedPending } = useGetSharedReports(
    phoneNumber || undefined,
    'pending'
  );

  // Fetch accepted shared reports from DC app (old endpoint) - for accepted DC shared reports
  const { data: sharedReportsDataAccepted, isLoading: isLoadingSharedAccepted } = useGetSharedReports(
    phoneNumber || undefined,
    'accepted'
  );

  // Fetch pending reports from new DC app endpoint - same API as pending reports
  const { data: dcReportsData, isLoading: isLoadingDCReports } = useGetReportsFromDC(
    phoneNumber || undefined
  );

  // Set member info for upload modal when member is selected (but don't auto-open)
  useEffect(() => {
    if (selectedMemberId && profile) {
      // Find the member in profile
      const member = profile.members?.find((m: any) => m.memberId === selectedMemberId);
      
      if (member) {
        // Set member info for upload modal (but don't open it automatically)
        setSelectedMemberForUpload({
          phoneNumber: member.phoneNumber,
          name: `${member.firstName || ''} ${member.lastName || ''}`.trim(),
        });
        // Clear the selected member ID after setting the info
        setMemberDetail('');
      } else if (selectedMemberId === profile._id) {
        // If it's the profile owner themselves
        setSelectedMemberForUpload({
          phoneNumber: profile.phoneNumber,
          name: `${profile.firstName || ''} ${profile.lastName || ''}`.trim(),
        });
        setMemberDetail('');
      }
    }
  }, [selectedMemberId, profile, setMemberDetail]);

  // Cache for DC and branch names
  const [dcNamesMap, setDcNamesMap] = useState<Map<string, string>>(new Map());
  const [branchNamesMap, setBranchNamesMap] = useState<Map<string, string>>(new Map());
  
  // Collapsible state for pending reports
  const [isPendingReportsExpanded, setIsPendingReportsExpanded] = useState<boolean>(true);
  
  // Loading state for refreshing pending reports after accept/reject
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Fetch DC and branch names for new DC reports
  useEffect(() => {
    if (!dcReportsData?.reports || dcReportsData.reports.length === 0) return;

    const fetchNames = async () => {
      const dcIds = new Set<string>();
      const branchIds = new Set<string>();

      dcReportsData.reports.forEach((report: ReportWithSharedDetails) => {
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

      console.log('Fetching DC and branch names:', { dcIds: Array.from(dcIds), branchIds: Array.from(branchIds) });

      const [dcNames, branchNames] = await Promise.all([
        getDiagnosticCenterNames(Array.from(dcIds)),
        getBranchNames(Array.from(branchIds)),
      ]);

      console.log('Fetched DC names:', Object.fromEntries(dcNames));
      console.log('Fetched branch names:', Object.fromEntries(branchNames));

      setDcNamesMap(dcNames);
      setBranchNamesMap(branchNames);
    };

    fetchNames();
  }, [dcReportsData]);

  // Transform DC shared reports (accepted) from old endpoint - use accepted endpoint
  const dcReportsOld = useMemo(() => {
    // Use accepted endpoint data - handle both 'reports' and 'data' properties
    const reportsArray = (sharedReportsDataAccepted as any)?.data || (sharedReportsDataAccepted as any)?.reports || [];
    if (!reportsArray || reportsArray.length === 0) {
      console.log('dcReportsOld - No reports array found in sharedReportsDataAccepted:', sharedReportsDataAccepted);
      return [];
    }
    
    // Normalize phone number for comparison
    const normalizePhone = (phone: string) => {
      if (!phone) return '';
      return phone.replace(/\s/g, '').startsWith('+') ? phone.replace(/\s/g, '') : `+${phone.replace(/\s/g, '')}`;
    };
    const normalizedUserPhone = phoneNumber ? normalizePhone(phoneNumber) : '';
    
    console.log('dcReportsOld - reportsArray:', reportsArray.length, 'phoneNumber:', phoneNumber);
    
    // Filter by accepted=true - same logic as pending but with accepted=true
    return reportsArray
      .filter((dcReport: any) => {
        // If report has sharedReportDetails array, filter based on it
        if (dcReport.sharedReportDetails && Array.isArray(dcReport.sharedReportDetails)) {
          const matchingDetail = dcReport.sharedReportDetails.find((detail: any) => {
            if (normalizePhone(detail.userContact) === normalizedUserPhone) { 
              return detail.accepted === true;
            }
          });

          return matchingDetail;
        }
        
        // Fallback: Check old shareDetail structure if it exists
        if (dcReport.shareDetail && dcReport.shareDetail.accepted === true) {
          return true;
        }
    
        return false;
      })
      .map((dcReport: any) => {
        // Find the matching shareDetail from sharedReportDetails array
        let shareDetail = dcReport.shareDetail;
        if (dcReport.sharedReportDetails && Array.isArray(dcReport.sharedReportDetails)) {
          const matchingDetail = dcReport.sharedReportDetails.find((detail: any) => {
            const normalizedDetailPhone = normalizePhone(detail.userContact || '');
            return normalizedDetailPhone === normalizedUserPhone && 
                   detail.accepted === true;
          });
          if (matchingDetail) {
            shareDetail = matchingDetail;
          }
        }
        
        return {
          ...dcReport,
          _id: dcReport.id,
          id: dcReport.id,
          // Map DC report structure to local structure
          name: dcReport.reportData?.reportName || 'Report',
          testName: dcReport.reportData?.reportName || 'Report',
          // Preserve original diagnosticCenter structure for DC ID extraction
          diagnosticCenter: dcReport.diagnosticCenter || {
            diagnostic: typeof dcReport.diagnosticCenter?.diagnostic === 'string' 
              ? dcReport.diagnosticCenter.diagnostic 
              : dcReport.diagnosticCenter?.diagnostic?.id || dcReport.diagnosticCenter?.diagnostic,
            branch: typeof dcReport.diagnosticCenter?.branch === 'string'
              ? dcReport.diagnosticCenter.branch
              : dcReport.diagnosticCenter?.branch?.id || dcReport.diagnosticCenter?.branch
          },
          // Also set diagnosticCenterId and branchId for easier access
          diagnosticCenterId: typeof dcReport.diagnosticCenter?.diagnostic === 'string' 
            ? dcReport.diagnosticCenter.diagnostic 
            : dcReport.diagnosticCenter?.diagnostic?.id || dcReport.diagnosticCenter?.diagnostic,
          branchId: typeof dcReport.diagnosticCenter?.branch === 'string' 
            ? dcReport.diagnosticCenter.branch
            : dcReport.diagnosticCenter?.branch?.id || dcReport.diagnosticCenter?.branch,
          // Fallback display names (will be fetched by DiagnosticReport)
          branch: typeof dcReport.diagnosticCenter?.branch === 'object' && dcReport.diagnosticCenter?.branch?.name
            ? dcReport.diagnosticCenter.branch.name
            : '',
          createdBy: dcReport.pathologist?.name || 'Diagnostic Center',
          uploadDate: shareDetail?.sharedAt || dcReport.shareDetail?.sharedAt,
          reportDate: dcReport.reportData?.reportDate,
          status: 'accepted',
          // Ensure reportUrl is set for PDF/image viewing - use url, pdfUrl, or imageUrl
          reportUrl: dcReport.reportData?.url || dcReport.reportData?.pdfUrl || dcReport.reportData?.imageUrl || dcReport.reportData?.parsedData?.components?.[0]?.images?.[0],
          reportDoc: dcReport.reportData?.url || dcReport.reportData?.pdfUrl || dcReport.reportData?.imageUrl, // Also set reportDoc for compatibility
          fileType: dcReport.reportData?.fileType, // "pdf" or "image"
          parsedData: dcReport.reportData?.parsedData,
          // Mark as DC report
          isDCReport: true,
          isDCShared: true, // Flag to show "DC Shared" indicator
          shareDetail: shareDetail || dcReport.shareDetail,
          sharedReportDetails: dcReport.sharedReportDetails,
          patient: dcReport.patient,
          // Additional DC-specific fields for modal detection
          userName: dcReport.patient?.name || 'Unknown',
          type: dcReport.reportData?.parsedData?.test?.testName || 'Diagnostic Report',
          documentType: dcReport.reportData?.parsedData?.test?.testName || 'Diagnostic Report',
          // DC reports are read-only
          sharedWith: [],
        };
      });
  }, [sharedReportsDataAccepted, phoneNumber]);

  // Transform DC shared reports (accepted) from new endpoint - same API as pending, filter by accepted=true
  const dcReportsNew = useMemo(() => {
    if (!dcReportsData?.reports) return [];
    
    // Normalize phone number for comparison
    const normalizePhone = (phone: string) => {
      if (!phone) return '';
      return phone.replace(/\s/g, '').startsWith('+') ? phone.replace(/\s/g, '') : `+${phone.replace(/\s/g, '')}`;
    };
    const normalizedUserPhone = phoneNumber ? normalizePhone(phoneNumber) : '';
    
    console.log('dcReportsNew - reports:', dcReportsData.reports.length, 'phoneNumber:', phoneNumber);
    
    // Filter by accepted=true - same logic as pending but with accepted=true
    return dcReportsData.reports
      .filter((dcReport: ReportWithSharedDetails) => {
        // Only include reports that have a matching accepted shareDetail
        if (!dcReport.sharedReportDetails || !Array.isArray(dcReport.sharedReportDetails)) return false;
        
        const shareDetail = dcReport.sharedReportDetails.find(
          (detail) => {
            const normalizedDetailPhone = normalizePhone(detail.userContact || '');
            return normalizedDetailPhone === normalizedUserPhone && detail.accepted === true;
          }
        );
        
        if (shareDetail) {
          console.log('Found accepted report:', dcReport.id, shareDetail);
        }
        
        return !!shareDetail; // Only include if shareDetail exists
      })
      .map((dcReport: ReportWithSharedDetails) => {
        const shareDetail = dcReport.sharedReportDetails?.find(
          (detail) => {
            const normalizedDetailPhone = normalizePhone(detail.userContact || '');
            return normalizedDetailPhone === normalizedUserPhone && detail.accepted === true;
          }
        );
        
        // Extract test name from parsedData
        const testName = typeof dcReport.reportData?.parsedData?.test === 'object' 
          ? dcReport.reportData.parsedData.test.testName 
          : (typeof dcReport.reportData?.parsedData?.test === 'string' 
            ? dcReport.reportData.parsedData.test 
            : 'Diagnostic Report');
        
        // Handle diagnostic center - fetch names from cache or API
        let diagnosticCenterName = 'Diagnostic Center';
        let branchName = '';
        const diagnostic = dcReport.diagnosticCenter?.diagnostic;
        const branch = dcReport.diagnosticCenter?.branch;
        
        if (diagnostic) {
          if (typeof diagnostic === 'object' && diagnostic !== null && 'name' in diagnostic) {
            // Old endpoint format - has full object with name
            diagnosticCenterName = (diagnostic as any).name;
          } else if (typeof diagnostic === 'string') {
            // New endpoint format - only has ID, fetch name from cache
            diagnosticCenterName = dcNamesMap.get(diagnostic) || 'Diagnostic Center';
          }
        }
        
        if (branch) {
          if (typeof branch === 'object' && branch !== null && 'name' in branch) {
            // Old endpoint format - has full object with name
            branchName = (branch as any).name;
          } else if (typeof branch === 'string') {
            // New endpoint format - only has ID, fetch name from cache
            branchName = branchNamesMap.get(branch) || '';
          }
        }

        return {
          ...dcReport,
          _id: dcReport.id,
          id: dcReport.id,
          name: dcReport.reportData?.reportName || 'Report',
          testName: dcReport.reportData?.reportName || 'Report',
          diagnosticCenter: diagnosticCenterName,
          branch: branchName,
          // Store IDs for potential future lookup
          diagnosticCenterId: typeof diagnostic === 'string' 
            ? diagnostic 
            : (diagnostic as any)?.id,
          branchId: typeof branch === 'string' 
            ? branch 
            : (branch as any)?.id,
          createdBy: dcReport.pathologist?.name || diagnosticCenterName,
          uploadDate: shareDetail?.sharedAt || dcReport.reportData?.reportDate || new Date().toISOString(),
          reportDate: dcReport.reportData?.reportDate,
          status: 'accepted',
          reportUrl: dcReport.reportData?.url || dcReport.reportData?.pdfUrl || dcReport.reportData?.imageUrl,
          reportDoc: dcReport.reportData?.url || dcReport.reportData?.pdfUrl || dcReport.reportData?.imageUrl,
          fileType: dcReport.reportData?.fileType || 'pdf',
          parsedData: dcReport.reportData?.parsedData,
          isDCReport: true,
          isDCShared: true, // Flag to show "DC Shared" indicator
          isNewDCReport: true,
          shareDetail: shareDetail,
          sharedReportDetails: dcReport.sharedReportDetails,
          patient: dcReport.patient,
          userName: dcReport.patient?.name || phoneNumber || 'User',
          type: testName,
          documentType: testName,
          // DC reports are read-only
          sharedWith: [],
        };
      });
  }, [dcReportsData, phoneNumber, dcNamesMap, branchNamesMap]);

  // Merge old and new DC reports
  const dcReports = [...dcReportsOld, ...dcReportsNew];
  
  // Debug logging
  useEffect(() => {
    if (phoneNumber) {
      console.log('DC Reports Debug:', {
        phoneNumber,
        sharedReportsDataAccepted: sharedReportsDataAccepted ? Object.keys(sharedReportsDataAccepted) : null,
        sharedReportsDataAcceptedData: (sharedReportsDataAccepted as any)?.data?.length || 0,
        dcReportsData: dcReportsData?.reports?.length || 0,
        dcReportsOld: dcReportsOld.length,
        dcReportsNew: dcReportsNew.length,
        totalDcReports: dcReports.length,
      });
    }
  }, [phoneNumber, dcReportsOld.length, dcReportsNew.length, dcReports.length, sharedReportsDataAccepted, dcReportsData]);

  // Transform omerald user shared reports to match component structure
  const omeraldPendingReports = useMemo(() => {
    if (!omeraldPendingSharedReports || !Array.isArray(omeraldPendingSharedReports)) return [];
    return omeraldPendingSharedReports
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
      }));
  }, [omeraldPendingSharedReports]);

  // Transform DC shared reports (old endpoint) to match component structure
  const dcPendingReportsOld = useMemo(() => {
    // Handle both 'reports' and 'data' properties for backward compatibility - match dashboard logic
    const reportsArray = (sharedReportsDataPending as any)?.data || [];
    if (!reportsArray || reportsArray.length === 0) return [];
    
    // Normalize phone number for comparison
    const normalizePhone = (phone: string) => {
      if (!phone) return '';
      return phone.replace(/\s/g, '').startsWith('+') ? phone.replace(/\s/g, '') : `+${phone.replace(/\s/g, '')}`;
    };
    const normalizedUserPhone = phoneNumber ? normalizePhone(phoneNumber) : '';
    
    // Filter out rejected reports and filter by sharedReportDetails - match dashboard logic
    return reportsArray
      .filter((dcReport: any) => {
        // If report has sharedReportDetails array, filter based on it
        if (dcReport.sharedReportDetails && Array.isArray(dcReport.sharedReportDetails)) {
          const matchingDetail = dcReport.sharedReportDetails.find((detail: any) => {
            if (normalizePhone(detail.userContact) === normalizedUserPhone) { 
              return detail.accepted === false && detail.rejected === false;
            }
          });

          return matchingDetail;
        }
    
        return false;
      })
      .map((dcReport: any) => {
        // Find the matching shareDetail from sharedReportDetails array - match dashboard logic
        let shareDetail = dcReport.shareDetail;
        if (dcReport.sharedReportDetails && Array.isArray(dcReport.sharedReportDetails)) {
          const matchingDetail = dcReport.sharedReportDetails.find((detail: any) => {
            const normalizedDetailPhone = normalizePhone(detail.userContact || '');
            return normalizedDetailPhone === normalizedUserPhone && 
                   detail.accepted === false && 
                   detail.rejected === false;
          });
          if (matchingDetail) {
            shareDetail = matchingDetail;
          }
        }
        
        return {
        ...dcReport,
        _id: dcReport.id,
        id: dcReport.id,
          // Map DC report structure to local structure - match dashboard logic
          name: dcReport.reportData?.reportName || 'Report',
          testName: dcReport.reportData?.reportName || 'Report',
          // Preserve original diagnosticCenter structure for DC ID extraction
          diagnosticCenter: dcReport.diagnosticCenter || {
            diagnostic: typeof dcReport.diagnosticCenter?.diagnostic === 'string' 
              ? dcReport.diagnosticCenter.diagnostic 
              : dcReport.diagnosticCenter?.diagnostic?.id || dcReport.diagnosticCenter?.diagnostic,
            branch: typeof dcReport.diagnosticCenter?.branch === 'string'
              ? dcReport.diagnosticCenter.branch
              : dcReport.diagnosticCenter?.branch?.id || dcReport.diagnosticCenter?.branch
          },
          // Also set diagnosticCenterId and branchId for easier access
          diagnosticCenterId: typeof dcReport.diagnosticCenter?.diagnostic === 'string' 
            ? dcReport.diagnosticCenter.diagnostic 
            : dcReport.diagnosticCenter?.diagnostic?.id || dcReport.diagnosticCenter?.diagnostic,
          branchId: typeof dcReport.diagnosticCenter?.branch === 'string' 
            ? dcReport.diagnosticCenter.branch
            : dcReport.diagnosticCenter?.branch?.id || dcReport.diagnosticCenter?.branch,
          // Fallback display names (will be fetched by DiagnosticReport)
          branch: typeof dcReport.diagnosticCenter?.branch === 'object' && dcReport.diagnosticCenter?.branch?.name
            ? dcReport.diagnosticCenter.branch.name
            : '',
          createdBy: dcReport.pathologist?.name || 'Diagnostic Center',
          uploadDate: shareDetail?.sharedAt || dcReport.shareDetail?.sharedAt,
          reportDate: dcReport.reportData?.reportDate,
          status: shareDetail?.accepted ? 'accepted' : 'pending',
          // Ensure reportUrl is set for PDF/image viewing - use url, pdfUrl, or imageUrl
          reportUrl: dcReport.reportData?.url || dcReport.reportData?.pdfUrl || dcReport.reportData?.imageUrl || dcReport.reportData?.parsedData?.components?.[0]?.images?.[0],
          reportDoc: dcReport.reportData?.url || dcReport.reportData?.pdfUrl || dcReport.reportData?.imageUrl, // Also set reportDoc for compatibility
          fileType: dcReport.reportData?.fileType, // "pdf" or "image"
          parsedData: dcReport.reportData?.parsedData,
          // Mark as DC report
          isDCReport: true,
          shareDetail: shareDetail || dcReport.shareDetail,
          sharedReportDetails: dcReport.sharedReportDetails,
          patient: dcReport.patient,
          // Additional DC-specific fields for modal detection
          userName: dcReport.patient?.name || 'Unknown',
          type: dcReport.reportData?.parsedData?.test?.testName || 'Diagnostic Report',
          documentType: dcReport.reportData?.parsedData?.test?.testName || 'Diagnostic Report',
        };
      });
  }, [sharedReportsDataPending, phoneNumber]);

  // Transform new DC reports to match component structure
  const dcPendingReportsNew = useMemo(() => {
    if (!dcReportsData?.reports) return [];
    
    const normalizePhone = (phone: string) => {
      if (!phone) return '';
      return phone.replace(/\s/g, '').startsWith('+') ? phone.replace(/\s/g, '') : `+${phone.replace(/\s/g, '')}`;
    };
    const normalizedUserPhone = phoneNumber ? normalizePhone(phoneNumber) : '';
    
    return dcReportsData.reports
      .filter((dcReport: ReportWithSharedDetails) => {
        // Only include reports that have a matching pending shareDetail
        if (!dcReport.sharedReportDetails || !Array.isArray(dcReport.sharedReportDetails)) return false;
        
        const shareDetail = dcReport.sharedReportDetails.find(
          (detail) => {
            const normalizedDetailPhone = normalizePhone(detail.userContact || '');
            return normalizedDetailPhone === normalizedUserPhone && 
                   detail.accepted === false && 
                   (detail.rejected === false || detail.rejected === undefined || detail.rejected === null);
          }
        );
        
        return !!shareDetail; // Only include if shareDetail exists
      })
      .map((dcReport: ReportWithSharedDetails) => {
        const shareDetail = dcReport.sharedReportDetails?.find(
          (detail) => {
            const normalizedDetailPhone = normalizePhone(detail.userContact || '');
            return normalizedDetailPhone === normalizedUserPhone && 
                   detail.accepted === false && 
                   (detail.rejected === false || detail.rejected === undefined || detail.rejected === null);
          }
        );
        
        const testName = typeof dcReport.reportData?.parsedData?.test === 'object' 
          ? dcReport.reportData.parsedData.test.testName 
          : (typeof dcReport.reportData?.parsedData?.test === 'string' 
            ? dcReport.reportData.parsedData.test 
            : 'Diagnostic Report');
        
        // Handle diagnostic center - fetch names from cache or API
        let diagnosticCenterName = 'Diagnostic Center';
        let branchName = '';
        const diagnostic = dcReport.diagnosticCenter?.diagnostic;
        const branch = dcReport.diagnosticCenter?.branch;
        
        if (diagnostic) {
          if (typeof diagnostic === 'object' && diagnostic !== null && 'name' in diagnostic) {
            // Old endpoint format - has full object with name
            diagnosticCenterName = (diagnostic as any).name;
          } else if (typeof diagnostic === 'string') {
            // New endpoint format - only has ID, fetch name from cache
            const fetchedName = dcNamesMap.get(diagnostic);
            if (fetchedName) {
              diagnosticCenterName = fetchedName;
            } else {
              // If not in cache, try to fetch it directly (fallback)
              console.log(`DC name not found in cache for ID: ${diagnostic}, map size: ${dcNamesMap.size}`);
            }
          }
        }
        
        if (branch) {
          if (typeof branch === 'object' && branch !== null && 'name' in branch) {
            // Old endpoint format - has full object with name
            branchName = (branch as any).name;
          } else if (typeof branch === 'string') {
            // New endpoint format - only has ID, fetch name from cache
            branchName = branchNamesMap.get(branch) || '';
          }
        }
        
        return {
          ...dcReport,
          _id: dcReport.id,
          id: dcReport.id,
          name: dcReport.reportData?.reportName || 'Report',
          testName: dcReport.reportData?.reportName || 'Report',
          diagnosticCenter: diagnosticCenterName,
          branch: branchName,
          // Store IDs for potential future lookup
          diagnosticCenterId: typeof diagnostic === 'string' 
            ? diagnostic 
            : (diagnostic as any)?.id,
          branchId: typeof branch === 'string' 
            ? branch 
            : (branch as any)?.id,
          createdBy: dcReport.pathologist?.name || diagnosticCenterName,
          uploadDate: shareDetail?.sharedAt || dcReport.reportData?.reportDate || new Date().toISOString(),
          reportDate: dcReport.reportData?.reportDate,
          status: 'pending',
          reportUrl: dcReport.reportData?.url || dcReport.reportData?.pdfUrl || dcReport.reportData?.imageUrl,
          reportDoc: dcReport.reportData?.url || dcReport.reportData?.pdfUrl || dcReport.reportData?.imageUrl,
          fileType: dcReport.reportData?.fileType || 'pdf',
          parsedData: dcReport.reportData?.parsedData,
          isDCReport: true,
          isNewDCReport: true,
          shareDetail: shareDetail,
          sharedReportDetails: dcReport.sharedReportDetails,
          patient: dcReport.patient,
          userName: dcReport.patient?.name || phoneNumber || 'User',
          type: testName,
          documentType: testName,
        };
      });
  }, [dcReportsData, phoneNumber, dcNamesMap, branchNamesMap]);

  // Merge all pending reports and deduplicate by report ID
  const allPendingReports = [...omeraldPendingReports, ...dcPendingReportsOld, ...dcPendingReportsNew];
  const pendingReportsMap = new Map();
  allPendingReports.forEach((report: any) => {
    const reportId = report.id || report._id || report.reportId;
    if (reportId && !pendingReportsMap.has(reportId)) {
      pendingReportsMap.set(reportId, report);
    }
  });
  const pendingReports = Array.from(pendingReportsMap.values());
  const isLoadingPending = isLoadingOmeraldShared || isLoadingSharedPending || isLoadingDCReports || isRefreshing;

  // Debug logging
  useEffect(() => {
    if (phoneNumber) {
      console.log('Reports Tab Debug:', {
        phoneNumber,
        omeraldPendingReports: omeraldPendingReports.length,
        dcPendingReportsOld: dcPendingReportsOld.length,
        dcPendingReportsNew: dcPendingReportsNew.length,
        totalPending: pendingReports.length,
        isLoadingPending,
        omeraldPendingSharedReports: omeraldPendingSharedReports?.length || 0,
        sharedReportsDataPending: sharedReportsDataPending?.reports?.length || 0,
        dcReportsData: dcReportsData?.reports?.length || 0,
      });
    }
  }, [phoneNumber, pendingReports.length, isLoadingPending, omeraldPendingReports.length, dcPendingReportsOld.length, dcPendingReportsNew.length, omeraldPendingSharedReports, sharedReportsDataPending, dcReportsData]);

  // Merge local and DC reports (accepted only) and deduplicate by report ID
  const allReports = [...localReports, ...dcReports];
  const reportsMap = new Map();
  allReports.forEach((report: any) => {
    const reportId = report.reportId || report.id || report._id?.toString();
    if (reportId) {
      // Prefer Reports collection reports over profile reports
      if (!reportsMap.has(reportId) || !report._fromProfile) {
        reportsMap.set(reportId, report);
      }
    } else {
      // Fallback: use a combination of userId and reportUrl for deduplication
      const fallbackId = `${report.userId}-${report.reportUrl || report.reportDoc || report.name || Date.now()}`;
      if (!reportsMap.has(fallbackId)) {
        reportsMap.set(fallbackId, report);
      }
    }
  });
  const reports = Array.from(reportsMap.values());

  // Fetch report type names for all reports
  useEffect(() => {
    const fetchReportTypeNames = async () => {
      const allReportsForTypes = [...localReports, ...dcReports, ...pendingReports];
      const typeIds = new Set<string>();
      
      // Collect all unique report type IDs
      allReportsForTypes.forEach((report: any) => {
        const type = report.type || report.documentType;
        if (type && typeof type === 'string' && isObjectId(type)) {
          typeIds.add(type);
        }
      });
      
      if (typeIds.size === 0) {
        return; // No IDs to fetch
      }
      
      console.log('Fetching report type names for IDs:', Array.from(typeIds));
      
      // Fetch names for all IDs that aren't already cached
      const uncachedIds = Array.from(typeIds).filter(id => {
        const cached = reportTypeNameCache.has(id) || reportTypeNames.has(id);
        return !cached;
      });
      
      if (uncachedIds.length === 0) {
        // All IDs are cached, just update state from cache
        const namesMap = new Map<string, string>();
        typeIds.forEach(id => {
          const name = reportTypeNameCache.get(id) || reportTypeNames.get(id);
          if (name && name !== id) {
            namesMap.set(id, name);
          }
        });
        if (namesMap.size > 0) {
          setReportTypeNames(prev => {
            const updated = new Map(prev);
            namesMap.forEach((value, key) => updated.set(key, value));
            return updated;
          });
        }
        return;
      }
      
      // Fetch names for uncached IDs with better error handling
      const namePromises = uncachedIds.map(async (id) => {
        try {
          const name = await getReportTypeName(id);
          console.log(`Fetched report type name for ${id}: ${name}`);
          // Only cache if we got a valid name (not the ID itself)
          if (name && name !== id) {
            reportTypeNameCache.set(id, name);
            return [id, name];
          }
          return [id, id]; // Keep ID if fetch failed or returned ID
        } catch (error: any) {
          console.error(`Error fetching report type name for ${id}:`, error?.response?.data || error?.message || error);
          // Don't cache failed lookups to allow retry
          return [id, id]; // Fallback to ID if fetch fails
        }
      });
      
      const names = await Promise.all(namePromises);
      const namesMap = new Map(names as [string, string][]);
      
      // Only update state if we have new names
      const hasNewNames = Array.from(namesMap.entries()).some(([id, name]) => name !== id);
      if (hasNewNames) {
        setReportTypeNames(prev => {
          const updated = new Map(prev);
          namesMap.forEach((value, key) => {
            if (value !== key) { // Only set if it's not the ID itself
              updated.set(key, value);
            }
          });
          return updated;
        });
      }
    };
    
    // Always run, even if reports array is empty (to handle cache updates)
    fetchReportTypeNames();
  }, [localReports.length, dcReports.length, pendingReports.length]);

  // Helper function to get display name for report type
  const getReportTypeDisplayName = (report: any): string => {
    const type = report.type || report.documentType;
    if (!type || typeof type !== 'string') return 'Blood Report';
    
    // If it's an ID, check cache/state
    if (isObjectId(type)) {
      // Check state first (most up-to-date)
      const nameFromState = reportTypeNames.get(type);
      if (nameFromState && nameFromState !== type) {
        return nameFromState;
      }
      
      // Check global cache
      const nameFromCache = reportTypeNameCache.get(type);
      if (nameFromCache && nameFromCache !== type) {
        return nameFromCache;
      }
      
      // If we have the ID but no name yet, trigger a fetch (async, won't block render)
      // This handles cases where the useEffect might have missed it
      if (!reportTypeNameCache.has(type) && !reportTypeNames.has(type)) {
        getReportTypeName(type).then((name) => {
          if (name && name !== type) {
            reportTypeNameCache.set(type, name);
            setReportTypeNames(prev => {
              const updated = new Map(prev);
              updated.set(type, name);
              return updated;
            });
          }
        }).catch((error) => {
          console.error(`Failed to fetch report type name for ${type}:`, error);
        });
      }
      
      // Return ID as fallback (will be replaced once fetch completes)
      return type;
    }
    
    // If it's already a name, return it
    return type;
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
  };

  const debouncedSearch = useCallback(debounce(handleSearch, 500), []);

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Helper function to determine report source type
  const getReportSourceType = (report: any): 'my-upload' | 'dc-shared' | 'user-shared' => {
    // Check if it's a DC report
    const isDCReport = report?.isDCReport || report?.shareDetail;
    if (isDCReport) {
      return 'dc-shared';
    }
    
    // Check if it's a user-shared report (has originalReportId indicating it was accepted from another user)
    if (report?.originalReportId) {
      return 'user-shared';
    }
    
    // Default to my upload
    return 'my-upload';
  };

  const filteredReports = reports.filter((report: any) => {
    // Apply source filter
    if (sourceFilter !== 'all') {
      const reportSource = getReportSourceType(report);
      if (reportSource !== sourceFilter) {
        return false;
      }
    }
    
    // Apply search filter
    const userName = report?.userName || '';
    const testName = report?.testName || report?.name || '';
    const reportType = report?.type || report?.documentType || '';
    // Ensure diagnosticCenter is always a string (handle edge cases where it might be an object)
    const diagnosticCenter = typeof report?.diagnosticCenter === 'string' 
      ? report.diagnosticCenter 
      : typeof report?.diagnosticCenter === 'object' && report?.diagnosticCenter?.diagnostic?.name
        ? report.diagnosticCenter.diagnostic.name
        : '';
    const searchLower = searchString.toLowerCase();
    return userName.toLowerCase().includes(searchLower) ||
           testName.toLowerCase().includes(searchLower) ||
           reportType.toLowerCase().includes(searchLower) ||
           diagnosticCenter.toLowerCase().includes(searchLower);
  });

  // Reset source filter to 'all' when source filter has 0 matching reports (ignoring search)
  useEffect(() => {
    if (sourceFilter !== 'all') {
      const sourceFilteredReports = reports.filter((report: any) => {
        const reportSource = getReportSourceType(report);
        return reportSource === sourceFilter;
      });
      
      if (sourceFilteredReports.length === 0) {
        setSourceFilter('all');
      }
    }
  }, [reports, sourceFilter]);

  const handleViewReport = (report: any) => {
    setSelectedReport(report);
    setShowViewModal(true);
  };

  const handleEditReport = (report: any) => {
    setSelectedReport(report);
    setShowEditModal(true);
  };

  const handleDeleteReport = async (report: any) => {
    const isDCReport = report?.isDCReport || report?.shareDetail || report?.isNewDCReport;
    
    // For DC reports, use reject API to remove from profile (not delete)
    if (isDCReport) {
      if (!confirm('Are you sure you want to remove this DC report from your profile? It will be removed but not deleted (DC reports are managed by the diagnostic center).')) {
        return;
      }

      const reportId = report?.id || report?._id;
      if (!reportId || !phoneNumber) {
        toast.error('Report ID and phone number are required');
        return;
      }

      setDeletingReportId(reportId);
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
          toast.success('DC report removed from your profile');
          
          // Refetch all reports queries to get updated data
          await Promise.all([
            queryClient.refetchQueries({ queryKey: ['getSharedReports'] }),
            queryClient.refetchQueries({ queryKey: ['getReportsFromDC'] }),
            queryClient.refetchQueries({ queryKey: ['getManyReports'] }),
          ]);
        } else {
          throw new Error(response.data.error?.message || 'Failed to remove report');
        }
      } catch (error: any) {
        console.error('Error removing DC report:', error);
        const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Unknown error';
        toast.error('Error removing report: ' + errorMessage);
      } finally {
        setDeletingReportId(null);
      }
      return;
    }

    // For non-DC reports, delete normally
    if (!confirm('Are you sure you want to delete this report?')) {
      return;
    }

    setDeletingReportId(report._id);
    try {
      await axios.delete(deleteReport, { data: { id: report._id } });
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

  const acceptDCReport = useAcceptSharedReport(
    () => {
      queryClient.invalidateQueries({ queryKey: ['getSharedReports'] });
      queryClient.invalidateQueries({ queryKey: ['getManyReports'] });
      queryClient.invalidateQueries({ queryKey: ['getPendingSharedReports'] });
      queryClient.invalidateQueries({ queryKey: ['getReportsFromDC'] });
      toast.success('Report accepted successfully!');
    },
    () => {}
  );

  const handleAcceptPendingReport = async (report: any) => {
    if (!phoneNumber) {
      toast.error('Phone number is required');
      return;
    }
    
    const reportId = report?.id || report?._id;
    if (!reportId) {
      toast.error('Report ID is required');
      return;
    }
    
    const isDCReport = report?.isDCReport || report?.shareDetail || report?.isNewDCReport;
    const isOmeraldShared = report?.isOmeraldSharedReport || report?.isSharedReport;
    
    setIsRefreshing(true);
    try {
      // Handle Omerald user shared reports - insert new report
      if (isOmeraldShared && !isDCReport) {
        const originalReportId = report.reportId || report._id || report.id;
        const normalizedPhone = phoneNumber.replace(/\s/g, '').replace(/\+/g, '');
        const uniqueReportId = `USER-${normalizedPhone}-ACCEPTED-${originalReportId}-${Date.now()}`;
        
        const reportData = {
          userId: phoneNumber,
          userName: report?.userName || `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || phoneNumber,
          reportId: uniqueReportId,
          originalReportId: originalReportId,
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

        const response = await axios.post(insertReport, reportData);
        if (response.data.success || response.data._id) {
          // Update original report to remove from sharedWith
          const originalReportIdForUpdate = report._id || report.id || report.reportId;
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
            await axios.put(`${updateReport}?id=${originalReportIdForUpdate}`, { 
              sharedWith: updatedSharedWith
            });
          } catch (error) {
            console.error('Error updating shared report:', error);
          }
          
          toast.success('Report accepted and added to your profile!');
        } else {
          throw new Error('Failed to accept report');
        }
      } 
      // Handle DC reports - use DC accept endpoint
      else if (isDCReport) {
        const response = await axios.post('/api/reports/accept', {
          reportId: reportId,
          userContact: phoneNumber
        }, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.data.success) {
          toast.success('Report accepted successfully');
        } else {
          throw new Error(response.data.error?.message || 'Failed to accept report');
        }
      }
      // Handle local/manual upload reports - update status
      else {
        const response = await axios.put(`${updateReport}?id=${reportId}`, { status: 'accepted' });
        if (response.status === 200 && response.data._id) {
          toast.success('Report accepted successfully');
        } else {
          throw new Error('Failed to accept report');
        }
      }
      
      // Invalidate and refetch all pending reports queries to ensure UI updates
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['getSharedReports'] }),
        queryClient.invalidateQueries({ queryKey: ['getReportsFromDC'] }),
        queryClient.invalidateQueries({ queryKey: ['getPendingSharedReports'] }),
        queryClient.invalidateQueries({ queryKey: ['getManyReports'] }),
      ]);
    } catch (error: any) {
      console.error('Error accepting report:', error);
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Unknown error';
      toast.error('Error accepting report: ' + errorMessage);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRejectPendingReport = async (report: any) => {
    if (!phoneNumber) {
      toast.error('Phone number is required');
      return;
    }
    
    const reportId = report?.id || report?._id;
    if (!reportId) {
      toast.error('Report ID is required');
      return;
    }
    
    const isDCReport = report?.isDCReport || report?.shareDetail || report?.isNewDCReport;
    const isOmeraldShared = report?.isOmeraldSharedReport || report?.isSharedReport;
    
    setIsRefreshing(true);
    try {
      // Handle Omerald user shared reports - remove from sharedWith
      if (isOmeraldShared && !isDCReport) {
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
          await axios.put(`${updateReport}?id=${reportId}`, { 
            sharedWith: updatedSharedWith
          });
          toast.success('Report rejected successfully');
        } catch (error: any) {
          console.error('Error rejecting shared report:', error);
          throw new Error(error.response?.data?.error?.message || 'Failed to reject report');
        }
      }
      // Handle DC reports - use DC reject endpoint
      else if (isDCReport) {
        const response = await axios.post('/api/reports/reject', {
          reportId: reportId,
          userContact: phoneNumber
        }, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.data.success) {
          toast.success('Report rejected successfully');
        } else {
          throw new Error(response.data.error?.message || 'Failed to reject report');
        }
      }
      // Handle local/manual upload reports - update status or delete
      else {
        try {
          await axios.put(`${updateReport}?id=${reportId}`, { status: 'rejected' });
          toast.success('Report rejected successfully');
        } catch (error: any) {
          // If update fails, try deleting
          try {
            await axios.delete(deleteReport, { data: { id: reportId } });
            toast.success('Report removed successfully');
          } catch (deleteError: any) {
            throw new Error(deleteError.response?.data?.error?.message || 'Failed to reject report');
          }
        }
      }
      
      // Invalidate and refetch all pending reports queries to ensure UI updates
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['getSharedReports'] }),
        queryClient.invalidateQueries({ queryKey: ['getReportsFromDC'] }),
        queryClient.invalidateQueries({ queryKey: ['getPendingSharedReports'] }),
        queryClient.invalidateQueries({ queryKey: ['getManyReports'] }),
      ]);
    } catch (error: any) {
      console.error('Error rejecting report:', error);
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Unknown error';
      toast.error('Error rejecting report: ' + errorMessage);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Calculate reports remaining
  // Only count local reports (user-uploaded) towards the limit, not DC shared reports
  const subscription = profile?.subscription || 'Free';
  const reportsLimit = getReportsLimit(subscription);
  // Count only accepted local reports (user-uploaded), exclude DC shared reports
  const acceptedLocalReports = localReports.filter((r: any) => r.status === 'accepted' || !r.status);
  const currentReportsCount = acceptedLocalReports.length;
  const reportsRemaining = Math.max(0, reportsLimit - currentReportsCount);
  const subscriptionPlan = getSubscriptionPlan(subscription);
  
  console.log('Reports count calculation:', {
    subscription,
    reportsLimit,
    localReportsCount: localReports.length,
    acceptedLocalReportsCount: acceptedLocalReports.length,
    currentReportsCount,
    reportsRemaining,
    totalReportsIncludingDC: reports.length,
  });

  return (
    <div className="space-y-6 w-full overflow-x-hidden">
      {/* Reports Remaining Indicator */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-2 border-blue-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <DocumentIcon className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700">Reports Remaining</h3>
            <p className="text-2xl font-bold text-gray-900">{reportsRemaining} / {reportsLimit}</p>
            <p className="text-xs text-gray-500 mt-1">{subscriptionPlan.name} Plan</p>
          </div>
        </div>
        {reportsRemaining === 0 && (
          <div className="px-4 py-2 bg-orange-100 border border-orange-300 rounded-lg">
            <p className="text-sm font-semibold text-orange-800">Limit Reached</p>
          </div>
        )}
      </div>

      {/* Pending Reports Section - Always show, even if empty */}
      {pendingReports.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 w-full overflow-hidden">
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setIsPendingReportsExpanded(!isPendingReportsExpanded)}
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <ClockIcon className="w-5 h-5 text-gray-500" />
                {pendingReports.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-[10px] text-white font-semibold">{pendingReports.length}</span>
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-base font-medium text-gray-900">
                  Pending Reports
                </h3>
              </div>
            </div>
            <button
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              aria-label={isPendingReportsExpanded ? 'Collapse' : 'Expand'}
            >
              {isPendingReportsExpanded ? (
                <ChevronUpIcon className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDownIcon className="w-4 h-4 text-gray-500" />
              )}
            </button>
          </div>

          {isPendingReportsExpanded && (
            <>
              {isLoadingPending ? (
            <div className="flex items-center justify-center py-8 mt-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
            </div>
          ) : pendingReports.length > 0 ? (
            <div className="space-y-3 mt-4">
              {pendingReports.map((report: any, index: number) => {
                const isDCReport = report?.isDCReport || report?.shareDetail;
                const isOmeraldShared = report?.isOmeraldSharedReport || report?.isSharedReport;
                
                return (
                  <div
                    key={report._id || report.id || index}
                    className="bg-gray-50 rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
                            <EyeIcon className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 text-base mb-1">
                              {report.name || report.testName || 'Report'}
                            </h4>
                            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 mb-2">
                              <span className="flex items-center gap-1">
                                <span className="font-medium">From:</span>
                                {isDCReport ? (
                                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
                                    {typeof report.diagnosticCenter === 'string' 
                                      ? report.diagnosticCenter 
                                      : typeof report.diagnosticCenter === 'object' && report.diagnosticCenter?.diagnostic?.name
                                        ? report.diagnosticCenter.diagnostic.name
                                        : 'Diagnostic Center'}
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                                    {report.createdBy || report.sharedBy || 'User'}
                                  </span>
                                )}
                              </span>
                              <span>•</span>
                              <span>{moment(report.uploadDate || report.sharedAt).fromNow()}</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {/* Report Type - hidden */}
                              {/* <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                                {getReportTypeDisplayName(report)}
                              </span> */}
                              {isDCReport && (
                                <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-xs font-medium">
                                  {report.isDCShared ? 'DC Shared' : 'From DC'}
                                </span>
                              )}
                              {isOmeraldShared && !isDCReport && (
                                <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                                  From User
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                        <button
                          onClick={() => handleViewReport(report)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                        >
                          <EyeIcon className="w-4 h-4" />
                          <span>Review</span>
                        </button>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAcceptPendingReport(report)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium flex-1 sm:flex-initial"
                          >
                            <CheckCircleIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">Accept</span>
                          </button>
                          <button
                            onClick={() => handleRejectPendingReport(report)}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                          >
                            <XCircleIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">Reject</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
            </>
          )}
        </div>
      )}

      {/* Reports Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 sm:p-6 w-full overflow-hidden">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
            <span>📋 Reports ({filteredReports.length})</span>
          </h3>
          
          {/* Search, Filter, and Upload Button */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="relative flex-1 min-w-0">
              <input
                type="search"
                placeholder="Search reports..."
                onChange={debouncedSearch}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm sm:text-base"
              />
              <svg
                className="absolute left-3 top-2.5 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            {/* Mobile Source Filter */}
            <div className="md:hidden">
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value as 'all' | 'my-upload' | 'dc-shared' | 'user-shared')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm sm:text-base"
              >
                <option value="all">All Sources</option>
                <option value="my-upload">My Upload</option>
                <option value="dc-shared">DC Shared</option>
                <option value="user-shared">User Shared</option>
              </select>
            </div>
            <button
              onClick={() => {
                // If a member was selected, use that member's info, otherwise use current profile
                if (!selectedMemberForUpload && profile) {
                  setSelectedMemberForUpload({
                    phoneNumber: profile.phoneNumber,
                    name: `${profile.firstName || ''} ${profile.lastName || ''}`.trim(),
                  });
                }
                setShowAddModal(true);
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base whitespace-nowrap flex-shrink-0"
            >
              <span className="text-lg sm:text-xl">+</span>
              <span className="hidden sm:inline">Upload Reports</span>
              <span className="sm:hidden">Upload</span>
            </button>
          </div>
        </div>
        {filteredReports.length > 0 ? (
          <>
            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {filteredReports.map((report: any, index: number) => {
                const sharedWith = report.sharedWith || [];
                const isDCReport = report?.isDCReport || report?.shareDetail;
                // Get member/patient name - for DC reports show patient name, for regular reports show member name
                const memberName = isDCReport 
                  ? (report.patient?.name || report.userName || 'N/A')
                  : (report.userName || 'N/A');
                return (
                  <div key={report._id || report.id || index} className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-3">
                    {/* Report Name and Actions */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                          {report.name || report.testName || report.type || 'Report'}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1">{formatDate(report.reportDate || report.uploadDate)}</p>
                        <p className="text-xs text-gray-600 mt-1">
                          <span className="font-medium">Patient:</span> {memberName}
                        </p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button 
                          onClick={() => handleViewReport(report)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="View"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        {!isDCReport && (
                          <>
                            <button 
                              onClick={() => handleEditReport(report)}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="Edit"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleShareReport(report)}
                              className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                              title="Share"
                            >
                              <ShareIcon className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteReport(report)}
                              disabled={deletingReportId === report._id}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                              title="Delete"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {isDCReport && (
                          <button 
                            onClick={() => handleDeleteReport(report)}
                            disabled={deletingReportId === report._id || deletingReportId === report.id}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                            title="Remove from profile (DC reports are managed by diagnostic center)"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Report Type and Source */}
                    <div className="flex flex-wrap gap-2 items-center">
                      {/* Report Type - hidden */}
                      {/* <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                        {getReportTypeDisplayName(report)}
                      </span> */}
                      {(() => {
                        const sourceType = getReportSourceType(report);
                        if (sourceType === 'dc-shared') {
                          const dcName = typeof report.diagnosticCenter === 'string' 
                            ? report.diagnosticCenter 
                            : typeof report.diagnosticCenter === 'object' && report.diagnosticCenter?.diagnostic?.name
                              ? report.diagnosticCenter.diagnostic.name
                              : 'Diagnostic Center';
                          return (
                            <span 
                              className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-xs font-medium" 
                              title={`From ${dcName}${report.branch ? ` - ${report.branch}` : ''}`}
                            >
                              DC Shared ({dcName})
                            </span>
                          );
                        } else if (sourceType === 'user-shared') {
                          // Get name and phone separately
                          const userName = report.sharedBy || report.sharedByUser || report.userName || report.createdBy || 'Unknown';
                          const userPhone = report.userId || report.sharedByPhone || '';
                          
                          // Normalize phone numbers for comparison
                          const normalizePhone = (phone: string) => {
                            if (!phone) return '';
                            return phone.replace(/\s/g, '').replace(/[^\d+]/g, '');
                          };
                          
                          const normalizedUserName = normalizePhone(userName);
                          const normalizedUserPhone = normalizePhone(userPhone);
                          
                          // Check if userName is actually a phone number (starts with + or is all digits)
                          const isUserNamePhone = userName && (userName.startsWith('+') || /^[\d\s\-\(\)]+$/.test(userName));
                          
                          // Format: Name (Phone) or just Phone if userName is also a phone
                          let displayText = userName;
                          if (userPhone && userPhone !== 'Unknown') {
                            const formattedPhone = userPhone.startsWith('+') ? userPhone : `+${userPhone}`;
                            
                            // If userName is the same as userPhone (normalized), just show phone once
                            if (normalizedUserName === normalizedUserPhone || isUserNamePhone) {
                              displayText = formattedPhone;
                            } else if (userName && userName !== 'Unknown') {
                              // Show Name (Phone) if we have a real name
                              displayText = `${userName} (${formattedPhone})`;
                            } else {
                              // Just show phone if no name
                              displayText = formattedPhone;
                            }
                          }
                          
                          return (
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                              User Shared ({displayText})
                            </span>
                          );
                        } else {
                          return (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                              My Upload
                            </span>
                          );
                        }
                      })()}
                    </div>

                    {/* Shared With */}
                    <div className="pt-2 border-t border-gray-200">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 font-medium">Shared with:</span>
                        {sharedWith.length > 0 ? (
                          <div className="flex flex-wrap gap-1 flex-1">
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
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto w-full">
              <table className="w-full min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Patient</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Report Name</th>
                    {/* Report Type column hidden for now */}
                    {/* <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Report Type</th> */}
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                      <div className="flex items-center gap-2">
                        <span>Source</span>
                        <select
                          value={sourceFilter}
                          onChange={(e) => setSourceFilter(e.target.value as 'all' | 'my-upload' | 'dc-shared' | 'user-shared')}
                          className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="all">All</option>
                          <option value="my-upload">My Upload</option>
                          <option value="dc-shared">DC Shared</option>
                          <option value="user-shared">User Shared</option>
                        </select>
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Shared With</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map((report: any, index: number) => {
                    const sharedWith = report.sharedWith || [];
                    const isDCReport = report?.isDCReport || report?.shareDetail;
                    // Get member/patient name - for DC reports show patient name, for regular reports show member name
                    const memberName = isDCReport 
                      ? (report.patient?.name || report.userName || 'N/A')
                      : (report.userName || 'N/A');
                    return (
                      <tr key={report._id || report.id || index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-700">{memberName}</td>
                        <td className="py-3 px-4 text-sm">{report.name || report.testName || report.type || 'Report'}</td>
                        {/* Report Type column hidden for now */}
                        {/* <td className="py-3 px-4 text-sm">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                            {getReportTypeDisplayName(report)}
                          </span>
                        </td> */}
                        <td className="py-3 px-4 text-sm text-gray-600">{formatDate(report.reportDate || report.uploadDate)}</td>
                        <td className="py-3 px-4 text-sm">
                          {(() => {
                            const sourceType = getReportSourceType(report);
                            if (sourceType === 'dc-shared') {
                              const dcName = typeof report.diagnosticCenter === 'string' 
                                ? report.diagnosticCenter 
                                : typeof report.diagnosticCenter === 'object' && report.diagnosticCenter?.diagnostic?.name
                                  ? report.diagnosticCenter.diagnostic.name
                                  : 'Diagnostic Center';
                              return (
                                <span 
                                  className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-xs font-medium" 
                                  title={`From ${dcName}${report.branch ? ` - ${report.branch}` : ''}`}
                                >
                                  DC Shared ({dcName})
                                </span>
                              );
                            } else if (sourceType === 'user-shared') {
                              // Get name and phone separately
                              const userName = report.sharedBy || report.sharedByUser || report.userName || report.createdBy || 'Unknown';
                              const userPhone = report.userId || report.sharedByPhone || '';
                              
                              // Normalize phone numbers for comparison
                              const normalizePhone = (phone: string) => {
                                if (!phone) return '';
                                return phone.replace(/\s/g, '').replace(/[^\d+]/g, '');
                              };
                              
                              const normalizedUserName = normalizePhone(userName);
                              const normalizedUserPhone = normalizePhone(userPhone);
                              
                              // Check if userName is actually a phone number (starts with + or is all digits)
                              const isUserNamePhone = userName && (userName.startsWith('+') || /^[\d\s\-\(\)]+$/.test(userName));
                              
                              // Format: Name (Phone) or just Phone if userName is also a phone
                              let displayText = userName;
                              if (userPhone && userPhone !== 'Unknown') {
                                const formattedPhone = userPhone.startsWith('+') ? userPhone : `+${userPhone}`;
                                
                                // If userName is the same as userPhone (normalized), just show phone once
                                if (normalizedUserName === normalizedUserPhone || isUserNamePhone) {
                                  displayText = formattedPhone;
                                } else if (userName && userName !== 'Unknown') {
                                  // Show Name (Phone) if we have a real name
                                  displayText = `${userName} (${formattedPhone})`;
                                } else {
                                  // Just show phone if no name
                                  displayText = formattedPhone;
                                }
                              }
                              
                              return (
                                <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                                  User Shared ({displayText})
                                </span>
                              );
                            } else {
                              return (
                                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                  My Upload
                                </span>
                              );
                            }
                          })()}
                        </td>
                        <td className="py-3 px-4 text-sm">
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
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleViewReport(report)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="View"
                            >
                              <EyeIcon className="w-4 h-4" />
                            </button>
                            {!isDCReport && (
                              <>
                                <button 
                                  onClick={() => handleEditReport(report)}
                                  className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                                  title="Edit"
                                >
                                  <PencilIcon className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleShareReport(report)}
                                  className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                                  title="Share"
                                >
                                  <ShareIcon className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteReport(report)}
                                  disabled={deletingReportId === report._id}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                                  title="Delete"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            {isDCReport && (
                              <button 
                                onClick={() => handleDeleteReport(report)}
                                disabled={deletingReportId === report._id || deletingReportId === report.id}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                                title="Remove from profile (DC reports are managed by diagnostic center)"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-gray-500 text-center py-8 text-sm sm:text-base">No reports available</p>
        )}
      </div>

      {/* Add Report Modal */}
      {showAddModal && (
        <AddReportModal
          visible={showAddModal}
          setVisible={(visible) => {
            setShowAddModal(visible);
            // Clear selected member when modal closes
            if (!visible) {
              setSelectedMemberForUpload(null);
              setMemberDetail('');
            }
          }}
          memberPhoneNumber={selectedMemberForUpload?.phoneNumber}
          memberName={selectedMemberForUpload?.name}
          onReportAdded={() => {
            queryClient.invalidateQueries({ queryKey: ['getManyReports'] });
            setSelectedMemberForUpload(null);
            setMemberDetail('');
          }}
        />
      )}

      {/* View Report Modal */}
      {showViewModal && selectedReport && (
        <ViewReportModal
          visible={showViewModal}
          setVisible={setShowViewModal}
          report={selectedReport}
          showActions={selectedReport?.status === 'pending' || selectedReport?.shareDetail?.accepted === false}
          onAccept={() => {
            handleAcceptPendingReport(selectedReport);
            setShowViewModal(false);
          }}
          onReject={() => {
            handleRejectPendingReport(selectedReport);
            setShowViewModal(false);
          }}
        />
      )}

      {/* Edit Report Modal */}
      {showEditModal && selectedReport && !selectedReport?.isDCReport && (
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
      {showShareModal && selectedReport && profile && !selectedReport?.isDCReport && (
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
    </div>
  );
}

