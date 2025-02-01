/**
 * Extract parameters from reports based on DC parameter schema
 * For DC reports: Extract from parsedData.parameters
 * For user-uploaded reports: Scan using GPT Vision and extract parameters
 */

import { scanReportFile } from './report-scanner';

/**
 * DC Parameter Schema Interface
 */
export interface DCParameter {
  name: string;
  value: any; // Can be string or number
  units?: string;
  bioRefRange?: any; // Can be object or string
  subText?: string;
  description?: string;
}

/**
 * Convert scanned parameters to DC parameter schema format
 */
function convertToDCParameterSchema(
  scannedParams: Array<{
    name: string;
    value: string | number;
    unit?: string;
    normalRange?: string;
    isAbnormal?: boolean;
  }>
): DCParameter[] {
  return scannedParams.map((param) => ({
    name: param.name,
    value: param.value,
    units: param.unit || undefined,
    bioRefRange: param.normalRange || undefined,
    subText: param.isAbnormal ? 'Abnormal' : undefined,
    description: undefined,
  }));
}

/**
 * Extract parameters from DC report's parsedData.parameters
 */
function extractParametersFromDCReport(parsedData: any): DCParameter[] {
  if (!parsedData || !parsedData.parameters) {
    return [];
  }

  const params = Array.isArray(parsedData.parameters) ? parsedData.parameters : [];
  
  return params.map((param: any) => ({
    name: param.name || '',
    value: param.value !== undefined ? param.value : '',
    units: param.units || undefined,
    bioRefRange: param.bioRefRange || undefined,
    subText: param.subText || undefined,
    description: param.description || undefined,
  }));
}

/**
 * Extract parameters from report
 * For DC reports: Extract from parsedData.parameters or reportData.parsedData.parameters
 * For user-uploaded reports: Scan and extract
 */
export async function extractReportParameters(
  report: any,
  memberInfo?: { age?: number; gender?: string }
): Promise<DCParameter[]> {
  try {
    // Check for DC report parameters in multiple possible locations
    // 1. parsedData.parameters (direct)
    if (report.parsedData?.parameters && Array.isArray(report.parsedData.parameters)) {
      console.log(`Extracting parameters from DC report (parsedData.parameters): ${report.reportId || report._id}`);
      return extractParametersFromDCReport(report.parsedData);
    }
    
    // 2. reportData.parsedData.parameters (DC report structure)
    if (report.reportData?.parsedData?.parameters && Array.isArray(report.reportData.parsedData.parameters)) {
      console.log(`Extracting parameters from DC report (reportData.parsedData.parameters): ${report.reportId || report._id}`);
      return extractParametersFromDCReport(report.reportData.parsedData);
    }

    // For user-uploaded reports or DC reports without parameters, scan the report
    if (!report.reportUrl && !report.reportDoc) {
      console.warn(`No report URL found for report: ${report.reportId || report._id}`);
      return [];
    }

    const reportUrl = report.reportUrl || report.reportDoc;
    if (!reportUrl) {
      return [];
    }

    console.log(`Scanning user-uploaded report: ${report.reportId || report._id}`);

    // Determine file type
    const fileType = report.fileType || (reportUrl.toLowerCase().includes('.pdf') ? 'pdf' : 'image');

    // Scan the report
    const scannedData = await scanReportFile(
      {
        url: reportUrl,
        reportId: report.reportId || report._id?.toString() || '',
        type: fileType,
      },
      memberInfo
    );

    if (!scannedData || !scannedData.parameters) {
      console.warn(`No parameters extracted from report: ${report.reportId || report._id}`);
      return [];
    }

    // Convert to DC parameter schema format
    return convertToDCParameterSchema(scannedData.parameters);
  } catch (error: any) {
    console.error(`Error extracting parameters from report: ${error.message}`);
    return [];
  }
}

