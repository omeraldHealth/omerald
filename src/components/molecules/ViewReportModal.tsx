'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { XMarkIcon, DocumentIcon, CalendarIcon, UserIcon, EyeIcon } from '@heroicons/react/24/solid';
import moment from 'moment';
import Image from 'next/image';
import axios from 'axios';
import { getSignedUrl } from '@/components/common/lib/constants/urls';
import { getDiagnosticCenterName, getBranchName } from '@/services/diagnosticCenterService';
import { useReportTypeName } from '@/hooks/useReportTypeName';
import ReportViewer from './ReportViewer';
import DiagnosticReport from './DiagnosticReport/DiagnosticReport';
import { UserGroupIcon } from '@heroicons/react/24/outline';

interface ViewReportModalProps {
  visible: boolean;
  setVisible: (visible: boolean) => void;
  report: any;
  onAccept?: () => void;
  onReject?: () => void;
  showActions?: boolean;
}

export default function ViewReportModal({
  visible,
  setVisible,
  report,
  onAccept,
  onReject,
  showActions = false,
}: ViewReportModalProps) {
  const [signedUrls, setSignedUrls] = useState<{ [key: string]: string }>({});
  const [imageErrors, setImageErrors] = useState<{ [key: string]: boolean }>({});
  const [missingFiles, setMissingFiles] = useState<{ [key: string]: boolean }>({});
  const { getReportTypeDisplayName } = useReportTypeName(report ? [report] : []);
  const [diagnosticCenterName, setDiagnosticCenterName] = useState<string>('');
  const [branchName, setBranchName] = useState<string>('');
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'preview' | 'report'>('report');
  const [showConditionsTooltip, setShowConditionsTooltip] = useState(false);

  // Determine report files - if shared from DC, show PDF, otherwise show uploaded images
  // DC reports have: isDCReport flag, shareDetail (from DC sharing), or diagnosticCenter as object with diagnostic.id
  // User-uploaded reports have userId, may have diagnosticCenter as string, but NOT isDCReport or shareDetail
  const isSharedFromDC = report?.isDCReport || 
    report?.shareDetail || 
    (report?.diagnosticCenter?.diagnostic && typeof report?.diagnosticCenter?.diagnostic === 'object' && report?.diagnosticCenter?.diagnostic?.id) ||
    (report?.reportData?.parsedData && report?.reportData?.parsedData?.parameters && !report?.userId);

  // Helper functions for file type detection (must be defined before useMemo hooks that use them)
  const isImage = (url: string) => {
    if (!url || typeof url !== 'string') return false;
    const urlLower = url.toLowerCase();
    // Remove query parameters for extension checking
    const urlWithoutQuery = urlLower.split('?')[0].split('#')[0];
    // Check file extension
    if (/\.(jpg|jpeg|png|gif|webp|bmp|svg|tiff|tif|heic|heif|avif|jfif)$/i.test(urlWithoutQuery)) return true;
    // Check for image content type hints in URL
    if (urlLower.includes('image/') || urlLower.includes('content-type=image/') || urlLower.includes('response-content-type=image/')) return true;
    return false;
  };

  const isPDF = (url: string) => {
    if (!url || typeof url !== 'string') return false;
    const urlLower = url.toLowerCase();
    // Remove query parameters for extension checking
    const urlWithoutQuery = urlLower.split('?')[0].split('#')[0];
    // Check file extension
    if (/\.pdf$/i.test(urlWithoutQuery)) return true;
    // Check for PDF content type hints in URL
    if (urlLower.includes('application/pdf') || urlLower.includes('content-type=application/pdf') || urlLower.includes('response-content-type=application/pdf')) return true;
    return false;
  };

  const getFileType = (url: string): 'pdf' | 'image' | 'unknown' => {
    if (!url || typeof url !== 'string') return 'unknown';
    
    // Check report.fileType first (from DC app)
    if (report?.fileType) {
      const fileType = report.fileType as string;
      if (fileType === 'pdf' || fileType === 'image') {
        return fileType as 'pdf' | 'image';
      }
    }
    
    // Remove query parameters for better detection
    const urlWithoutQuery = url.split('?')[0].split('#')[0];
    const urlLower = urlWithoutQuery.toLowerCase();
    
    // Check file extension first (most reliable)
    if (/\.pdf$/i.test(urlWithoutQuery)) return 'pdf';
    if (/\.(jpg|jpeg|png|gif|webp|bmp|svg|tiff|tif|heic|heif|avif|jfif)$/i.test(urlWithoutQuery)) return 'image';
    
    // Check for content type hints in full URL (including query params for AWS signed URLs)
    const fullUrlLower = url.toLowerCase();
    if (fullUrlLower.includes('application/pdf') || fullUrlLower.includes('content-type=application/pdf') || fullUrlLower.includes('response-content-type=application/pdf')) return 'pdf';
    if (fullUrlLower.includes('image/') || fullUrlLower.includes('content-type=image/') || fullUrlLower.includes('response-content-type=image/')) return 'image';
    
    // Additional checks for URLs without clear extensions
    if (urlLower.includes('pdf') || urlLower.includes('document')) return 'pdf';
    if (urlLower.includes('image') || urlLower.includes('photo') || urlLower.includes('picture')) return 'image';
    
    return 'unknown';
  };

  // Check if report has parsed data
  const hasParsedData = useMemo(() => {
    if (!report) return false;
    // Check for parsed data in various possible locations
    const parsedData = report?.reportData?.parsedData || 
                      report?.parsedData || 
                      (typeof report?.parsedData === 'object' && !Array.isArray(report?.parsedData) ? report.parsedData : null);
    
    if (!parsedData) return false;
    
    // Check if parsed data has parameters or components
    const hasParameters = parsedData?.parameters && Array.isArray(parsedData.parameters) && parsedData.parameters.length > 0;
    const hasComponents = parsedData?.components && Array.isArray(parsedData.components) && parsedData.components.length > 0;
    
    return hasParameters || hasComponents;
  }, [report]);

  // Check if report has valid PDF
  const hasValidPDF = useMemo(() => {
    if (!report) return false;
    const pdfUrl = report?.reportUrl || report?.reportDoc;
    if (!pdfUrl) return false;
    const urls = Array.isArray(pdfUrl) ? pdfUrl : (typeof pdfUrl === 'string' ? pdfUrl.split(',') : [pdfUrl]);
    return urls.some((url: string) => url && url.trim() !== '' && (isPDF(url) || getFileType(url) === 'pdf'));
  }, [report]);

  // Get report files - check ALL possible locations regardless of report type
  // This is computed independently to avoid circular dependency with isSharedFromDC
  const reportFiles = useMemo(() => {
    if (!report) return [];
    
    const filterEmptyUrls = (urls: string[]): string[] => {
      return urls.filter((url: string) => url && typeof url === 'string' && url.trim() !== '');
    };
    
    // Check all possible file locations (works for both DC and user-uploaded reports)
    // 1. Check reportDoc first (most common for user-uploaded)
    if (report?.reportDoc && typeof report.reportDoc === 'string' && report.reportDoc.trim() !== '') {
      const urls = report.reportDoc.split(',').map((url: string) => url.trim()).filter(Boolean);
      if (urls.length > 0) return filterEmptyUrls(urls);
    }
    if (report?.reportDoc && Array.isArray(report.reportDoc)) {
      const filtered = filterEmptyUrls(report.reportDoc.filter((url: any) => typeof url === 'string' && url.trim() !== ''));
      if (filtered.length > 0) return filtered;
    }
    
    // 2. Check reportUrl
    if (report?.reportUrl && typeof report.reportUrl === 'string' && report.reportUrl.trim() !== '') {
      const urls = report.reportUrl.split(',').map((url: string) => url.trim()).filter(Boolean);
      if (urls.length > 0) return filterEmptyUrls(urls);
    }
    if (report?.reportUrl && Array.isArray(report.reportUrl)) {
      const filtered = filterEmptyUrls(report.reportUrl.filter((url: any) => typeof url === 'string' && url.trim() !== ''));
      if (filtered.length > 0) return filtered;
    }
    
    // 3. For DC reports, check reportData structure
    if (report?.reportData) {
      // Check if reportData has direct URL fields (DC format)
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
    
    // 4. For user-shared reports, check reportData for URLs
    const isOmeraldShared = report?.isOmeraldSharedReport || report?.isSharedReport;
    if (isOmeraldShared && report?.reportData) {
      // Check if reportData is a direct URL string
      if (typeof report.reportData === 'string' && (report.reportData.trim().startsWith('http://') || report.reportData.trim().startsWith('https://'))) {
        return filterEmptyUrls([report.reportData.trim()]);
      }
      
      // Try to parse reportData as JSON
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
      
      // Check parsed reportData for URL fields
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
        
        // Check reportData.files array
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
    
    // 5. Last resort: check parsedData components for images (DC reports)
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

  // Check if this is a user-shared report (not from DC)
  const isOmeraldShared = report?.isOmeraldSharedReport || report?.isSharedReport;
  const isUserSharedReport = !isSharedFromDC && isOmeraldShared;
  
  // Check if this is a user-uploaded report (user's own report, not shared, not DC)
  // User-uploaded reports: have userId, NOT shared by others, NOT from DC, no shareDetail, and has files
  // Key indicator: has userId and createdBy (user's own report)
  const isUserUploadedReport = !isSharedFromDC && 
    !isOmeraldShared && 
    !report?.shareDetail && 
    !report?.isDCReport && 
    !report?.isOmeraldSharedReport && 
    !report?.isSharedReport &&
    (report?.userId || report?.createdBy) && // Has userId or createdBy (user's own report)
    (reportFiles.length > 0 || report?.reportDoc || report?.reportUrl);
  
  // Check if this is an accepted report from Omerald user sharing (should show embedded viewer)
  // Accepted reports: were shared by Omerald users, now accepted, have files
  // Also includes reports that were accepted and have originalReportId (from accept flow)
  const isAcceptedOmeraldReport = !isSharedFromDC && 
    !report?.isDCReport &&
    report?.status === 'accepted' &&
    (report?.originalReportId || (report?.userId && report?.createdBy && report?.userId === report?.createdBy)) &&
    (reportFiles.length > 0 || report?.reportDoc || report?.reportUrl);
  
  // Always show thumbnail grid view instead of embedded viewer for all reports
  // User wants second view (thumbnail grid) instead of first view (embedded viewer)
  const shouldShowEmbeddedViewer = false;
  
  // Determine which view to show
  // For user-uploaded reports: show thumbnail grid preview (like user-shared reports)
  // For accepted Omerald reports: show embedded viewer
  // For user-shared reports with files: always show file viewer (thumbnail grid), not DiagnosticReport
  // For DC reports or user-shared reports without files but with parsed data: show DiagnosticReport
  // For user-shared reports with PDF but no parsed data: show embedded PDF viewer
  const hasReportFiles = reportFiles.length > 0;
  const shouldShowTabs = (hasParsedData || isSharedFromDC) && !(isUserSharedReport && hasReportFiles) && !shouldShowEmbeddedViewer && !isUserUploadedReport;
  // Show DiagnosticReport only if: (has parsed data OR is from DC) AND NOT (user-shared with files) AND NOT (accepted Omerald) AND NOT (user-uploaded)
  const shouldShowDiagnosticReport = (hasParsedData || isSharedFromDC) && !(isUserSharedReport && hasReportFiles) && !shouldShowEmbeddedViewer && !isUserUploadedReport;
  // Show embedded PDF viewer only if: no parsed data, not from DC, has valid PDF, and no report files (fallback)
  const shouldShowPDFViewer = !hasParsedData && !isSharedFromDC && hasValidPDF && !hasReportFiles && !shouldShowEmbeddedViewer && !isUserUploadedReport;

  // Get shared count for indicator
  const sharedCount = useMemo(() => {
    if (report?.sharedReportDetails) {
      return report.sharedReportDetails.filter((s: any) => !s.blocked).length;
    }
    if (report?.sharedWith && Array.isArray(report.sharedWith)) {
      return report.sharedWith.length;
    }
    return 0;
  }, [report]);

  // Fetch diagnostic center and branch names if we have IDs
  useEffect(() => {
    const fetchNames = async () => {
      if (!report) return;

      // Check if we already have names from the report
      if (report.diagnosticCenter && typeof report.diagnosticCenter === 'string' && report.diagnosticCenter !== 'Diagnostic Center') {
        setDiagnosticCenterName(report.diagnosticCenter);
      } else if (report.diagnosticCenterId) {
        // Fetch by ID
        const name = await getDiagnosticCenterName(report.diagnosticCenterId);
        if (name) setDiagnosticCenterName(name);
      } else if (report.diagnosticCenter?.diagnostic) {
        // Handle object format
        if (typeof report.diagnosticCenter.diagnostic === 'object' && report.diagnosticCenter.diagnostic.name) {
          setDiagnosticCenterName(report.diagnosticCenter.diagnostic.name);
        } else if (typeof report.diagnosticCenter.diagnostic === 'string') {
          const name = await getDiagnosticCenterName(report.diagnosticCenter.diagnostic);
          if (name) setDiagnosticCenterName(name);
        }
      } else if (report.diagnosticCenter) {
        setDiagnosticCenterName(report.diagnosticCenter);
      }

      if (report.branch && report.branch !== '') {
        setBranchName(report.branch);
      } else if (report.branchId) {
        const name = await getBranchName(report.branchId);
        if (name) setBranchName(name);
      } else if (report.diagnosticCenter?.branch) {
        if (typeof report.diagnosticCenter.branch === 'object' && report.diagnosticCenter.branch.name) {
          setBranchName(report.diagnosticCenter.branch.name);
        } else if (typeof report.diagnosticCenter.branch === 'string') {
          const name = await getBranchName(report.diagnosticCenter.branch);
          if (name) setBranchName(name);
        }
      }
    };

    fetchNames();
  }, [report]);

  const formatDate = (date: string | Date) => {
    if (!date) return 'N/A';
    return moment(date).format('DD MMM YYYY, hh:mm A');
  };

  // Extract file key from S3 URL
  const extractFileKey = (url: string): string | null => {
    try {
      if (!url || typeof url !== 'string') {
        console.error('Invalid URL provided:', url);
        return null;
      }

      // If URL is already signed, extract key from the base URL (before query params)
      const baseUrl = url.split('?')[0];

      // Handle different S3 URL formats
      // Format 1: https://bucket.s3.region.amazonaws.com/key (bucket in hostname)
      // Format 2: https://bucket.s3-region.amazonaws.com/key (bucket in hostname)
      // Format 3: https://s3.region.amazonaws.com/bucket/key (bucket in pathname)
      // Format 4: Just the key itself (if already extracted)
      
      // If it's already just a key (no http/https), return as is
      if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
        return baseUrl;
      }

      const urlObj = new URL(baseUrl);
      const pathname = urlObj.pathname;
      const hostname = urlObj.hostname;
      
      // Remove leading slash
      let fileKey = pathname.startsWith('/') ? pathname.substring(1) : pathname;
      
      // Determine S3 URL format based on hostname
      // Format 3: s3.region.amazonaws.com or s3-region.amazonaws.com (bucket in pathname)
      // Format 1/2: bucket.s3.region.amazonaws.com (bucket in hostname, pathname is the key)
      const isFormat3 = hostname.startsWith('s3.') || hostname.startsWith('s3-');
      
      if (isFormat3) {
        // For format 3, the first part of pathname is the bucket name, remove it
        // e.g., /bucket-name/file-key -> file-key
        const parts = fileKey.split('/');
        if (parts.length > 1) {
          fileKey = parts.slice(1).join('/');
        }
      }
      // For format 1/2, the pathname is already the full key (bucket is in hostname)
      // So we don't need to remove anything
      
      if (!fileKey || fileKey.trim() === '') {
        console.error('Empty file key extracted from URL:', url);
        return null;
      }
      
      // Decode URL-encoded characters (e.g., %2B becomes +)
      try {
        fileKey = decodeURIComponent(fileKey);
      } catch (e) {
        // If decoding fails, use the original key
        console.warn('Failed to decode file key, using original:', fileKey);
      }
      
      return fileKey;
    } catch (e) {
      console.error('Error extracting file key from URL:', url, e);
      return null;
    }
  };

  // Check if URL is already a signed URL (has AWS signature query parameters)
  const isSignedUrl = (url: string): boolean => {
    if (!url || typeof url !== 'string') return false;
    // Check for AWS signature query parameters
    return url.includes('X-Amz-Algorithm') || 
           url.includes('X-Amz-Signature') || 
           url.includes('AWSAccessKeyId') ||
           (url.includes('?') && url.includes('Signature='));
  };

  // Get signed URL for a file
  const getSignedUrlForFile = async (url: string): Promise<string | null> => {
    if (!url || url.trim() === '') {
      console.error('Empty URL provided to getSignedUrlForFile');
      setMissingFiles((prev) => ({ ...prev, [url]: true }));
      return null;
    }

    // If URL is already signed, use it directly
    if (isSignedUrl(url)) {
      console.log('URL is already signed, using directly:', url);
      setSignedUrls((prev) => ({ ...prev, [url]: url }));
      return url;
    }

    // If URL is not an S3 URL, return it as-is (might be a direct URL)
    if (!url.includes('amazonaws.com') && !url.includes('s3.')) {
      console.log('URL is not an S3 URL, using directly:', url);
      return url;
    }

    const fileKey = extractFileKey(url);
    if (!fileKey) {
      console.error('Could not extract file key from URL:', url);
      setMissingFiles((prev) => ({ ...prev, [url]: true }));
      return null;
    }

    // Check if we already have a signed URL cached
    if (signedUrls[url]) {
      return signedUrls[url];
    }

    try {
      const response = await axios.post(getSignedUrl, {
        fileKey: fileKey,
        expiresIn: 3600, // 1 hour
      });

      if (response.data.success && response.data.url) {
        setSignedUrls((prev) => ({ ...prev, [url]: response.data.url }));
        return response.data.url;
      } else {
        console.error('Invalid response from getSignedUrl API:', response.data);
        setMissingFiles((prev) => ({ ...prev, [url]: true }));
        return null;
      }
    } catch (error: any) {
      console.error('Error getting signed URL for file:', {
        url,
        fileKey,
        error: error.response?.data || error.message,
        status: error.response?.status,
      });
      
      // If file not found (404), mark as missing
      if (error.response?.status === 404 || error.response?.data?.error === 'File not found') {
        console.error('File not found in S3:', fileKey);
        setMissingFiles((prev) => ({ ...prev, [url]: true }));
        return null;
      }
      
      // If access denied (403), mark as access denied
      if (error.response?.status === 403 || error.response?.data?.error === 'Access Denied') {
        console.error('Access denied to file in S3:', fileKey);
        setMissingFiles((prev) => ({ ...prev, [url]: true }));
        return null;
      }
      
      // For other errors, still mark as missing but log the error
      console.error('Unexpected error getting signed URL:', error);
      setMissingFiles((prev) => ({ ...prev, [url]: true }));
      return null;
    }
  };

  // Handle image error - try to get signed URL
  const handleImageError = async (url: string, index: number) => {
    if (imageErrors[url]) {
      // If we already tried and failed, mark as missing
      setMissingFiles((prev) => ({ ...prev, [url]: true }));
      return;
    }
    
    setImageErrors((prev) => ({ ...prev, [url]: true }));
    const signedUrl = await getSignedUrlForFile(url);
    
    if (signedUrl) {
      // Update the signed URLs state
      setSignedUrls((prev) => ({ ...prev, [url]: signedUrl }));
      // Clear error state since we got a signed URL
      setImageErrors((prev) => {
        const newState = { ...prev };
        delete newState[url];
        return newState;
      });
    } else {
      // File doesn't exist or can't be accessed
      setMissingFiles((prev) => ({ ...prev, [url]: true }));
    }
  };

  // Pre-fetch signed URLs for all files when modal opens
  useEffect(() => {
    if (!visible || !report || reportFiles.length === 0) return;
    
    // Reset states when modal opens
    setMissingFiles({});
    setImageErrors({});
    
    const fetchSignedUrls = async () => {
      const promises = reportFiles.map(async (url) => {
        if (!url || url.trim() === '') {
          console.warn('Empty file URL in reportFiles');
          return;
        }
        
        // If URL is already signed, cache it directly
        if (isSignedUrl(url)) {
          setSignedUrls((prev) => ({ ...prev, [url]: url }));
          return;
        }
        
        // Only get signed URL if it's an S3 URL
        if (url.includes('amazonaws.com') || url.includes('s3.')) {
          await getSignedUrlForFile(url);
        } else {
          // For non-S3 URLs, just use them directly
          console.log('Non-S3 URL, using directly:', url);
          setSignedUrls((prev) => ({ ...prev, [url]: url }));
        }
      });
      
      // Fetch all signed URLs in parallel for faster loading
      await Promise.all(promises);
    };
    fetchSignedUrls();
  }, [visible, reportFiles]);

  // Early return after all hooks are called
  if (!visible || !report) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-2 sm:p-4 overflow-y-auto safe-top safe-bottom" onClick={(e) => {
      if (e.target === e.currentTarget) {
        setVisible(false);
      }
    }}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl my-2 sm:my-4 md:my-8 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto mobile-scroll" onClick={(e) => e.stopPropagation()}>
        {/* Header with Tabs */}
        <div className="border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between p-3 sm:p-4 md:p-6">
            {shouldShowTabs ? (
              <div className="flex items-center gap-4 flex-1">
                <button
                  onClick={() => setActiveTab('report')}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                    activeTab === 'report'
                      ? 'bg-[#40189D] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Report View
                </button>
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                    activeTab === 'preview'
                      ? 'bg-[#40189D] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Preview
                </button>
              </div>
            ) : (
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Report Details</h2>
            )}
            <div className="flex items-center gap-3">
              {sharedCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium">
                  <UserGroupIcon className="w-4 h-4" />
                  <span>{sharedCount} Shared</span>
                </div>
              )}
              <button
                onClick={() => setVisible(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 tap-target"
                aria-label="Close"
              >
                <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
          {/* Report View Tab - Show DiagnosticReport component */}
          {shouldShowTabs && activeTab === 'report' && shouldShowDiagnosticReport && (
            <div className="max-h-[calc(95vh-200px)] overflow-y-auto">
              <DiagnosticReport report={report} isTest={false} />
            </div>
          )}

          {/* Preview Tab or Default View */}
          {(shouldShowTabs && activeTab === 'preview') || !shouldShowTabs ? (
            <>
          {/* Report Name */}
          <div>
            <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-2">
              {report.name || report.testName || 'Untitled Report'}
            </h3>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                report.status === 'accepted'
                  ? 'bg-green-100 text-green-800'
                  : report.status === 'pending'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {report.status || 'N/A'}
              </span>
            </div>
          </div>

          {/* Report Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <UserIcon className="w-5 h-5 text-gray-400 mt-1" />
              <div>
                <p className="text-sm text-gray-500">Member</p>
                <p className="text-sm font-medium text-gray-900">{report.userName || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <DocumentIcon className="w-5 h-5 text-gray-400 mt-1" />
              <div>
                <p className="text-sm text-gray-500">Report Type</p>
                <p className="text-sm font-medium text-gray-900">{getReportTypeDisplayName(report) || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CalendarIcon className="w-5 h-5 text-gray-400 mt-1" />
              <div>
                <p className="text-sm text-gray-500">Report Date</p>
                <p className="text-sm font-medium text-gray-900">{formatDate(report.reportDate)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CalendarIcon className="w-5 h-5 text-gray-400 mt-1" />
              <div>
                <p className="text-sm text-gray-500">Upload Date</p>
                <p className="text-sm font-medium text-gray-900">{formatDate(report.uploadDate || report.uploadedAt)}</p>
              </div>
            </div>
          </div>

          {/* Diagnostic Center (if shared) */}
          {(diagnosticCenterName || report.diagnosticCenter) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-gray-500 mb-1">Diagnostic Center</p>
              <p className="text-sm font-medium text-gray-900">
                {diagnosticCenterName || report.diagnosticCenter || 'Diagnostic Center'}
                {branchName && (
                  <span className="text-gray-600 ml-2">- {branchName}</span>
                )}
              </p>
              {report.createdBy && (
                <p className="text-xs text-gray-600 mt-1">Shared by: {report.createdBy}</p>
              )}
            </div>
          )}

          {/* Health Topics / Conditions */}
          {report.conditions && report.conditions.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Health Topics</p>
              <div className="flex flex-wrap gap-2 items-center">
                {report.conditions.slice(0, 10).map((condition: any, index: number) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm"
                  >
                    {typeof condition === 'string' ? condition : (condition?.condition || String(condition))}
                  </span>
                ))}
                {report.conditions.length > 10 && (
                  <div className="relative">
                    <span 
                      className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium cursor-pointer hover:bg-gray-200 transition-colors"
                      onMouseEnter={() => setShowConditionsTooltip(true)}
                      onMouseLeave={() => setShowConditionsTooltip(false)}
                    >
                      +{report.conditions.length - 10} more...
                    </span>
                    {showConditionsTooltip && (
                      <div 
                        className="absolute z-50 mt-2 left-0 bg-white border border-gray-200 rounded-lg shadow-xl p-4 max-w-xs max-h-64 overflow-y-auto"
                        style={{ minWidth: '200px' }}
                        onMouseEnter={() => setShowConditionsTooltip(true)}
                        onMouseLeave={() => setShowConditionsTooltip(false)}
                      >
                        <p className="text-xs font-semibold text-gray-700 mb-2">All Health Topics ({report.conditions.length}):</p>
                        <div className="flex flex-wrap gap-1.5">
                          {report.conditions.map((condition: any, idx: number) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full text-xs"
                            >
                              {typeof condition === 'string' ? condition : (condition?.condition || String(condition))}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          {report.description && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Description</p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{report.description}</p>
            </div>
          )}

          {/* Remarks */}
          {report.remarks && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Remarks</p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{report.remarks}</p>
            </div>
          )}

          {/* PDF Viewer for reports without parsed data */}
          {shouldShowPDFViewer && reportFiles.length > 0 && (
            <div className="w-full">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-700">Report PDF</p>
                <button
                  onClick={() => {
                    setViewerInitialIndex(0);
                    setViewerOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                >
                  <EyeIcon className="w-4 h-4" />
                  Open PDF Viewer
                </button>
              </div>
              <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50" style={{ minHeight: '600px' }}>
                <ReportViewer
                  files={reportFiles.map((url: string) => signedUrls[url] || url)}
                  fileTypes={reportFiles.map((url: string) => {
                    const fileType = getFileType(url);
                    if (fileType !== 'unknown') return fileType;
                    if (isPDF(url)) return 'pdf';
                    if (isImage(url)) return 'image';
                    return 'unknown';
                  })}
                  onClose={() => {}}
                  initialIndex={0}
                />
              </div>
            </div>
          )}

          {/* Report Files - Show embedded viewer only for accepted Omerald reports, thumbnails for user-uploaded and others */}
          {shouldShowEmbeddedViewer && reportFiles.length > 0 ? (
            <div className="w-full">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-700">Report Files</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {reportFiles.length} {reportFiles.length === 1 ? 'file' : 'files'}
                  </span>
                  <button
                    onClick={() => {
                      setViewerInitialIndex(0);
                      setViewerOpen(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                  >
                    <EyeIcon className="w-4 h-4" />
                    Fullscreen Viewer
                  </button>
                </div>
              </div>
              
              {/* Embedded Viewer for User-Uploaded Reports */}
              <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-900" style={{ minHeight: '600px', height: '600px', position: 'relative' }}>
                <ReportViewer
                  files={reportFiles.map((url: string) => signedUrls[url] || url)}
                  fileTypes={reportFiles.map((url: string) => {
                    const fileType = getFileType(url);
                    if (fileType !== 'unknown') return fileType;
                    if (isPDF(url)) return 'pdf';
                    if (isImage(url)) return 'image';
                    return 'unknown';
                  })}
                  onClose={() => {}}
                  initialIndex={0}
                />
              </div>
              
              {/* Thumbnail Strip Below Viewer */}
              {reportFiles.length > 1 && (
                <div className="mt-4">
                  <p className="text-xs text-gray-500 mb-2">Click thumbnail to switch file</p>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {reportFiles.map((url: string, index: number) => {
                      const displayUrl = signedUrls[url] || url;
                      const fileType = getFileType(url);
                      const isPDFFile = fileType === 'pdf' || isPDF(url);
                      const isImageFile = fileType === 'image' || isImage(url);
                      const isMissing = missingFiles[url];
                      
                      return (
                        <div
                          key={index}
                          className="border-2 border-gray-200 rounded-lg overflow-hidden bg-white cursor-pointer hover:border-indigo-500 transition-all shrink-0"
                          style={{ width: '120px', height: '120px' }}
                          onClick={() => {
                            setViewerInitialIndex(index);
                            setViewerOpen(true);
                          }}
                        >
                          {isMissing ? (
                            <div className="w-full h-full bg-red-50 flex flex-col items-center justify-center p-2">
                              <DocumentIcon className="w-6 h-6 text-red-400 mb-1" />
                              <p className="text-[10px] text-red-600 text-center">Error</p>
                            </div>
                          ) : isImageFile ? (
                            <div className="relative w-full h-full bg-gray-100">
                              <Image
                                src={displayUrl}
                                alt={`Report thumbnail ${index + 1}`}
                                fill
                                className="object-cover"
                                onError={() => handleImageError(url, index)}
                                unoptimized
                              />
                            </div>
                          ) : isPDFFile ? (
                            <div className="w-full h-full bg-blue-50 flex flex-col items-center justify-center p-2">
                              <DocumentIcon className="w-8 h-8 text-blue-600 mb-1" />
                              <p className="text-[10px] font-medium text-blue-800 text-center">PDF</p>
                            </div>
                          ) : (
                            <div className="w-full h-full bg-gray-50 flex flex-col items-center justify-center p-2">
                              <DocumentIcon className="w-8 h-8 text-gray-400 mb-1" />
                              <p className="text-[10px] text-gray-600 text-center">File {index + 1}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (!shouldShowPDFViewer && reportFiles.length > 0) ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-700">Report Files</p>
                {/* Open Viewer button hidden for now */}
                {/* <button
                  onClick={() => {
                    setViewerInitialIndex(0);
                    setViewerOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                >
                  <EyeIcon className="w-4 h-4" />
                  Open Viewer
                </button> */}
              </div>
              
              {/* Thumbnail Grid with Previews */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {reportFiles.map((url: string, index: number) => {
                  const displayUrl = signedUrls[url] || url;
                  // Use both original URL and display URL for file type detection
                  const fileType = getFileType(url) !== 'unknown' ? getFileType(url) : getFileType(displayUrl);
                  const isPDFFile = fileType === 'pdf' || isPDF(url) || isPDF(displayUrl);
                  const isImageFile = fileType === 'image' || isImage(url) || isImage(displayUrl);
                  const isMissing = missingFiles[url];
                  
                  return (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-lg overflow-hidden bg-white cursor-pointer hover:shadow-lg transition-all group relative"
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        // Ensure signed URL is ready before opening viewer
                        const urlToUse = signedUrls[url] || url;
                        if (!signedUrls[url] && (url.includes('amazonaws.com') || url.includes('s3.'))) {
                          // Try to get signed URL first
                          await getSignedUrlForFile(url);
                        }
                        
                        console.log('Opening viewer for file:', index, { original: url, signed: signedUrls[url], display: urlToUse });
                        setViewerInitialIndex(index);
                        setViewerOpen(true);
                      }}
                    >
                      {isMissing ? (
                        <div className="aspect-square bg-red-50 flex flex-col items-center justify-center p-4">
                          <DocumentIcon className="w-8 h-8 text-red-400 mb-1" />
                          <p className="text-xs text-red-600 text-center">Error</p>
                        </div>
                      ) : isImageFile ? (
                        <div className="relative aspect-square bg-gray-100 overflow-hidden">
                          {imageErrors[url] || missingFiles[url] ? (
                            <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-red-50">
                              <DocumentIcon className="w-8 h-8 text-red-400 mb-1" />
                              <p className="text-xs text-red-600 text-center">Error loading</p>
                            </div>
                          ) : (
                            <>
                              <Image
                                src={displayUrl}
                                alt={`Report thumbnail ${index + 1}`}
                                fill
                                className="object-cover group-hover:scale-110 transition-transform duration-300"
                                onError={() => handleImageError(url, index)}
                                unoptimized
                                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="bg-white/90 rounded-full p-3">
                                  <EyeIcon className="w-6 h-6 text-indigo-600" />
                                </div>
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <p className="text-xs font-medium text-center">Click to view</p>
                              </div>
                            </>
                          )}
                        </div>
                      ) : isPDFFile ? (
                        <div className="aspect-square bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex flex-col items-center justify-center p-4 relative overflow-hidden group">
                          {/* PDF Preview Background Pattern */}
                          <div className="absolute inset-0 opacity-10">
                            <div className="w-full h-full" style={{
                              backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(59, 130, 246, 0.1) 10px, rgba(59, 130, 246, 0.1) 20px)`
                            }} />
                          </div>
                          {/* PDF Preview using small iframe (hidden by default, shows on hover) */}
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                            <iframe
                              src={`${displayUrl}#page=1&toolbar=0&navpanes=0&zoom=page-fit`}
                              className="w-full h-full border-0"
                              title={`PDF preview ${index + 1}`}
                              style={{ transform: 'scale(0.3)', transformOrigin: 'top left', width: '333%', height: '333%' }}
                            />
                          </div>
                          <div className="relative z-10 flex flex-col items-center group-hover:opacity-0 transition-opacity duration-300">
                            <div className="relative">
                              <DocumentIcon className="w-16 h-16 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
                              <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-[8px] font-bold">PDF</span>
                              </div>
                            </div>
                            <p className="text-xs font-semibold text-blue-800 text-center mb-1">PDF Document</p>
                            <p className="text-[10px] text-blue-600 text-center">Click to view</p>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-600/90 to-transparent text-white p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <p className="text-xs font-medium text-center">Open in Viewer</p>
                          </div>
                        </div>
                      ) : (
                        <div className="aspect-square bg-gray-50 flex flex-col items-center justify-center p-4 group-hover:bg-gray-100 transition-colors">
                          <DocumentIcon className="w-12 h-12 text-gray-400 mb-2 group-hover:text-gray-600 transition-colors" />
                          <p className="text-xs text-gray-600 text-center">File {index + 1}</p>
                          <p className="text-[10px] text-gray-500 mt-1">Click to view</p>
                        </div>
                      )}
                      <div className="p-2 bg-white border-t border-gray-100">
                        <p className="text-xs text-gray-700 font-medium truncate text-center">
                          {isPDFFile ? 'PDF Document' : isImageFile ? 'Image' : 'File'} {index + 1}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">Report Files</p>
              <div className="p-8 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex flex-col items-center justify-center">
                  <DocumentIcon className="w-16 h-16 text-yellow-400 mb-2" />
                  <p className="text-sm font-medium text-yellow-800 mb-1">No Files Available</p>
                  <p className="text-xs text-yellow-600 text-center">
                    This report does not have any files attached. The files may not have been uploaded successfully.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Report Viewer Modal */}
          {viewerOpen && reportFiles.length > 0 && (
            <div 
              className="fixed inset-0 bg-black/95 z-[10000] flex items-center justify-center p-0"
              style={{ width: '100vw', height: '100vh' }}
              onClick={(e) => {
                // Close on backdrop click
                if (e.target === e.currentTarget) {
                  setViewerOpen(false);
                }
              }}
            >
              <div className="w-full h-full relative" style={{ width: '100%', height: '100%' }}>
                <ReportViewer
                  files={reportFiles
                    .map((url: string) => {
                      const signedUrl = signedUrls[url];
                      const finalUrl = signedUrl || url;
                      // Ensure URL is valid
                      if (!finalUrl || finalUrl.trim() === '') {
                        console.error('Empty or invalid URL:', url, signedUrl);
                        return null;
                      }
                      console.log('Viewer file URL:', { original: url, signed: signedUrl, final: finalUrl });
                      return finalUrl;
                    })
                    .filter((url: string | null): url is string => url !== null && url.trim() !== '')}
                  fileTypes={reportFiles
                    .map((url: string, index: number) => {
                      const displayUrl = signedUrls[url] || url;
                      
                      // First check report.fileType if available
                      if (report?.fileType === 'pdf' || report?.fileType === 'image') {
                        return report.fileType;
                      }
                      
                      // Check both original URL and signed URL for file type
                      const fileTypeFromUrl = getFileType(url);
                      const fileTypeFromDisplay = getFileType(displayUrl);
                      
                      if (fileTypeFromUrl !== 'unknown') return fileTypeFromUrl;
                      if (fileTypeFromDisplay !== 'unknown') return fileTypeFromDisplay;
                      
                      // Fallback checks
                      if (isPDF(url) || isPDF(displayUrl)) return 'pdf';
                      if (isImage(url) || isImage(displayUrl)) return 'image';
                      
                      console.warn('Unknown file type for:', url, displayUrl);
                      return 'unknown';
                    })
                    .filter((type: string) => type !== 'unknown')}
                  onClose={() => {
                    console.log('Closing viewer');
                    setViewerOpen(false);
                  }}
                  initialIndex={Math.min(viewerInitialIndex, reportFiles.length - 1)}
                />
              </div>
            </div>
          )}

          {/* Actions for Pending Reports */}
          {showActions && (report.status === 'pending' || report.shareDetail?.accepted === false) && (
            <div className="flex justify-between items-center gap-3 pt-4 border-t border-gray-200 sticky bottom-0 bg-white pb-2">
              <button
                onClick={() => {
                  if (onReject) {
                    onReject();
                  } else {
                    // Fallback if onReject not provided
                    if (confirm('Are you sure you want to reject this report?')) {
                      alert('Reject functionality not available for this report.');
                    }
                  }
                }}
                className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                title="Reject this report"
              >
                Reject
              </button>
              <div className="flex gap-3 ml-auto">
                <button
                  onClick={() => setVisible(false)}
                  className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (onAccept) onAccept();
                  }}
                  className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Accept & Save
                </button>
              </div>
            </div>
          )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

