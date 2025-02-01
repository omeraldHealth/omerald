import { NextApiRequest, NextApiResponse } from 'next';
import connectDBMiddleware from '@/lib/middleware/connectDB';
import ReportsTable from '@/lib/models/Reports';
import ProfileTable from '@/lib/models/Profile';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: `Method ${req.method} not allowed. Only POST is supported.`,
      },
    });
  }

  if (!req.body) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'EMPTY_BODY',
        message: 'Request body cannot be empty',
      },
    });
  }

  if (!req.body.phoneNumber || typeof req.body.phoneNumber !== 'string') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_PHONE_NUMBER',
        message: 'phoneNumber must be a non-empty string in the request body',
      },
    });
  }

  try {
    // Normalize phone number (remove spaces, ensure + prefix)
    let normalizedPhone = req.body.phoneNumber.replace(/\s/g, '');
    if (!normalizedPhone.startsWith('+')) {
      normalizedPhone = '+' + normalizedPhone;
    }

    // Fetch reports from Reports collection where:
    // 1. The user's phone number is in the sharedWith array
    // Note: We don't filter by status because status is for report processing, not sharing
    const allReportsFromCollection = await ReportsTable.find({}).sort({ reportDate: -1 });

    // Filter reports where the user's phone number is in sharedWith array
    const reportsFromCollection = allReportsFromCollection.filter((report: any) => {
      const sharedWith = report.sharedWith || [];
      return sharedWith.some((share: any) => {
        const sharePhone = (share.phoneNumber || '').replace(/\s/g, '');
        const normalizedSharePhone = sharePhone.startsWith('+') ? sharePhone : `+${sharePhone}`;
        return normalizedSharePhone === normalizedPhone;
      });
    });

    // Also check profile.reports for shared reports
    // We need to find all profiles and check their reports
    const allProfiles = await ProfileTable.find({}).select('phoneNumber firstName lastName reports');

    // Extract reports from profile.reports that are shared with this user
    const reportsFromProfile: any[] = [];
    allProfiles.forEach((profile: any) => {
      if (profile.reports && Array.isArray(profile.reports) && profile.reports.length > 0) {
        profile.reports.forEach((report: any, index: number) => {
          // Skip if report is null or undefined
          // Note: We don't filter by status because status is for report processing, not sharing
          if (!report) return;
          
          // Check if this report is shared with the user
          const sharedWith = report.sharedWith || [];
          const isSharedWithUser = sharedWith.some((share: any) => {
            const sharePhone = (share.phoneNumber || '').replace(/\s/g, '');
            const normalizedSharePhone = sharePhone.startsWith('+') ? sharePhone : `+${sharePhone}`;
            return normalizedSharePhone === normalizedPhone;
          });

          if (!isSharedWithUser) return;

          // Normalize report from profile to match Reports collection schema
          const existingReportId = report.reportId || report.id;
          const stableReportId = existingReportId || `PROFILE-${profile.phoneNumber}-${index}-${report.reportUrl || report.reportDoc || report.name || 'report'}`;
          
          const normalizedReport = {
            ...report,
            userId: report.userId || profile.phoneNumber,
            userName: report.userName || `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || profile.phoneNumber,
            reportId: stableReportId,
            reportDate: report.reportDate ? new Date(report.reportDate) : (report.uploadDate ? new Date(report.uploadDate) : (report.uploadedAt ? new Date(report.uploadedAt) : new Date())),
            uploadDate: report.uploadDate ? new Date(report.uploadDate) : (report.uploadedAt ? new Date(report.uploadedAt) : new Date()),
            uploadedAt: report.uploadedAt ? new Date(report.uploadedAt) : (report.uploadDate ? new Date(report.uploadDate) : new Date()),
            status: 'pending',
            _id: report._id || report.id || stableReportId,
            name: report.name || report.testName || 'Report',
            testName: report.testName || report.name || 'Report',
            type: report.type || report.documentType || 'Blood Report',
            documentType: report.documentType || report.type || 'Blood Report',
            reportUrl: report.reportUrl || (typeof report.reportDoc === 'string' ? report.reportDoc.split(',')[0] : report.reportDoc) || '',
            reportDoc: report.reportDoc || report.reportUrl || '',
            description: report.description || '',
            remarks: report.remarks || '',
            conditions: report.conditions || [],
            sharedWith: report.sharedWith || [],
            _fromProfile: true,
            // Mark as shared report
            isSharedReport: true,
            // Get the sharer info from sharedWith array
            sharedBy: sharedWith.find((share: any) => {
              const sharePhone = (share.phoneNumber || '').replace(/\s/g, '');
              const normalizedSharePhone = sharePhone.startsWith('+') ? sharePhone : `+${sharePhone}`;
              return normalizedSharePhone === normalizedPhone;
            })?.name || profile.phoneNumber,
            sharedAt: sharedWith.find((share: any) => {
              const sharePhone = (share.phoneNumber || '').replace(/\s/g, '');
              const normalizedSharePhone = sharePhone.startsWith('+') ? sharePhone : `+${sharePhone}`;
              return normalizedSharePhone === normalizedPhone;
            })?.sharedAt || report.uploadDate || report.uploadedAt,
          };
          reportsFromProfile.push(normalizedReport);
        });
      }
    });

    // Deduplicate reports based on reportId
    const reportMap = new Map();
    reportsFromCollection.forEach((report: any) => {
      const reportId = report.reportId || report._id?.toString();
      if (reportId) {
        reportMap.set(reportId, {
          ...report.toObject ? report.toObject() : report,
          isSharedReport: true,
        });
      }
    });

    // Add reports from profile.reports only if they don't already exist
    reportsFromProfile.forEach((report: any) => {
      const reportId = report.reportId || report._id?.toString();
      if (reportId && !reportMap.has(reportId)) {
        reportMap.set(reportId, report);
      }
    });

    // Convert map back to array and sort by reportDate
    const mergedReports = Array.from(reportMap.values()).sort((a: any, b: any) => {
      const dateA = a.reportDate ? new Date(a.reportDate).getTime() : 0;
      const dateB = b.reportDate ? new Date(b.reportDate).getTime() : 0;
      return dateB - dateA; // Sort descending (newest first)
    });

    return res.status(200).json({
      success: true,
      data: mergedReports,
      count: mergedReports.length,
    });
  } catch (error: any) {
    console.error('Error fetching pending shared reports:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to fetch pending shared reports',
      },
    });
  }
};

export const config = {
  api: {
    externalResolver: true,
  },
};

export default connectDBMiddleware(handler);

