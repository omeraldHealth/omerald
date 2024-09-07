import { NextApiRequest, NextApiResponse } from 'next';
import connectDBMiddleware from '@/lib/middleware/connectDB';
import ReportsTable from '@/lib/models/Reports';
import ProfileTable from '@/lib/models/Profile';
import { extractReportParameters } from '@/lib/utils/extract-report-parameters';

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

  if (!req.body.userId) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_USER_ID',
        message: 'userId is required',
      },
    });
  }

  try {
    // Check if this is an accepted shared report (has originalReportId)
    // If so, check if user already has a report with this originalReportId
    if (req.body.originalReportId) {
      const existingReport = await ReportsTable.findOne({
        userId: req.body.userId,
        originalReportId: req.body.originalReportId,
      });
      
      if (existingReport) {
        // Report already accepted by this user, return existing report
        return res.status(200).json({
          success: true,
          data: existingReport,
          message: 'Report already accepted',
        });
      }
    }

    // Check if reportId already exists (for non-shared reports)
    if (req.body.reportId && !req.body.originalReportId) {
      const existingReportById = await ReportsTable.findOne({
        reportId: req.body.reportId,
      });
      
      if (existingReportById) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'DUPLICATE_REPORT_ID',
            message: 'A report with this reportId already exists',
          },
        });
      }
    }

    // Extract parameters if not already scanned and report has data to scan
    let extractedParameters: any[] = [];
    let parametersScanned = false;
    
    // Only scan if parameters are not already provided/scanned and report has URL/doc
    // Check if report already has parametersScanned flag set (from previous insertion)
    if (!req.body.parametersScanned && !req.body.parameters && (req.body.reportUrl || req.body.reportDoc || req.body.parsedData)) {
      try {
        // Get member info for better parameter extraction
        let memberInfo: { age?: number; gender?: string } | undefined;
        try {
          const profile = await ProfileTable.findOne({ phoneNumber: req.body.userId });
          if (profile && profile.dob) {
            const birthDate = new Date(profile.dob);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
              age--;
            }
            memberInfo = {
              age: age >= 0 ? age : undefined,
              gender: profile.gender,
            };
          }
        } catch (profileError) {
          console.error('Error fetching member info for parameter extraction:', profileError);
        }

        // Extract parameters from report
        const reportData = {
          reportId: req.body.reportId || '',
          reportUrl: req.body.reportUrl,
          reportDoc: req.body.reportDoc,
          fileType: req.body.fileType,
          parsedData: req.body.parsedData,
          reportData: req.body.reportData, // Include reportData for DC reports with nested structure
        };

        extractedParameters = await extractReportParameters(reportData, memberInfo);
        parametersScanned = extractedParameters.length > 0;
        
        if (parametersScanned) {
          console.log(`Extracted ${extractedParameters.length} parameters for report: ${req.body.reportId}`);
        }
      } catch (extractionError: any) {
        console.error('Error extracting parameters:', extractionError);
        // Continue with report creation even if parameter extraction fails
      }
    } else if (req.body.parameters) {
      // Parameters already provided (e.g., from DC report)
      extractedParameters = Array.isArray(req.body.parameters) ? req.body.parameters : [];
      parametersScanned = true;
    }

    const ReportsObject = new ReportsTable({
      userId: req.body.userId,
      reportId: req.body.reportId,
      originalReportId: req.body.originalReportId, // Reference to original report if this is an accepted shared report
      reportUrl: req.body.reportUrl,
      name: req.body.name,
      type: req.body.type,
      sharedWith: req.body.sharedWith || [],
      uploadedAt: req.body.uploadedAt ? new Date(req.body.uploadedAt) : new Date(),
      uploadDate: req.body.uploadDate ? new Date(req.body.uploadDate) : new Date(),
      status: req.body.status || 'pending',
      documentType: req.body.documentType,
      conditions: req.body.conditions || [],
      parsedData: req.body.parsedData || [],
      parameters: extractedParameters, // Store extracted parameters
      parametersScanned: parametersScanned, // Mark as scanned
      testName: req.body.testName,
      reportDate: req.body.reportDate ? new Date(req.body.reportDate) : new Date(),
      userName: req.body.userName,
      diagnosticCenter: req.body.diagnosticCenter,
      description: req.body.description,
      remarks: req.body.remarks,
      createdBy: req.body.createdBy || req.body.userId,
      updatedBy: req.body.updatedBy || req.body.userId,
      reportDoc: req.body.reportDoc,
      fileType: req.body.fileType, // Store file type for future reference
    });

    const savedReport = await ReportsObject.save();

    // Also add the report to profile.reports to keep them in sync
    try {
      const profile = await ProfileTable.findOne({ phoneNumber: req.body.userId });
      if (profile) {
        // Convert savedReport to plain object for profile.reports
        const reportForProfile = {
          reportId: savedReport.reportId,
          userId: savedReport.userId,
          userName: savedReport.userName,
          reportUrl: savedReport.reportUrl,
          reportDoc: savedReport.reportDoc,
          name: savedReport.name,
          type: savedReport.type,
          testName: savedReport.testName,
          documentType: savedReport.documentType,
          reportDate: savedReport.reportDate,
          uploadDate: savedReport.uploadDate,
          uploadedAt: savedReport.uploadedAt,
          status: savedReport.status,
          description: savedReport.description || '',
          remarks: savedReport.remarks || '',
          conditions: savedReport.conditions,
          sharedWith: savedReport.sharedWith,
          diagnosticCenter: savedReport.diagnosticCenter,
          createdBy: savedReport.createdBy,
          updatedBy: savedReport.updatedBy,
          _id: savedReport._id,
        };

        // Check if report already exists in profile.reports to avoid duplicates
        const existingReportIndex = profile.reports?.findIndex(
          (r: any) => r.reportId === savedReport.reportId || r._id?.toString() === savedReport._id?.toString()
        );

        if (existingReportIndex === -1 || existingReportIndex === undefined) {
          // Report doesn't exist in profile, add it
          if (!profile.reports) {
            profile.reports = [];
          }
          profile.reports.push(reportForProfile);
          await profile.save();
        }
      }
    } catch (profileError: any) {
      // Log error but don't fail the request if profile update fails
      console.error('Error syncing report to profile:', profileError);
      // Continue with successful response since report was saved to Reports collection
    }

    return res.status(201).json({
      success: true,
      data: savedReport,
      message: 'Report created successfully',
    });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_REPORT_ID',
          message: 'A report with this reportId already exists',
        },
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to create report',
      },
    });
  }
};

export default connectDBMiddleware(handler);

