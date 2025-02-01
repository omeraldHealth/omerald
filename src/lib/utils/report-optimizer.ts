/**
 * Report Optimizer
 * Optimizes report processing for users with many reports (10-20+)
 */

export interface Report {
  _id?: any;
  reportId?: string;
  reportDate?: Date;
  uploadDate?: Date;
  updatedTime?: Date;
  parsedData?: Array<{
    keyword: string;
    value: string;
    unit?: string;
    normalRange?: string;
  }>;
  parameters?: Array<any>;
  parametersScanned?: boolean;
  conditions?: string[];
  name?: string;
  testName?: string;
  type?: string;
}

export interface OptimizationConfig {
  maxReportsToScan?: number; // Max reports to scan with GPT Vision
  maxParametersForGPT?: number; // Max parameters to send to GPT
  prioritizeRecent?: boolean; // Prioritize recent reports
  useCaching?: boolean; // Use cached results
  maxReportAge?: number; // Max age in days for reports to include
}

const DEFAULT_CONFIG: Required<OptimizationConfig> = {
  maxReportsToScan: 10, // Only scan 10 most recent/relevant reports
  maxParametersForGPT: 50, // Limit parameters sent to GPT
  prioritizeRecent: true,
  useCaching: true,
  maxReportAge: 365, // Only consider reports from last year
};

/**
 * Sort reports by relevance (most recent first, then by parameters count)
 */
function sortReportsByRelevance(reports: Report[]): Report[] {
  return [...reports].sort((a, b) => {
    const dateA = a.reportDate || a.uploadDate || new Date(0);
    const dateB = b.reportDate || b.uploadDate || new Date(0);
    
    // Most recent first
    if (dateB.getTime() !== dateA.getTime()) {
      return dateB.getTime() - dateA.getTime();
    }
    
    // Then by parameter count (more parameters = more relevant)
    const paramsA = (a.parsedData?.length || 0) + (a.parameters?.length || 0);
    const paramsB = (b.parsedData?.length || 0) + (b.parameters?.length || 0);
    
    return paramsB - paramsA;
  });
}

/**
 * Filter reports by age
 */
function filterReportsByAge(
  reports: Report[],
  maxAgeDays: number
): Report[] {
  if (!maxAgeDays || maxAgeDays <= 0) return reports;
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);
  
  return reports.filter(report => {
    const reportDate = report.reportDate || report.uploadDate;
    if (!reportDate) return true; // Include if no date
    
    return new Date(reportDate) >= cutoffDate;
  });
}

/**
 * Select reports for GPT Vision scanning
 * Prioritizes recent reports and those with most parameters
 */
export function selectReportsForScanning(
  reports: Report[],
  config: OptimizationConfig = {}
): Report[] {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Filter by age if specified
  let filteredReports = finalConfig.maxReportAge > 0
    ? filterReportsByAge(reports, finalConfig.maxReportAge)
    : reports;
  
  // Sort by relevance
  if (finalConfig.prioritizeRecent) {
    filteredReports = sortReportsByRelevance(filteredReports);
  }
  
  // Limit number of reports to scan
  const reportsToScan = filteredReports.slice(0, finalConfig.maxReportsToScan);
  
  console.log(`Selected ${reportsToScan.length} reports for scanning out of ${reports.length} total`);
  
  return reportsToScan;
}

/**
 * Select reports to use for parameter extraction
 * Uses all reports but prioritizes recent ones
 */
export function selectReportsForParameterExtraction(
  reports: Report[],
  config: OptimizationConfig = {}
): Report[] {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Filter by age if specified
  let filteredReports = finalConfig.maxReportAge > 0
    ? filterReportsByAge(reports, finalConfig.maxReportAge)
    : reports;
  
  // Sort by relevance
  if (finalConfig.prioritizeRecent) {
    filteredReports = sortReportsByRelevance(filteredReports);
  }
  
  return filteredReports;
}

/**
 * Summarize parameters for GPT analysis
 * Groups similar parameters and selects most abnormal ones
 */
export interface Parameter {
  name: string;
  value: string | number;
  unit?: string;
  normalRange?: string;
  isAbnormal?: boolean;
  reportName?: string;
  reportDate?: Date;
}

export function optimizeParametersForGPT(
  parameters: Parameter[],
  maxParameters: number = 50
): Parameter[] {
  if (parameters.length <= maxParameters) {
    return parameters;
  }
  
  // Separate abnormal and normal parameters
  const abnormal = parameters.filter(p => p.isAbnormal);
  const normal = parameters.filter(p => !p.isAbnormal);
  
  // Always include all abnormal parameters (they're most important)
  if (abnormal.length >= maxParameters) {
    // If too many abnormal, prioritize by severity
    return abnormal
      .sort((a, b) => {
        // Sort by how far outside range (rough estimate)
        const aValue = typeof a.value === 'number' ? a.value : parseFloat(String(a.value));
        const bValue = typeof b.value === 'number' ? b.value : parseFloat(String(b.value));
        return Math.abs(bValue) - Math.abs(aValue);
      })
      .slice(0, maxParameters);
  }
  
  // Include all abnormal + some normal (up to max)
  const remaining = maxParameters - abnormal.length;
  const selectedNormal = normal.slice(0, remaining);
  
  return [...abnormal, ...selectedNormal];
}

/**
 * Group parameters by name to avoid duplicates
 */
export function deduplicateParameters(parameters: Parameter[]): Parameter[] {
  const paramMap = new Map<string, Parameter>();
  
  for (const param of parameters) {
    const key = param.name.toLowerCase().trim();
    
    // If we already have this parameter, keep the one with more info or from more recent report
    if (paramMap.has(key)) {
      const existing = paramMap.get(key)!;
      
      // Prefer abnormal over normal
      if (param.isAbnormal && !existing.isAbnormal) {
        paramMap.set(key, param);
        continue;
      }
      
      // Prefer one with normal range
      if (param.normalRange && !existing.normalRange) {
        paramMap.set(key, param);
        continue;
      }
      
      // Prefer more recent report
      if (param.reportDate && existing.reportDate) {
        if (new Date(param.reportDate) > new Date(existing.reportDate)) {
          paramMap.set(key, param);
        }
      }
    } else {
      paramMap.set(key, param);
    }
  }
  
  return Array.from(paramMap.values());
}

/**
 * Get summary statistics for many reports
 */
export function getReportSummary(reports: Report[]): {
  totalReports: number;
  reportsWithParameters: number;
  reportsWithConditions: number;
  totalParameters: number;
  totalAbnormalParameters: number;
  dateRange: { oldest: Date | null; newest: Date | null };
} {
  let reportsWithParameters = 0;
  let reportsWithConditions = 0;
  let totalParameters = 0;
  let totalAbnormalParameters = 0;
  const dates: Date[] = [];
  
  for (const report of reports) {
    const paramCount = (report.parsedData?.length || 0) + (report.parameters?.length || 0);
    if (paramCount > 0) {
      reportsWithParameters++;
      totalParameters += paramCount;
      
      // Count abnormal (rough estimate - check if value is outside range)
      if (report.parsedData) {
        for (const param of report.parsedData) {
          if (param.normalRange && param.value) {
            // Simple check - if we can't determine, assume normal
            // This is a rough estimate
            totalAbnormalParameters += 0; // Would need proper range checking
          }
        }
      }
    }
    
    if (report.conditions && report.conditions.length > 0) {
      reportsWithConditions++;
    }
    
    const reportDate = report.reportDate || report.uploadDate;
    if (reportDate) {
      dates.push(new Date(reportDate));
    }
  }
  
  return {
    totalReports: reports.length,
    reportsWithParameters,
    reportsWithConditions,
    totalParameters,
    totalAbnormalParameters,
    dateRange: {
      oldest: dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : null,
      newest: dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : null,
    },
  };
}

/**
 * Check if report has been recently scanned (for caching)
 */
export function shouldRescanReport(
  report: Report,
  maxAgeDays: number = 30
): boolean {
  // If report has parametersScanned flag and it's recent, skip
  if (report.parametersScanned) {
    const lastScanned = report.updatedTime || report.uploadDate;
    if (lastScanned) {
      const ageDays = (Date.now() - new Date(lastScanned).getTime()) / (1000 * 60 * 60 * 24);
      if (ageDays < maxAgeDays) {
        return false; // Don't rescan if recently scanned
      }
    }
  }
  
  return true; // Rescan if not recently scanned or no flag
}

