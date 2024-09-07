import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// Helper function to check if a string looks like a MongoDB ObjectId
const isObjectId = (str: string): boolean => {
  return /^[0-9a-fA-F]{24}$/.test(str);
};

// Global cache for report type names (shared across all instances)
const reportTypeNameCache = new Map<string, string>();

// Helper function to get report type name (handles both ID and name)
const getReportTypeName = async (typeOrId: string | undefined): Promise<string> => {
  if (!typeOrId) return 'Blood Report';
  
  // If it's already a name (not an ObjectId), return it
  if (!isObjectId(typeOrId)) {
    return typeOrId;
  }
  
  // Check cache first
  if (reportTypeNameCache.has(typeOrId)) {
    const cached = reportTypeNameCache.get(typeOrId);
    if (cached && cached !== typeOrId) {
      return cached;
    }
  }
  
  // Fetch from API
  try {
    const response = await axios.post('/api/reportType/getReportType', { _id: typeOrId });
    if (response.data && response.status === 200) {
      const reportType = response.data;
      const name = reportType?.testName || reportType?.name || reportType?.type;
      if (name && name !== typeOrId) {
        reportTypeNameCache.set(typeOrId, name);
        return name;
      }
    }
    // If no valid name found, return ID
    console.warn(`Report type ${typeOrId} found but no name field available`);
    return typeOrId;
  } catch (error: any) {
    // Handle 404 specifically
    if (error?.response?.status === 404) {
      console.warn(`Report type ${typeOrId} not found in database`);
      // Cache the ID itself to avoid repeated failed requests
      reportTypeNameCache.set(typeOrId, typeOrId);
    } else {
      console.error(`Error fetching report type name for ${typeOrId}:`, error?.response?.data || error?.message || error);
    }
    return typeOrId; // Return the ID if fetch fails
  }
};

/**
 * Custom hook to get and cache report type names
 * @param reports - Array of reports to extract report type IDs from
 * @returns Object with getReportTypeDisplayName function and loading state
 */
export function useReportTypeName(reports: any[] = []) {
  const [reportTypeNames, setReportTypeNames] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  // Fetch report type names for all reports
  useEffect(() => {
    const fetchReportTypeNames = async () => {
      if (reports.length === 0) return;

      const typeIds = new Set<string>();
      
      // Collect all unique report type IDs
      reports.forEach((report: any) => {
        const type = report.type || report.documentType;
        if (type && typeof type === 'string' && isObjectId(type)) {
          typeIds.add(type);
        }
      });
      
      if (typeIds.size === 0) {
        return; // No IDs to fetch
      }
      
      // Fetch names for all IDs that aren't already cached
      const uncachedIds = Array.from(typeIds).filter(id => {
        const cached = reportTypeNameCache.has(id) || reportTypeNames.has(id);
        return !cached;
      });
      
      if (uncachedIds.length === 0) {
        // All IDs are cached, just update state from cache
        const namesMap = new Map<string, string>();
        typeIds.forEach(id => {
          const name = reportTypeNameCache.get(id) || reportTypeNames.get(id);
          if (name && name !== id) {
            namesMap.set(id, name);
          }
        });
        if (namesMap.size > 0) {
          setReportTypeNames(prev => {
            const updated = new Map(prev);
            namesMap.forEach((value, key) => updated.set(key, value));
            return updated;
          });
        }
        return;
      }
      
      setIsLoading(true);
      
      // Fetch names for uncached IDs
      const namePromises = uncachedIds.map(async (id) => {
        try {
          const name = await getReportTypeName(id);
          // Only cache if we got a valid name (not the ID itself)
          if (name && name !== id) {
            reportTypeNameCache.set(id, name);
            return [id, name];
          }
          return [id, id]; // Keep ID if fetch failed or returned ID
        } catch (error: any) {
          console.error(`Error fetching report type name for ${id}:`, error?.response?.data || error?.message || error);
          return [id, id]; // Fallback to ID if fetch fails
        }
      });
      
      const names = await Promise.all(namePromises);
      const namesMap = new Map(names as [string, string][]);
      
      // Only update state if we have new names
      const hasNewNames = Array.from(namesMap.entries()).some(([id, name]) => name !== id);
      if (hasNewNames) {
        setReportTypeNames(prev => {
          const updated = new Map(prev);
          namesMap.forEach((value, key) => {
            if (value !== key) { // Only set if it's not the ID itself
              updated.set(key, value);
            }
          });
          return updated;
        });
      }
      
      setIsLoading(false);
    };
    
    fetchReportTypeNames();
  }, [reports]);

  // Helper function to get display name for report type
  const getReportTypeDisplayName = useCallback((report: any): string => {
    const type = report?.type || report?.documentType;
    if (!type || typeof type !== 'string') return 'Blood Report';
    
    // If it's an ID, check cache/state
    if (isObjectId(type)) {
      // Check state first (most up-to-date)
      const nameFromState = reportTypeNames.get(type);
      if (nameFromState && nameFromState !== type) {
        return nameFromState;
      }
      
      // Check global cache
      const nameFromCache = reportTypeNameCache.get(type);
      if (nameFromCache && nameFromCache !== type) {
        return nameFromCache;
      }
      
      // If we have the ID but no name yet, trigger a fetch (async, won't block render)
      if (!reportTypeNameCache.has(type) && !reportTypeNames.has(type)) {
        getReportTypeName(type).then((name) => {
          if (name && name !== type) {
            reportTypeNameCache.set(type, name);
            setReportTypeNames(prev => {
              const updated = new Map(prev);
              updated.set(type, name);
              return updated;
            });
          }
        }).catch((error) => {
          console.error(`Failed to fetch report type name for ${type}:`, error);
        });
      }
      
      // Return ID as fallback (will be replaced once fetch completes)
      return type;
    }
    
    // If it's already a name, return it
    return type;
  }, [reportTypeNames]);

  return { getReportTypeDisplayName, isLoading };
}

