import { useMemo, useState, useEffect } from 'react';
import { useGetPendingSharedReports, useGetReportsFromDC } from './reactQuery/reports';
import { getDiagnosticCenterNames, getBranchNames } from '@/services/diagnosticCenterService';
import { ReportWithSharedDetails } from '@/services/reportSharingService';

interface ProcessedPendingReport {
  _id: string;
  id: string;
  name: string;
  testName: string;
  type: string;
  documentType: string;
  diagnosticCenter: string;
  branch?: string;
  createdBy: string;
  uploadDate: string;
  reportDate?: string;
  status: 'pending';
  reportUrl: string;
  reportDoc: string;
  fileType?: string;
  parsedData?: any;
  isDCReport?: boolean;
  isOmeraldSharedReport?: boolean;
  isPending: boolean;
  shareDetail?: any;
  sharedReportDetails?: any;
  patient?: any;
  userName?: string;
  diagnosticCenterId?: string;
  branchId?: string;
  [key: string]: any;
}

/**
 * Common hook for processing pending reports from multiple sources
 * Combines Omerald user shared reports and DC app pending reports
 */
export function usePendingReports(phoneNumber: string | undefined) {
  const [dcNamesMap, setDcNamesMap] = useState<Map<string, string>>(new Map());
  const [branchNamesMap, setBranchNamesMap] = useState<Map<string, string>>(new Map());

  // Fetch pending shared reports from omerald users
  const { data: omeraldPendingSharedReports, isLoading: isLoadingOmeraldShared } = useGetPendingSharedReports(
    phoneNumber || undefined
  );

  // Fetch pending reports from DC app using unified endpoint
  const { data: dcPendingReportsData, isLoading: isLoadingDCPending } = useGetReportsFromDC(
    phoneNumber || undefined
  );

  // Fetch DC and branch names for DC reports
  useEffect(() => {
    if (!dcPendingReportsData?.reports || dcPendingReportsData.reports.length === 0) return;

    const fetchNames = async () => {
      const dcIds = new Set<string>();
      const branchIds = new Set<string>();

      dcPendingReportsData.reports.forEach((report: ReportWithSharedDetails) => {
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
  }, [dcPendingReportsData]);

  // Transform omerald user shared reports
  const omeraldPendingReports = useMemo(() => {
    if (!omeraldPendingSharedReports || !Array.isArray(omeraldPendingSharedReports)) return [];
    return omeraldPendingSharedReports
      .filter((report: any) => {
        const reportId = report.reportId || report._id?.toString() || report.id;
        return reportId;
      })
      .map((report: any): ProcessedPendingReport => ({
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
        isPending: true,
      }));
  }, [omeraldPendingSharedReports]);

  // Transform DC pending reports
  const dcPendingReports = useMemo(() => {
    if (!dcPendingReportsData?.reports || !Array.isArray(dcPendingReportsData.reports)) return [];
    
    const normalizePhone = (phone: string) => {
      if (!phone) return '';
      return phone.replace(/\s/g, '').startsWith('+') ? phone.replace(/\s/g, '') : `+${phone.replace(/\s/g, '')}`;
    };
    const normalizedUserPhone = phoneNumber ? normalizePhone(phoneNumber) : '';
    
    return dcPendingReportsData.reports
      .filter((dcReport: ReportWithSharedDetails) => {
        // Ensure there's a pending share detail for this user
        if (!dcReport.sharedReportDetails || !Array.isArray(dcReport.sharedReportDetails)) {
          return false;
        }
        
        const shareDetail = dcReport.sharedReportDetails.find(
          (detail: any) => {
            const normalizedDetailPhone = normalizePhone(detail.userContact || '');
            return normalizedDetailPhone === normalizedUserPhone 
              && detail.accepted === false 
              && (detail.rejected === false || detail.rejected === undefined || detail.rejected === null);
          }
        );
        
        return !!shareDetail; // Only include if there's a pending share detail
      })
      .map((dcReport: ReportWithSharedDetails): ProcessedPendingReport | null => {
        // Find the share detail for this user (should exist due to filter above)
        const shareDetail = dcReport.sharedReportDetails?.find(
          (detail: any) => {
            const normalizedDetailPhone = normalizePhone(detail.userContact || '');
            return normalizedDetailPhone === normalizedUserPhone 
              && detail.accepted === false 
              && (detail.rejected === false || detail.rejected === undefined || detail.rejected === null);
          }
        ) || dcReport.shareDetail;
        
        // Double-check: if no pending share detail found or rejected, skip
        if (!shareDetail || shareDetail.accepted !== false || shareDetail.rejected === true) {
          return null;
        }
        
        const testName: string = typeof dcReport.reportData?.parsedData?.test === 'object' 
          ? (dcReport.reportData.parsedData.test.testName || 'Diagnostic Report')
          : (typeof dcReport.reportData?.parsedData?.test === 'string' 
            ? dcReport.reportData.parsedData.test 
            : 'Diagnostic Report');
        
        // Handle diagnostic center - fetch names from cache
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
        
        return {
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
          uploadDate: shareDetail?.sharedAt || dcReport.reportData?.reportDate || new Date().toISOString(),
          reportDate: dcReport.reportData?.reportDate,
          status: 'pending',
          reportUrl: dcReport.reportData?.url || dcReport.reportData?.pdfUrl || dcReport.reportData?.imageUrl || '',
          reportDoc: dcReport.reportData?.url || dcReport.reportData?.pdfUrl || dcReport.reportData?.imageUrl || '',
          fileType: dcReport.reportData?.fileType || (dcReport.reportData?.pdfUrl ? 'pdf' : 'image'),
          parsedData: dcReport.reportData?.parsedData,
          isDCReport: true,
          shareDetail: shareDetail,
          sharedReportDetails: dcReport.sharedReportDetails,
          patient: dcReport.patient,
          userName: dcReport.patient?.name || phoneNumber || 'User',
          type: testName,
          documentType: testName,
          isPending: true,
        };
      })
      .filter((report): report is ProcessedPendingReport => report !== null);
  }, [dcPendingReportsData, phoneNumber, dcNamesMap, branchNamesMap]);

  // Merge all pending reports
  const pendingReports = useMemo(() => {
    return [...omeraldPendingReports, ...dcPendingReports];
  }, [omeraldPendingReports, dcPendingReports]);

  const isLoading = isLoadingOmeraldShared || isLoadingDCPending;

  return {
    pendingReports,
    omeraldPendingReports,
    dcPendingReports,
    isLoading,
  };
}







