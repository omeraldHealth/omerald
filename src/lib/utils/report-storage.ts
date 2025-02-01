/**
 * Local Storage Utility for Report Analysis Patterns
 * Stores report analysis data and patterns for intelligent condition detection
 */

interface ReportAnalysisPattern {
  reportId: string;
  userId: string;
  conditions: string[];
  parameters: string[];
  scannedAt: string;
  reportDate?: string;
}

interface UserReportSummary {
  userId: string;
  reportCount: number;
  lastScannedAt: string;
  scannedReportIds: string[];
  commonConditions: string[];
  commonParameters: string[];
}

const STORAGE_KEY_PREFIX = 'omerald_report_analysis_';
const REPORT_COUNT_KEY_PREFIX = 'omerald_report_count_';
const PATTERNS_KEY_PREFIX = 'omerald_report_patterns_';

/**
 * Get storage key for user
 */
function getUserKey(userId: string, suffix: string): string {
  return `${STORAGE_KEY_PREFIX}${userId}_${suffix}`;
}

/**
 * Get report count key for user
 */
function getReportCountKey(userId: string): string {
  return `${REPORT_COUNT_KEY_PREFIX}${userId}`;
}

/**
 * Get patterns key for user
 */
function getPatternsKey(userId: string): string {
  return `${PATTERNS_KEY_PREFIX}${userId}`;
}

/**
 * Store report count for a user
 */
export function storeReportCount(userId: string, count: number): void {
  if (typeof window === 'undefined') return;
  
  try {
    const key = getReportCountKey(userId);
    const data = {
      count,
      lastUpdated: new Date().toISOString(),
    };
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Error storing report count:', error);
  }
}

/**
 * Get stored report count for a user
 */
export function getStoredReportCount(userId: string): number | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const key = getReportCountKey(userId);
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    
    const data = JSON.parse(stored);
    return data.count ?? null;
  } catch (error) {
    console.error('Error getting stored report count:', error);
    return null;
  }
}

/**
 * Check if report count has increased (new reports added)
 */
export function hasReportCountIncreased(userId: string, currentCount: number): boolean {
  const storedCount = getStoredReportCount(userId);
  
  if (storedCount === null) {
    // First time, store the count
    storeReportCount(userId, currentCount);
    return true; // Consider it as "increased" to trigger initial scan
  }
  
  const increased = currentCount > storedCount;
  
  if (increased) {
    // Update stored count
    storeReportCount(userId, currentCount);
  }
  
  return increased;
}

/**
 * Store report analysis pattern
 */
export function storeReportPattern(userId: string, pattern: ReportAnalysisPattern): void {
  if (typeof window === 'undefined') return;
  
  try {
    const key = getPatternsKey(userId);
    const stored = localStorage.getItem(key);
    const patterns: ReportAnalysisPattern[] = stored ? JSON.parse(stored) : [];
    
    // Remove existing pattern for this report if any
    const filtered = patterns.filter(p => p.reportId !== pattern.reportId);
    
    // Add new pattern
    filtered.push(pattern);
    
    localStorage.setItem(key, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error storing report pattern:', error);
  }
}

/**
 * Get stored patterns for a user
 */
export function getStoredPatterns(userId: string): ReportAnalysisPattern[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const key = getPatternsKey(userId);
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error getting stored patterns:', error);
    return [];
  }
}

/**
 * Get pattern for a specific report
 */
export function getReportPattern(userId: string, reportId: string): ReportAnalysisPattern | null {
  const patterns = getStoredPatterns(userId);
  return patterns.find(p => p.reportId === reportId) || null;
}

/**
 * Get user report summary
 */
export function getUserReportSummary(userId: string): UserReportSummary | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const patterns = getStoredPatterns(userId);
    const reportCount = getStoredReportCount(userId) || 0;
    
    // Extract common conditions and parameters
    const conditionCounts: { [key: string]: number } = {};
    const parameterCounts: { [key: string]: number } = {};
    
    patterns.forEach(pattern => {
      pattern.conditions.forEach(condition => {
        conditionCounts[condition] = (conditionCounts[condition] || 0) + 1;
      });
      pattern.parameters.forEach(param => {
        parameterCounts[param] = (parameterCounts[param] || 0) + 1;
      });
    });
    
    // Get most common (appearing in 2+ reports)
    const commonConditions = Object.entries(conditionCounts)
      .filter(([_, count]) => count >= 2)
      .map(([condition]) => condition);
    
    const commonParameters = Object.entries(parameterCounts)
      .filter(([_, count]) => count >= 2)
      .map(([param]) => param);
    
    const lastScanned = patterns.length > 0
      ? patterns.reduce((latest, p) => 
          new Date(p.scannedAt) > new Date(latest.scannedAt) ? p : latest,
          patterns[0]
        ).scannedAt
      : new Date().toISOString();
    
    return {
      userId,
      reportCount,
      lastScannedAt: lastScanned,
      scannedReportIds: patterns.map(p => p.reportId),
      commonConditions,
      commonParameters,
    };
  } catch (error) {
    console.error('Error getting user report summary:', error);
    return null;
  }
}

/**
 * Clear all stored data for a user (useful for testing or reset)
 */
export function clearUserReportData(userId: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(getReportCountKey(userId));
    localStorage.removeItem(getPatternsKey(userId));
  } catch (error) {
    console.error('Error clearing user report data:', error);
  }
}

/**
 * Get list of unscanned report IDs (reports that haven't been analyzed yet)
 */
export function getUnscannedReportIds(userId: string, allReportIds: string[]): string[] {
  const patterns = getStoredPatterns(userId);
  const scannedIds = new Set(patterns.map(p => p.reportId));
  
  return allReportIds.filter(id => !scannedIds.has(id));
}







