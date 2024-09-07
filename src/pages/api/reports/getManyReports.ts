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

  if (!req.body.users || !Array.isArray(req.body.users) || req.body.users.length === 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_USERS_ARRAY',
        message: 'users must be a non-empty array in the request body',
      },
    });
  }

  try {
    // Fetch reports from Reports collection
    const reportsFromCollection = await ReportsTable.find({
      userId: { $in: req.body.users },
    }).sort({ reportDate: -1 });

    // Fetch profiles to get reports from profile.reports
    const profiles = await ProfileTable.find({
      phoneNumber: { $in: req.body.users },
    }).select('phoneNumber firstName lastName reports');

    // Extract reports from profile.reports and normalize them
    const reportsFromProfile: any[] = [];
    profiles.forEach((profile: any) => {
      if (profile.reports && Array.isArray(profile.reports) && profile.reports.length > 0) {
        profile.reports.forEach((report: any, index: number) => {
          // Skip if report is null or undefined
          if (!report) return;
          
          // Normalize report from profile to match Reports collection schema
          // Use existing reportId or id, or generate a stable one based on profile and index
          const existingReportId = report.reportId || report.id;
          const stableReportId = existingReportId || `PROFILE-${profile.phoneNumber}-${index}-${report.reportUrl || report.reportDoc || report.name || 'report'}`;
          
          const normalizedReport = {
            ...report,
            userId: report.userId || profile.phoneNumber,
            userName: report.userName || `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || profile.phoneNumber,
            // Ensure report has required fields
            reportId: stableReportId,
            reportDate: report.reportDate ? new Date(report.reportDate) : (report.uploadDate ? new Date(report.uploadDate) : (report.uploadedAt ? new Date(report.uploadedAt) : new Date())),
            uploadDate: report.uploadDate ? new Date(report.uploadDate) : (report.uploadedAt ? new Date(report.uploadedAt) : new Date()),
            uploadedAt: report.uploadedAt ? new Date(report.uploadedAt) : (report.uploadDate ? new Date(report.uploadDate) : new Date()),
            status: report.status || 'accepted',
            // Use existing _id if available, otherwise create a stable one
            _id: report._id || report.id || stableReportId,
            // Ensure all common fields are present
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
            // Mark as from profile for deduplication
            _fromProfile: true,
          };
          reportsFromProfile.push(normalizedReport);
        });
      }
    });

    // Deduplicate reports based on reportId
    // First, add all reports from Reports collection (these take precedence)
    const reportMap = new Map();
    reportsFromCollection.forEach((report: any) => {
      const reportId = report.reportId || report._id?.toString();
      if (reportId) {
        reportMap.set(reportId, report);
      } else {
        // Fallback: use _id or generate a unique key
        const fallbackId = report._id?.toString() || `${report.userId}-${Date.now()}-${Math.random()}`;
        reportMap.set(fallbackId, report);
      }
    });

    // Then, add reports from profile.reports only if they don't already exist
    reportsFromProfile.forEach((report: any) => {
      const reportId = report.reportId || report._id?.toString();
      if (reportId && !reportMap.has(reportId)) {
        // Only add if not already in the map (Reports collection takes precedence)
        reportMap.set(reportId, report);
      } else if (!reportId) {
        // For reports without reportId, check if similar report exists
        // Use a combination of userId and reportUrl or name to identify duplicates
        const fallbackId = `${report.userId}-${report.reportUrl || report.reportDoc || report.name || Date.now()}`;
        if (!reportMap.has(fallbackId)) {
          reportMap.set(fallbackId, report);
        }
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
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to fetch reports',
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

