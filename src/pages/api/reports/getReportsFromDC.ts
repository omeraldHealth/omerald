import { NextApiRequest, NextApiResponse } from 'next';

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

  if (!req.body || !req.body.phoneNumber) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_PHONE_NUMBER',
        message: 'phoneNumber is required in request body',
      },
    });
  }

  try {
    const { phoneNumber } = req.body;

    // Normalize phone number
    const normalizePhone = (phone: string) => {
      if (!phone) return '';
      return phone.replace(/\s/g, '').startsWith('+') ? phone.replace(/\s/g, '') : `+${phone.replace(/\s/g, '')}`;
    };

    const normalizedUserPhone = normalizePhone(phoneNumber);

    // Fetch reports from DC API with sharedWithPhone query parameter for efficient server-side filtering
    // This is much more efficient than fetching all reports and filtering client-side
    const DC_API_BASE_URL = process.env.DC_API_BASE_URL || process.env.NEXT_PUBLIC_DC_API_BASE_URL || 'https://diagnostic.omerald.com';
    const dcApiUrl = `${DC_API_BASE_URL}/api/reports?sharedWithPhone=${encodeURIComponent(normalizedUserPhone)}&pageSize=1000`;
    
    console.log('Fetching DC reports for phone:', normalizedUserPhone);
    const response = await fetch(dcApiUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch reports: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // Handle nested response structure from DC API
    let reportsArray: any[] = [];
    if (result?.success && result?.data) {
      if (result.data.data && Array.isArray(result.data.data)) {
        reportsArray = result.data.data;
      } else if (Array.isArray(result.data)) {
        reportsArray = result.data;
      }
    } else if (Array.isArray(result)) {
      reportsArray = result;
    }
    
    console.log(`Found ${reportsArray.length} reports for ${normalizedUserPhone} from DC API`);
    
    // Filter out rejected reports (DC API may still return them, so we filter client-side)
    // Return all reports (both pending and accepted) - client-side will filter based on accepted/rejected status
    const filteredReports = reportsArray.filter((report: any) => {
      if (!report.sharedReportDetails || !Array.isArray(report.sharedReportDetails)) {
        return false;
      }
      return report.sharedReportDetails.some((detail: any) => {
        const normalizedDetailPhone = normalizePhone(detail.userContact || '');
        // Include reports that match the user's phone number and are not blocked or rejected
        return normalizedDetailPhone === normalizedUserPhone && 
               detail.blocked !== true &&
               (detail.rejected === false || detail.rejected === undefined || detail.rejected === null);
      });
    });
    
    console.log(`After filtering rejected/blocked: ${filteredReports.length} reports`);
    
    // Try to enrich reports with diagnostic center and branch names
    // Collect unique diagnostic center and branch IDs
    const diagnosticIds = new Set<string>();
    const branchIds = new Set<string>();
    filteredReports.forEach((report: any) => {
      if (report.diagnosticCenter?.diagnostic) {
        const dcId = typeof report.diagnosticCenter.diagnostic === 'string' 
          ? report.diagnosticCenter.diagnostic 
          : report.diagnosticCenter.diagnostic.id || report.diagnosticCenter.diagnostic;
        if (dcId) diagnosticIds.add(dcId);
      }
      if (report.diagnosticCenter?.branch) {
        const branchId = typeof report.diagnosticCenter.branch === 'string' 
          ? report.diagnosticCenter.branch 
          : report.diagnosticCenter.branch.id || report.diagnosticCenter.branch;
        if (branchId) branchIds.add(branchId);
      }
    });
    
    // Try to fetch diagnostic center and branch details (if API supports it)
    // For now, we'll return the reports as-is since the DC API doesn't provide a lookup endpoint
    // The frontend will handle displaying IDs in a user-friendly way
    
    return res.status(200).json({
      success: true,
      data: {
        reports: filteredReports,
        total: filteredReports.length,
      },
    });
  } catch (error: any) {
    console.error('Error fetching reports from DC:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to fetch reports from DC',
      },
    });
  }
};

export default handler;

