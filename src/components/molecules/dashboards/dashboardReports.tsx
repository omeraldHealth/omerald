import React, { useState, useMemo, useEffect } from 'react';
import { useSetRecoilState } from 'recoil';
import { dashTabs } from '@/components/common/recoil/dashboard';
import moment from 'moment';
import { useAuthContext } from '@/components/common/utils/context/auth.context';
import toast from 'react-hot-toast';
import { updateReport, insertReport, getSignedUrl } from '@/components/common/lib/constants/urls';
import axios from 'axios';
import ViewReportModal from '@/components/molecules/ViewReportModal';
import { useQueryClient } from '@tanstack/react-query';
import { useAcceptSharedReport, useGetReportsFromDC, useGetPendingSharedReports } from '@/hooks/reactQuery/reports';
import { SharedReport, ReportWithSharedDetails } from '@/services/reportSharingService';
import { getDiagnosticCenterNames, getBranchNames } from '@/services/diagnosticCenterService';
import { ChevronDownIcon, ChevronUpIcon, ClockIcon, DocumentIcon, BuildingOfficeIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';

export const DashboardReports = () => {
  const { profile, phoneNumber } = useAuthContext();
  const setDash = useSetRecoilState(dashTabs);
  const queryClient = useQueryClient();

  let users = [profile?.phoneNumber];
  profile?.members?.forEach((member: any) => {
    users.push(member.phoneNumber);
  });

  const [selectedReport, setSelectedReport] = React.useState<any>(null);
  const [showViewModal, setShowViewModal] = React.useState(false);

  // Fetch pending shared reports from omerald users (shared WITH the user)
  const { data: omeraldPendingSharedReports, isLoading: isLoadingOmeraldShared, refetch: refetchOmeraldPending } = useGetPendingSharedReports(
    phoneNumber || undefined
  );

  // Fetch reports from DC app endpoint (single source - includes both pending and approved, filtered client-side)
  const { data: dcReportsData, isLoading: isLoadingDCReports, refetch: refetchDCReports } = useGetReportsFromDC(
    phoneNumber || undefined
  );

  // Refetch pending reports when component mounts or phoneNumber changes
  React.useEffect(() => {
    if (phoneNumber) {
      refetchOmeraldPending();
      refetchDCReports();
    }
  }, [phoneNumber, refetchOmeraldPending, refetchDCReports]);

  // Cache for DC and branch names
  const [dcNamesMap, setDcNamesMap] = React.useState<Map<string, string>>(new Map());
  const [branchNamesMap, setBranchNamesMap] = React.useState<Map<string, string>>(new Map());
  
  // Collapsible state for pending reports
  const [isPendingReportsExpanded, setIsPendingReportsExpanded] = React.useState<boolean>(true);
  
  // Loading state for refreshing pending reports after accept/reject
  const [isRefreshing, setIsRefreshing] = React.useState<boolean>(false);

  // Fetch DC and branch names for new DC reports
  React.useEffect(() => {
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

      const [dcNames, branchNames] = await Promise.all([
        getDiagnosticCenterNames(Array.from(dcIds)),
        getBranchNames(Array.from(branchIds)),
      ]);

      setDcNamesMap(dcNames);
      setBranchNamesMap(branchNames);
    };

    fetchNames();
  }, [dcReportsData]);

  // Transform omerald user shared reports to match component structure
  const omeraldPendingReports = React.useMemo(() => {
    if (!omeraldPendingSharedReports) {
      console.log('No omerald pending shared reports data');
      return [];
    }
    if (!Array.isArray(omeraldPendingSharedReports)) {
      console.warn('Omerald pending shared reports is not an array:', omeraldPendingSharedReports);
      return [];
    }
    console.log('Processing omerald pending reports:', omeraldPendingSharedReports.length);
    return omeraldPendingSharedReports
      .filter((report: any) => {
        const reportId = report.reportId || report._id?.toString() || report.id;
        if (!reportId) {
          console.warn('Report missing ID:', report);
        }
        return reportId;
      })
      .map((report: any) => ({
        ...report,
        _id: report._id || report.reportId || report.id,
        id: report.id || report.reportId || report._id?.toString(),
        // Ensure all required fields are present
        name: report.name || report.testName || 'Report',
        testName: report.testName || report.name || 'Report',
        type: report.type || report.documentType || 'Report',
        documentType: report.documentType || report.type || 'Report',
        diagnosticCenter: report.diagnosticCenter || 'User Generated',
        createdBy: report.sharedBy || report.userName || report.createdBy || 'Unknown',
        uploadDate: report.sharedAt || report.uploadDate || report.uploadedAt || new Date().toISOString(),
        reportDate: report.reportDate || report.uploadDate || report.uploadedAt,
        status: 'pending',
        reportUrl: report.reportUrl || report.reportDoc || '',
        reportDoc: report.reportDoc || report.reportUrl || '',
        // Mark as shared report from omerald user
        isOmeraldSharedReport: true,
        isSharedReport: true,
      }));
  }, [omeraldPendingSharedReports]);

  // Transform DC reports (single source - filtered for pending status: accepted === false && rejected !== true)
  const dcPendingReports = React.useMemo(() => {
    if (!dcReportsData?.reports) return [];
    
    // Normalize phone number for comparison
    const normalizePhone = (phone: string) => {
      if (!phone) return '';
      return phone.replace(/\s/g, '').startsWith('+') ? phone.replace(/\s/g, '') : `+${phone.replace(/\s/g, '')}`;
    };
    const normalizedUserPhone = phoneNumber ? normalizePhone(phoneNumber) : '';
    
    // Filter for pending reports: accepted === false && rejected !== true
    return dcReportsData.reports
      .filter((dcReport: ReportWithSharedDetails) => {
        if (!dcReport.sharedReportDetails || !Array.isArray(dcReport.sharedReportDetails)) return false;
        
        const shareDetail = dcReport.sharedReportDetails.find(
          (detail) => {
            const normalizedDetailPhone = normalizePhone(detail.userContact || '');
            return normalizedDetailPhone === normalizedUserPhone && 
                   detail.accepted === false && 
                   (detail.rejected === false || detail.rejected === undefined || detail.rejected === null);
          }
        );
        
        return !!shareDetail;
      })
      .map((dcReport: ReportWithSharedDetails) => {
        // Find the share detail for this user (with normalized comparison)
        const shareDetail = dcReport.sharedReportDetails?.find(
          (detail) => {
            const normalizedDetailPhone = normalizePhone(detail.userContact || '');
            return normalizedDetailPhone === normalizedUserPhone && 
                   detail.accepted === false && 
                   (detail.rejected === false || detail.rejected === undefined || detail.rejected === null);
          }
        );
        
        // Return null if no matching shareDetail found (will be filtered out)
        if (!shareDetail) return null;
        
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
          // Map DC report structure to local structure
          name: dcReport.reportData?.reportName || 'Report',
          testName: dcReport.reportData?.reportName || 'Report',
          // Preserve original diagnosticCenter structure for DC ID extraction (for API calls)
          diagnosticCenter: dcReport.diagnosticCenter || {
            diagnostic: typeof diagnostic === 'string' ? diagnostic : (diagnostic as any)?.id,
            branch: typeof branch === 'string' ? branch : (branch as any)?.id
          },
          // Store display name as string to prevent [object Object] issue
          diagnosticCenterName: diagnosticCenterName,
          // Store IDs for easier access
          diagnosticCenterId: typeof diagnostic === 'string' 
            ? diagnostic 
            : (diagnostic as any)?.id,
          branchId: typeof branch === 'string' 
            ? branch 
            : (branch as any)?.id,
          // Display names (will be fetched by DiagnosticReport)
          branch: branchName,
          createdBy: dcReport.pathologist?.name || diagnosticCenterName,
          uploadDate: shareDetail?.sharedAt || dcReport.reportData?.reportDate || new Date().toISOString(),
          reportDate: dcReport.reportData?.reportDate,
          status: 'pending',
          // Ensure reportUrl is set for PDF/image viewing
          reportUrl: dcReport.reportData?.url || dcReport.reportData?.pdfUrl || dcReport.reportData?.imageUrl || dcReport.reportData?.parsedData?.components?.[0]?.images?.[0],
          reportDoc: dcReport.reportData?.url || dcReport.reportData?.pdfUrl || dcReport.reportData?.imageUrl,
          fileType: dcReport.reportData?.fileType || (dcReport.reportData?.pdfUrl ? 'pdf' : (dcReport.reportData?.url ? 'pdf' : 'image')),
          parsedData: dcReport.reportData?.parsedData,
          // Mark as DC report
          isDCReport: true,
          isNewDCReport: true, // Flag to identify new endpoint reports
          shareDetail: shareDetail,
          sharedReportDetails: dcReport.sharedReportDetails,
          patient: dcReport.patient,
          // Additional fields
          userName: dcReport.patient?.name || (profile?.firstName && profile?.lastName 
            ? `${profile.firstName} ${profile.lastName}` 
            : phoneNumber || 'User'),
          type: testName,
          documentType: testName,
        };
      })
      .filter((report: any) => report !== null); // Filter out reports without matching shareDetail
  }, [dcReportsData, phoneNumber, profile, dcNamesMap, branchNamesMap]);

  // Merge all pending reports and deduplicate by report ID
  const allPendingReports = [...omeraldPendingReports, ...dcPendingReports];
  const pendingReportsMap = new Map();
  allPendingReports.forEach((report: any) => {
    const reportId = report.id || report._id || report.reportId;
    if (reportId && !pendingReportsMap.has(reportId)) {
      pendingReportsMap.set(reportId, report);
    }
  });
  const pendingReports = Array.from(pendingReportsMap.values());
  const isLoading = isLoadingOmeraldShared || isLoadingDCReports || isRefreshing;

  // Debug logging (remove in production)
  React.useEffect(() => {
    if (phoneNumber) {
      console.log('Pending Reports Debug:', {
        phoneNumber,
        omeraldPendingReports: omeraldPendingReports.length,
        dcPendingReports: dcPendingReports.length,
        totalPending: pendingReports.length,
        isLoading,
        dcReportsData: dcReportsData?.reports?.length || 0,
        omeraldPendingSharedReports: omeraldPendingSharedReports?.length || 0,
      });
    }
  }, [phoneNumber, omeraldPendingReports.length, dcPendingReports.length, pendingReports.length, isLoading, dcReportsData, omeraldPendingSharedReports]);

  return (
    <>
      <div className="w-full max-w-full bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3 sm:gap-0">
          <div 
            className="flex items-center gap-3 cursor-pointer flex-1"
            onClick={() => setIsPendingReportsExpanded(!isPendingReportsExpanded)}
          >
            <div className="relative">
              <ClockIcon className="w-5 h-5 text-gray-500" />
              {pendingReports.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-[10px] text-white font-semibold">{pendingReports.length}</span>
                </span>
              )}
            </div>
            <h3 className="text-base sm:text-lg font-medium text-gray-900">Pending Reports</h3>
            <button
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              aria-label={isPendingReportsExpanded ? 'Collapse' : 'Expand'}
              onClick={(e) => {
                e.stopPropagation();
                setIsPendingReportsExpanded(!isPendingReportsExpanded);
              }}
            >
              {isPendingReportsExpanded ? (
                <ChevronUpIcon className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDownIcon className="w-4 h-4 text-gray-500" />
              )}
            </button>
          </div>
          <button
            onClick={(e) => {
              e.preventDefault();
              setDash('Reports');
            }}
            className="inline-flex items-center justify-center px-4 sm:px-5 py-2 sm:py-2.5 bg-gray-900 text-white text-sm sm:text-base font-medium rounded-lg hover:bg-gray-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            View More
            <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        {isPendingReportsExpanded && (
        <div>
          {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-700"></div>
          </div>
        ) : pendingReports.length > 0 ? (
          <div className="w-full overflow-x-auto mobile-scroll">
            <div className="flex gap-3 sm:gap-4 mt-3 bg-gray-50 rounded-lg border border-gray-200 py-3 sm:py-4 min-w-max sm:min-w-0">
              {pendingReports.map((report: any, index: number) => (
                <PendingReportAcceptance 
                  key={index} 
                  report={report}
                  onView={(report) => {
                    // #region agent log
                    fetch('http://127.0.0.1:7243/ingest/2fbc7e35-288c-4e48-8204-8ecc0d034a57',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboardReports.tsx:409',message:'onView called - report data',data:{reportId:report?.id||report?._id,hasReportUrl:!!report?.reportUrl,hasReportDoc:!!report?.reportDoc,reportUrl:report?.reportUrl?.substring?.(0,100),reportDoc:report?.reportDoc?.substring?.(0,100),isOmeraldShared:report?.isOmeraldSharedReport||report?.isSharedReport,isDCReport:report?.isDCReport||!!report?.shareDetail,reportKeys:Object.keys(report||{}).slice(0,20)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                    // #endregion
                    setSelectedReport(report);
                    setShowViewModal(true);
                  }}
                  onAccept={async (report) => {
                    if (!phoneNumber) {
                      toast.error('Phone number is required');
                      return;
                    }
                    
                    const reportId = report?.id || report?._id;
                    if (!reportId) {
                      toast.error('Report ID is required');
                      return;
                    }
                    
                    // Check if this is an Omerald user shared report
                    const isOmeraldShared = report?.isOmeraldSharedReport || report?.isSharedReport;
                    const isDCReport = report?.isDCReport || report?.shareDetail;
                    
                    setIsRefreshing(true);
                    try {
                      // Handle Omerald user shared reports differently
                      if (isOmeraldShared && !isDCReport) {
                        // Get the original reportId
                        const originalReportId = report.reportId || report._id || report.id;
                        
                        // Generate a unique reportId for this user (includes userId to ensure uniqueness)
                        // Format: USER-{phoneNumber}-ACCEPTED-{originalReportId}-{timestamp}
                        const normalizedPhone = phoneNumber.replace(/\s/g, '').replace(/\+/g, '');
                        const uniqueReportId = `USER-${normalizedPhone}-ACCEPTED-${originalReportId}-${Date.now()}`;
                        
                        // Insert the report into local database
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
                          diagnosticCenter: report.diagnosticCenter || 'User Generated',
                          createdBy: phoneNumber,
                          updatedBy: phoneNumber,
                          parsedData: report.parsedData || [],
                        };

                        const insertResponse = await axios.post(insertReport, reportData);
                        if (insertResponse.data.success || insertResponse.data._id) {
                          // Update the original report to remove from sharedWith array
                          const originalReportId = report._id || report.id || report.reportId;
                          const sharedWith = report.sharedWith || [];
                          // Remove this user from sharedWith array
                          const normalizedUserPhone = phoneNumber.replace(/\s/g, '').startsWith('+') 
                            ? phoneNumber.replace(/\s/g, '') 
                            : `+${phoneNumber.replace(/\s/g, '')}`;
                          
                          const updatedSharedWith = sharedWith.filter((share: any) => {
                            const sharePhone = (share.phoneNumber || '').replace(/\s/g, '');
                            const normalizedSharePhone = sharePhone.startsWith('+') ? sharePhone : `+${sharePhone}`;
                            return normalizedSharePhone !== normalizedUserPhone;
                          });
                          
                          try {
                            // Update the report with new sharedWith array
                            await axios.put(`${updateReport}?id=${originalReportId}`, { 
                              sharedWith: updatedSharedWith
                            });
                          } catch (error) {
                            console.error('Error updating shared report:', error);
                            // Continue even if update fails
                          }
                          
                          toast.success('Report accepted and added to your profile!');
                          // Refetch all pending reports queries and wait for completion
                          await Promise.all([
                            queryClient.refetchQueries({ queryKey: ['getManyReports'] }),
                            queryClient.refetchQueries({ queryKey: ['getPendingSharedReports'] }),
                            queryClient.refetchQueries({ queryKey: ['getReportsFromDC'] }),
                            queryClient.refetchQueries({ queryKey: ['getSharedReports'] }), // Also refetch for Reports tab
                          ]);
                          // Small delay to ensure UI updates before navigation
                          await new Promise(resolve => setTimeout(resolve, 300));
                          // Navigate to Reports tab
                          setDash('Reports');
                        } else {
                          throw new Error('Failed to accept report. Please try again.');
                        }
                      } else {
                        // Handle DC reports - call Next.js API route (server-side proxy to avoid CORS)
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
                          
                          // Refetch all pending and approved reports queries and wait for completion
                          await Promise.all([
                            queryClient.refetchQueries({ queryKey: ['getReportsFromDC'] }),
                            queryClient.refetchQueries({ queryKey: ['getPendingSharedReports'] }),
                            queryClient.refetchQueries({ queryKey: ['getManyReports'] }),
                            queryClient.refetchQueries({ queryKey: ['getSharedReports'] }), // Also refetch for Reports tab
                          ]);
                          // Small delay to ensure UI updates before navigation
                          await new Promise(resolve => setTimeout(resolve, 300));
                          // Navigate to Reports tab
                          setDash('Reports');
                        } else {
                          throw new Error(response.data.error?.message || 'Failed to accept report');
                        }
                      }
                    } catch (error: any) {
                      console.error('Error accepting report:', error);
                      const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Unknown error';
                      toast.error('Error accepting report: ' + errorMessage);
                    } finally {
                      setIsRefreshing(false);
                    }
                  }}
                  onReject={async (report) => {
                    // Show confirmation dialog before rejecting
                    if (!confirm('Are you sure you want to reject this report? It will be removed from your pending reports.')) {
                      return;
                    }
                    
                    if (!phoneNumber) {
                      toast.error('Phone number is required');
                      return;
                    }
                    
                    const reportId = report?.id || report?._id;
                    if (!reportId) {
                      toast.error('Report ID is required');
                      return;
                    }
                    
                    // Check if this is an Omerald user shared report
                    const isOmeraldShared = report?.isOmeraldSharedReport || report?.isSharedReport;
                    const isDCReport = report?.isDCReport || report?.shareDetail;
                    
                    setIsRefreshing(true);
                    try {
                      // Handle Omerald user shared reports differently
                      if (isOmeraldShared && !isDCReport) {
                        // Update the original report to remove from sharedWith array
                        const originalReportId = report._id || report.id || report.reportId;
                        const sharedWith = report.sharedWith || [];
                        // Remove this user from sharedWith array
                        const normalizedUserPhone = phoneNumber.replace(/\s/g, '').startsWith('+') 
                          ? phoneNumber.replace(/\s/g, '') 
                          : `+${phoneNumber.replace(/\s/g, '')}`;
                        
                        const updatedSharedWith = sharedWith.filter((share: any) => {
                          const sharePhone = (share.phoneNumber || '').replace(/\s/g, '');
                          const normalizedSharePhone = sharePhone.startsWith('+') ? sharePhone : `+${sharePhone}`;
                          return normalizedSharePhone !== normalizedUserPhone;
                        });
                        
                        // Update the report with new sharedWith array
                        const response = await axios.put(`${updateReport}?id=${originalReportId}`, { 
                          sharedWith: updatedSharedWith
                        });
                        
                        if (response.status === 200) {
                          toast.success('Report rejected');
                          // Refetch all pending reports queries
                          await Promise.all([
                            queryClient.refetchQueries({ queryKey: ['getManyReports'] }),
                            queryClient.refetchQueries({ queryKey: ['getPendingSharedReports'] }),
                            queryClient.refetchQueries({ queryKey: ['getReportsFromDC'] }),
                          ]);
                        } else {
                          throw new Error('Failed to reject report');
                        }
                      } else {
                        // Handle DC reports - call Next.js API route (server-side proxy to avoid CORS)
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
                          
                          // Invalidate and refetch all pending and approved reports queries to ensure UI updates
                          await Promise.all([
                            queryClient.invalidateQueries({ queryKey: ['getReportsFromDC'] }),
                            queryClient.invalidateQueries({ queryKey: ['getPendingSharedReports'] }),
                            queryClient.invalidateQueries({ queryKey: ['getManyReports'] }),
                          ]);
                        } else {
                          throw new Error(response.data.error?.message || 'Failed to reject report');
                        }
                      }
                    } catch (error: any) {
                      console.error('Error rejecting report:', error);
                      const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Unknown error';
                      toast.error('Error rejecting report: ' + errorMessage);
                    } finally {
                      setIsRefreshing(false);
                    }
                  }}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm sm:text-base text-gray-500 font-medium">No Pending Reports</p>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">All reports have been processed</p>
          </div>
        )}
        </div>
      )}
      </div>

      {/* View Report Modal - Rendered outside scrollable container */}
      {showViewModal && selectedReport && (
        <ReportModalWrapper
          visible={showViewModal}
          setVisible={setShowViewModal}
          report={selectedReport}
          phoneNumber={phoneNumber}
          profile={profile}
          setIsRefreshing={setIsRefreshing}
        />
      )}
    </>
  );
};

const PendingReportAcceptance = ({ 
  report, 
  onView, 
  onAccept, 
  onReject 
}: { 
  report: any; 
  onView: (report: any) => void;
  onAccept: (report: any) => void;
  onReject: (report: any) => void;
}) => {
  const [signedUrls, setSignedUrls] = useState<{ [key: string]: string }>({});
  const [imageErrors, setImageErrors] = useState<{ [key: string]: boolean }>({});
  const [missingFiles, setMissingFiles] = useState<{ [key: string]: boolean }>({});

  // Check if this is a DC report (has shareDetail property)
  const isDCReport = report?.isDCReport || report?.shareDetail;
  // Check if this is a shared report from omerald user
  const isOmeraldShared = report?.isOmeraldSharedReport || report?.isSharedReport;

  // Helper functions for file type detection
  const isImage = (url: string) => {
    if (!url || typeof url !== 'string') return false;
    const urlLower = url.toLowerCase();
    const urlWithoutQuery = urlLower.split('?')[0].split('#')[0];
    if (/\.(jpg|jpeg|png|gif|webp|bmp|svg|tiff|tif|heic|heif|avif|jfif)$/i.test(urlWithoutQuery)) return true;
    if (urlLower.includes('image/') || urlLower.includes('content-type=image/') || urlLower.includes('response-content-type=image/')) return true;
    return false;
  };

  const isPDF = (url: string) => {
    if (!url || typeof url !== 'string') return false;
    const urlLower = url.toLowerCase();
    const urlWithoutQuery = urlLower.split('?')[0].split('#')[0];
    if (/\.pdf$/i.test(urlWithoutQuery)) return true;
    if (urlLower.includes('application/pdf') || urlLower.includes('content-type=application/pdf') || urlLower.includes('response-content-type=application/pdf')) return true;
    return false;
  };

  const getFileType = (url: string): 'pdf' | 'image' | 'unknown' => {
    if (!url || typeof url !== 'string') return 'unknown';
    if (report?.fileType) {
      const fileType = report.fileType as string;
      if (fileType === 'pdf' || fileType === 'image') {
        return fileType as 'pdf' | 'image';
      }
    }
    const urlWithoutQuery = url.split('?')[0].split('#')[0];
    const urlLower = urlWithoutQuery.toLowerCase();
    if (/\.pdf$/i.test(urlWithoutQuery)) return 'pdf';
    if (/\.(jpg|jpeg|png|gif|webp|bmp|svg|tiff|tif|heic|heif|avif|jfif)$/i.test(urlWithoutQuery)) return 'image';
    const fullUrlLower = url.toLowerCase();
    if (fullUrlLower.includes('application/pdf') || fullUrlLower.includes('content-type=application/pdf')) return 'pdf';
    if (fullUrlLower.includes('image/') || fullUrlLower.includes('content-type=image/')) return 'image';
    return 'unknown';
  };

  // Extract report files using the same logic as ViewReportModal
  const reportFiles = useMemo(() => {
    if (!report) return [];
    
    const filterEmptyUrls = (urls: string[]): string[] => {
      return urls.filter((url: string) => url && typeof url === 'string' && url.trim() !== '');
    };
    
    // Check reportDoc first (most common for user-uploaded)
    if (report?.reportDoc && typeof report.reportDoc === 'string' && report.reportDoc.trim() !== '') {
      const urls = report.reportDoc.split(',').map((url: string) => url.trim()).filter(Boolean);
      if (urls.length > 0) return filterEmptyUrls(urls);
    }
    if (report?.reportDoc && Array.isArray(report.reportDoc)) {
      const filtered = filterEmptyUrls(report.reportDoc.filter((url: any) => typeof url === 'string' && url.trim() !== ''));
      if (filtered.length > 0) return filtered;
    }
    
    // Check reportUrl
    if (report?.reportUrl && typeof report.reportUrl === 'string' && report.reportUrl.trim() !== '') {
      const urls = report.reportUrl.split(',').map((url: string) => url.trim()).filter(Boolean);
      if (urls.length > 0) return filterEmptyUrls(urls);
    }
    if (report?.reportUrl && Array.isArray(report.reportUrl)) {
      const filtered = filterEmptyUrls(report.reportUrl.filter((url: any) => typeof url === 'string' && url.trim() !== ''));
      if (filtered.length > 0) return filtered;
    }
    
    // For DC reports, check reportData structure
    if (report?.reportData) {
      if (report.reportData.url) {
        const urls = typeof report.reportData.url === 'string' 
          ? report.reportData.url.split(',').map((url: string) => url.trim()).filter(Boolean)
          : Array.isArray(report.reportData.url) 
            ? report.reportData.url.filter((url: any) => typeof url === 'string' && url.trim() !== '')
            : [];
        if (urls.length > 0) return filterEmptyUrls(urls);
      }
      if (report.reportData.pdfUrl) {
        return filterEmptyUrls([report.reportData.pdfUrl]);
      }
      if (report.reportData.imageUrl) {
        return filterEmptyUrls([report.reportData.imageUrl]);
      }
    }
    
    // For user-shared reports, check reportData for URLs
    const isOmeraldShared = report?.isOmeraldSharedReport || report?.isSharedReport;
    if (isOmeraldShared && report?.reportData) {
      if (typeof report.reportData === 'string' && (report.reportData.trim().startsWith('http://') || report.reportData.trim().startsWith('https://'))) {
        return filterEmptyUrls([report.reportData.trim()]);
      }
      
      let parsedData = null;
      if (typeof report.reportData === 'string') {
        try {
          parsedData = JSON.parse(report.reportData);
        } catch (e) {
          // Not JSON, continue
        }
      } else if (typeof report.reportData === 'object') {
        parsedData = report.reportData;
      }
      
      if (parsedData) {
        if (parsedData.url) {
          const urls = typeof parsedData.url === 'string' 
            ? parsedData.url.split(',').map((url: string) => url.trim()).filter(Boolean)
            : Array.isArray(parsedData.url) 
              ? parsedData.url.filter((url: any) => typeof url === 'string' && url.trim() !== '')
              : [];
          if (urls.length > 0) return filterEmptyUrls(urls);
        }
        
        if (parsedData.directUrl) {
          const urls = typeof parsedData.directUrl === 'string' 
            ? parsedData.directUrl.split(',').map((url: string) => url.trim()).filter(Boolean)
            : Array.isArray(parsedData.directUrl) 
              ? parsedData.directUrl.filter((url: any) => typeof url === 'string' && url.trim() !== '')
              : [];
          if (urls.length > 0) return filterEmptyUrls(urls);
        }
        
        if (parsedData.files && Array.isArray(parsedData.files)) {
          const fileUrls = parsedData.files
            .map((file: any) => {
              if (typeof file === 'string') return file;
              return file?.url || file?.directUrl || null;
            })
            .filter((url: any) => url && typeof url === 'string' && url.trim() !== '');
          if (fileUrls.length > 0) return filterEmptyUrls(fileUrls);
        }
      }
    }
    
    // Check parsedData components for images (DC reports)
    if (report?.parsedData?.components) {
      const images: string[] = [];
      report.parsedData.components.forEach((component: any) => {
        if (component.images && Array.isArray(component.images)) {
          images.push(...component.images);
        }
      });
      const filtered = filterEmptyUrls(images);
      if (filtered.length > 0) return filtered;
    }
    
    return [];
  }, [report]);

  // Extract file key from S3 URL
  const extractFileKey = (url: string): string | null => {
    try {
      if (!url || typeof url !== 'string') return null;
      const baseUrl = url.split('?')[0];
      if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
        return baseUrl;
      }
      const urlObj = new URL(baseUrl);
      let fileKey = urlObj.pathname.startsWith('/') ? urlObj.pathname.substring(1) : urlObj.pathname;
      const hostname = urlObj.hostname;
      
      // Determine S3 URL format based on hostname
      // Format 3: s3.region.amazonaws.com or s3-region.amazonaws.com (bucket in pathname)
      // Format 1/2: bucket.s3.region.amazonaws.com (bucket in hostname, pathname is the key)
      const isFormat3 = hostname.startsWith('s3.') || hostname.startsWith('s3-');
      
      if (isFormat3) {
        // For format 3, the first part of pathname is the bucket name, remove it
        const parts = fileKey.split('/');
        if (parts.length > 1) {
          fileKey = parts.slice(1).join('/');
        }
      }
      // For format 1/2, the pathname is already the full key (bucket is in hostname)
      // So we don't need to remove anything
      
      if (!fileKey || fileKey.trim() === '') return null;
      try {
        fileKey = decodeURIComponent(fileKey);
      } catch (e) {
        // If decoding fails, use the original key
      }
      return fileKey;
    } catch (e) {
      return null;
    }
  };

  // Check if URL is already signed
  const isSignedUrl = (url: string): boolean => {
    if (!url || typeof url !== 'string') return false;
    return url.includes('X-Amz-Algorithm') || 
           url.includes('X-Amz-Signature') || 
           url.includes('AWSAccessKeyId') ||
           (url.includes('?') && url.includes('Signature='));
  };

  // Get signed URL for a file
  const getSignedUrlForFile = async (url: string): Promise<string | null> => {
    if (!url || url.trim() === '') return null;
    if (isSignedUrl(url)) {
      setSignedUrls((prev) => ({ ...prev, [url]: url }));
      return url;
    }
    if (!url.includes('amazonaws.com') && !url.includes('s3.')) {
      setSignedUrls((prev) => ({ ...prev, [url]: url }));
      return url;
    }
    const fileKey = extractFileKey(url);
    if (!fileKey) {
      setMissingFiles((prev) => ({ ...prev, [url]: true }));
      return null;
    }
    if (signedUrls[url]) {
      return signedUrls[url];
    }
    try {
      const response = await axios.post(getSignedUrl, {
        fileKey: fileKey,
        expiresIn: 3600,
      });
      if (response.data.success && response.data.url) {
        setSignedUrls((prev) => ({ ...prev, [url]: response.data.url }));
        return response.data.url;
      } else {
        setMissingFiles((prev) => ({ ...prev, [url]: true }));
        return null;
      }
    } catch (error: any) {
      if (error.response?.status === 404 || error.response?.status === 403) {
        setMissingFiles((prev) => ({ ...prev, [url]: true }));
      }
      return null;
    }
  };

  // Pre-fetch signed URLs for the first file (thumbnail)
  useEffect(() => {
    if (reportFiles.length > 0) {
      const firstFile = reportFiles[0];
      if (firstFile && !signedUrls[firstFile] && !missingFiles[firstFile]) {
        getSignedUrlForFile(firstFile);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportFiles.length]);

  // Handle image error
  const handleImageError = async (url: string) => {
    if (imageErrors[url]) {
      setMissingFiles((prev) => ({ ...prev, [url]: true }));
      return;
    }
    setImageErrors((prev) => ({ ...prev, [url]: true }));
    const signedUrl = await getSignedUrlForFile(url);
    if (signedUrl) {
      setSignedUrls((prev) => ({ ...prev, [url]: signedUrl }));
      setImageErrors((prev) => {
        const newState = { ...prev };
        delete newState[url];
        return newState;
      });
    } else {
      setMissingFiles((prev) => ({ ...prev, [url]: true }));
    }
  };

  // Get the first file for preview
  const previewFile = reportFiles.length > 0 ? reportFiles[0] : null;
  const previewUrl = previewFile ? (signedUrls[previewFile] || previewFile) : null;
  const previewFileType = previewFile ? getFileType(previewFile) : 'unknown';
  const isPDFFile = previewFileType === 'pdf' || (previewFile ? isPDF(previewFile) : false);
  const isImageFile = previewFileType === 'image' || (previewFile ? isImage(previewFile) : false);
  const isMissing = previewFile ? missingFiles[previewFile] : false;

  // Get diagnostic center and branch info
  let diagnosticCenterDisplay = 'Diagnostic Center';
  if (isDCReport) {
    // Handle diagnostic center - could be a string or object
    if (typeof report?.diagnosticCenter === 'string') {
      diagnosticCenterDisplay = report.diagnosticCenter;
    } else if (report?.diagnosticCenter && typeof report.diagnosticCenter === 'object') {
      // If it's an object, extract the name or use the display name if available
      diagnosticCenterDisplay = (report.diagnosticCenter as any)?.name || 
                                 report.diagnosticCenterName || 
                                 'Diagnostic Center';
    } else {
      // Fallback to diagnosticCenterName or diagnosticCenterId as string
      diagnosticCenterDisplay = report?.diagnosticCenterName || 
                                 (report?.diagnosticCenterId ? String(report.diagnosticCenterId) : 'Diagnostic Center');
    }
    // Append branch if available
    if (report?.branch) {
      diagnosticCenterDisplay += ` - ${report.branch}`;
    }
  } else {
    // For non-DC reports (user-shared/manual uploads), show appropriate label
    if (typeof report?.diagnosticCenter === 'string' && report.diagnosticCenter && report.diagnosticCenter !== 'Unknown') {
      diagnosticCenterDisplay = report.diagnosticCenter;
    } else if (report?.diagnosticCenterName && report.diagnosticCenterName !== 'Unknown') {
      diagnosticCenterDisplay = report.diagnosticCenterName;
    } else {
      // User-generated or manual uploaded report (not from diagnostic center)
      diagnosticCenterDisplay = 'User Generated';
    }
  }
  const diagnosticCenter = diagnosticCenterDisplay;
  
  // Get patient name
  const patientName = isDCReport 
    ? report?.patient?.name || report?.pathologist?.name || report?.userName || 'Unknown'
    : report?.userName || report?.createdBy || report?.sharedBy || 'Unknown';
  
  // Get report type/name
  const reportType = report?.name || report?.testName || report?.type || report?.documentType || 'Report';
  
  // Get shared by info
  const sharedBy = report?.createdBy || report?.sharedBy || report?.sharedByUser || 'Unknown';
  const sharedDate = report?.uploadDate || report?.sharedAt || report?.reportDate || new Date();
  const formattedDate = moment(sharedDate).format('DD-MMM-YYYY');
  
  // Get contact info if available
  const contactInfo = report?.contactNumber || report?.phoneNumber || report?.contact || '';

  return (
    <div className="min-w-[280px] sm:min-w-[300px] lg:min-w-[320px] max-w-[320px] bg-white p-4 shadow-sm rounded-xl shrink-0 border border-gray-200 hover:shadow-md transition-all duration-200 flex flex-col">
      {/* Top Section - Diagnostic Center & Preview */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1 min-w-0 pr-2">
          <div className="text-gray-500 text-xs mb-1 truncate">
            {diagnosticCenter}
          </div>
          <div className="font-bold text-gray-900 text-sm mb-1 truncate">
            {patientName}
          </div>
          {/* Shared by info */}
          <div className="text-gray-600 text-xs mt-1 flex items-center gap-1">
            <span className="text-gray-500">Shared by:</span>
            <span className="font-medium text-gray-700 truncate">{sharedBy}</span>
          </div>
        </div>
      </div>

      {/* Report Type - Purple Link */}
      <div className="mb-2">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onView(report);
          }}
          className="text-[#40189D] text-sm font-semibold hover:underline"
        >
          {reportType}
        </button>
      </div>

      {/* Description */}
      <div className="text-xs text-gray-600 leading-relaxed mb-3 flex-1 min-h-[60px]">
        <p className="line-clamp-3">
          This {reportType.toLowerCase()} was shared by <span className="font-medium">{sharedBy}</span> on {formattedDate}.
          {contactInfo && (
            <> In case of any issues please call at <span className="font-medium">{contactInfo}</span>.</>
          )}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mt-auto">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onView(report);
          }}
          className="flex-1 rounded-lg bg-purple-100 text-purple-700 px-2 py-1.5 text-xs font-medium hover:bg-purple-200 transition-colors border border-purple-200"
        >
          View
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onAccept(report);
          }}
          className="flex-1 rounded-lg bg-green-500 text-white px-2 py-1.5 text-xs font-medium hover:bg-green-600 transition-colors"
        >
          Accept
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onReject(report);
          }}
          className="flex-1 rounded-lg bg-red-500 text-white px-2 py-1.5 text-xs font-medium hover:bg-red-600 transition-colors"
        >
          Reject
        </button>
      </div>
    </div>
  );
};

// Separate component for modal to avoid hook issues and ensure it renders outside scrollable container
const ReportModalWrapper = ({ visible, setVisible, report, phoneNumber, profile, onRejectUpdate, setIsRefreshing }: any) => {
  const queryClient = useQueryClient();
  const setDash = useSetRecoilState(dashTabs);
  const isDCReport = report?.isDCReport || report?.shareDetail;
  const isOmeraldShared = report?.isOmeraldSharedReport || report?.isSharedReport;
  
  const acceptDCReport = useAcceptSharedReport(
    async () => {
      setIsRefreshing?.(true);
      try {
        // Refetch all pending and approved reports queries
        await Promise.all([
          queryClient.refetchQueries({ queryKey: ['getManyReports'] }),
          queryClient.refetchQueries({ queryKey: ['getPendingSharedReports'] }),
          queryClient.refetchQueries({ queryKey: ['getReportsFromDC'] }),
        ]);
      } finally {
        setIsRefreshing?.(false);
      }
      setVisible(false);
    },
    () => {
      setIsRefreshing?.(false);
    }
  );

  const handleAccept = async () => {
    // Check if this is a shared report from omerald user
    if (isOmeraldShared && !isDCReport && phoneNumber) {
      setIsRefreshing?.(true);
      try {
        // Get the original reportId
        const originalReportId = report.reportId || report._id || report.id;
        
        // Generate a unique reportId for this user (includes userId to ensure uniqueness)
        // Format: USER-{phoneNumber}-ACCEPTED-{originalReportId}-{timestamp}
        const normalizedPhone = phoneNumber.replace(/\s/g, '').replace(/\+/g, '');
        const uniqueReportId = `USER-${normalizedPhone}-ACCEPTED-${originalReportId}-${Date.now()}`;
        
        // Update the report status to accepted and add to user's reports
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
          diagnosticCenter: report.diagnosticCenter || 'User Generated',
          createdBy: phoneNumber,
          updatedBy: phoneNumber,
          parsedData: report.parsedData || [],
        };

        const response = await axios.post(insertReport, reportData);
        if (response.data.success || response.data._id) {
          // Update the original report to remove from sharedWith array
          const reportId = report._id || report.id || report.reportId;
          const sharedWith = report.sharedWith || [];
          // Remove this user from sharedWith array
          const normalizedUserPhone = phoneNumber.replace(/\s/g, '').startsWith('+') 
            ? phoneNumber.replace(/\s/g, '') 
            : `+${phoneNumber.replace(/\s/g, '')}`;
          
          const updatedSharedWith = sharedWith.filter((share: any) => {
            const sharePhone = (share.phoneNumber || '').replace(/\s/g, '');
            const normalizedSharePhone = sharePhone.startsWith('+') ? sharePhone : `+${sharePhone}`;
            return normalizedSharePhone !== normalizedUserPhone;
          });
          
          try {
            // Update the report with new sharedWith array
            await axios.put(`${updateReport}?id=${reportId}`, { 
              sharedWith: updatedSharedWith
            });
          } catch (error) {
            console.error('Error updating shared report:', error);
            // Continue even if update fails
          }
          
          toast.success('Report accepted and added to your profile!');
          // Refetch all pending reports queries and wait for completion
          await Promise.all([
            queryClient.refetchQueries({ queryKey: ['getManyReports'] }),
            queryClient.refetchQueries({ queryKey: ['getPendingSharedReports'] }),
            queryClient.refetchQueries({ queryKey: ['getReportsFromDC'] }),
            queryClient.refetchQueries({ queryKey: ['getSharedReports'] }), // Also refetch for Reports tab
          ]);
          // Small delay to ensure UI updates before navigation
          await new Promise(resolve => setTimeout(resolve, 300));
          setVisible(false);
          // Navigate to Reports tab
          setDash('Reports');
        } else {
          toast.error('Failed to accept report. Please try again.');
          console.error('Unexpected response format:', response.data);
        }
      } catch (error: any) {
        console.error('Error accepting report:', error);
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Unknown error';
        toast.error('Error accepting report: ' + errorMessage);
      } finally {
        setIsRefreshing?.(false);
      }
    } else if ((report?.isNewDCReport || isDCReport) && phoneNumber) {
      // Handle DC reports (both old and new endpoint) - use API endpoint
      setIsRefreshing?.(true);
      try {
        const reportId = report?.id || report?._id;
        if (!reportId) {
          toast.error('Report ID is required');
          return;
        }

        // Call Next.js API route (server-side proxy to avoid CORS)
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
          
          // Update rejected report IDs to refresh the list
          if (onRejectUpdate) onRejectUpdate();
          
          // Refetch all pending and approved reports queries and wait for completion
          await Promise.all([
            queryClient.refetchQueries({ queryKey: ['getReportsFromDC'] }),
            queryClient.refetchQueries({ queryKey: ['getPendingSharedReports'] }),
            queryClient.refetchQueries({ queryKey: ['getManyReports'] }),
            queryClient.refetchQueries({ queryKey: ['getSharedReports'] }), // Also refetch for Reports tab
          ]);
          // Small delay to ensure UI updates before navigation
          await new Promise(resolve => setTimeout(resolve, 300));
          setVisible(false);
          // Navigate to Reports tab
          setDash('Reports');
        } else {
          throw new Error(response.data.error?.message || 'Failed to accept report');
        }
      } catch (error: any) {
        console.error('Error accepting report:', error);
        const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Unknown error';
        toast.error('Error accepting report: ' + errorMessage);
      } finally {
        setIsRefreshing?.(false);
      }
    } else {
      // Local report - update status
      setIsRefreshing?.(true);
      try {
        const response = await axios.put(`${updateReport}?id=${report._id}`, { status: 'accepted' });
        if (response.status === 200 && response.data._id) {
          toast.success('Report accepted and saved!');
          await Promise.all([
            queryClient.refetchQueries({ queryKey: ['getManyReports'] }),
            queryClient.refetchQueries({ queryKey: ['getPendingSharedReports'] }),
            queryClient.refetchQueries({ queryKey: ['getReportsFromDC'] }),
          ]);
          setVisible(false);
        }
      } catch (error: any) {
        toast.error('Error accepting report: ' + error.message);
      } finally {
        setIsRefreshing?.(false);
      }
    }
  };

  const handleReject = async () => {
    if (isDCReport || report?.isNewDCReport) {
      // For DC reports (both old and new), call API endpoint to reject
      if (confirm('Are you sure you want to reject this report? It will be removed from your pending reports.')) {
        setIsRefreshing?.(true);
        try {
          const reportId = report?.id || report?._id;
          if (!reportId || !phoneNumber) {
            toast.error('Report ID and phone number are required');
            return;
          }

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
            toast.success('Report rejected successfully');
            
            // Refetch all pending and approved reports queries
            await Promise.all([
              queryClient.refetchQueries({ queryKey: ['getReportsFromDC'] }),
              queryClient.refetchQueries({ queryKey: ['getPendingSharedReports'] }),
              queryClient.refetchQueries({ queryKey: ['getManyReports'] }),
            ]);
            setVisible(false);
          } else {
            throw new Error(response.data.error?.message || 'Failed to reject report');
          }
        } catch (error: any) {
          console.error('Error rejecting report:', error);
          const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Unknown error';
          toast.error('Error rejecting report: ' + errorMessage);
        } finally {
          setIsRefreshing?.(false);
        }
      }
      return;
    }
    
    // For omerald user shared reports, update the report to remove from sharedWith
    if (isOmeraldShared && phoneNumber) {
      if (confirm('Are you sure you want to reject this report? It will be removed from your pending reports.')) {
        setIsRefreshing?.(true);
        try {
          const reportId = report._id || report.id || report.reportId;
          const sharedWith = report.sharedWith || [];
          // Remove this user from sharedWith array
          const normalizedUserPhone = phoneNumber.replace(/\s/g, '').startsWith('+') 
            ? phoneNumber.replace(/\s/g, '') 
            : `+${phoneNumber.replace(/\s/g, '')}`;
          
          const updatedSharedWith = sharedWith.filter((share: any) => {
            const sharePhone = (share.phoneNumber || '').replace(/\s/g, '');
            const normalizedSharePhone = sharePhone.startsWith('+') ? sharePhone : `+${sharePhone}`;
            return normalizedSharePhone !== normalizedUserPhone;
          });
          
          // Update the report with new sharedWith array
          const response = await axios.put(`${updateReport}?id=${reportId}`, { 
            sharedWith: updatedSharedWith
          });
          if (response.status === 200) {
            toast.success('Report rejected');
            // Refetch all pending reports queries
            await Promise.all([
              queryClient.refetchQueries({ queryKey: ['getManyReports'] }),
              queryClient.refetchQueries({ queryKey: ['getPendingSharedReports'] }),
              queryClient.refetchQueries({ queryKey: ['getReportsFromDC'] }),
            ]);
            setVisible(false);
          }
        } catch (error: any) {
          toast.error('Error rejecting report: ' + error.message);
        } finally {
          setIsRefreshing?.(false);
        }
      }
      return;
    }
    
    // For local reports, use API
    if (confirm('Are you sure you want to reject this report?')) {
      setIsRefreshing?.(true);
      try {
        const response = await axios.put(`${updateReport}?id=${report._id}`, { status: 'rejected' });
        if (response.status === 200 && response.data._id) {
          toast.success('Report rejected');
          // Refetch all pending reports queries
          await Promise.all([
            queryClient.refetchQueries({ queryKey: ['getManyReports'] }),
            queryClient.refetchQueries({ queryKey: ['getPendingSharedReports'] }),
            queryClient.refetchQueries({ queryKey: ['getReportsFromDC'] }),
          ]);
          setVisible(false);
        }
      } catch (error: any) {
        toast.error('Error rejecting report: ' + error.message);
      } finally {
        setIsRefreshing?.(false);
      }
    }
  };

  return (
    <ViewReportModal
      visible={visible}
      setVisible={setVisible}
      report={report}
      showActions={true}
      onAccept={handleAccept}
      onReject={handleReject}
    />
  );
};

