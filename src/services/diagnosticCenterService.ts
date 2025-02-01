// Service to fetch diagnostic center and branch names from DC API

const DC_API_BASE_URL = 'https://omerald-dc.vercel.app';
const LOCAL_API_BASE_URL = typeof window !== 'undefined' ? window.location.origin : '';

interface DiagnosticCenterResponse {
  success: boolean;
  data: {
    centerName: string;
    id: string;
    [key: string]: any;
  };
}

interface BranchResponse {
  success: boolean;
  data: {
    branchName: string;
    id: string;
    [key: string]: any;
  };
}

// Cache for diagnostic center names
const diagnosticCenterCache = new Map<string, string>();
// Cache for branch names
const branchCache = new Map<string, string>();

// Helper to extract ID from various formats
function extractId(value: any): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value.id) return value.id;
  if (typeof value === 'object' && value._id) return value._id;
  return null;
}

/**
 * Fetch diagnostic center name by ID
 */
export async function getDiagnosticCenterName(dcId: string): Promise<string | null> {
  if (!dcId) return null;
  
  // Check cache first
  if (diagnosticCenterCache.has(dcId)) {
    return diagnosticCenterCache.get(dcId) || null;
  }
  
  try {
    // Use local API route to avoid CORS issues
    const response = await fetch(`${LOCAL_API_BASE_URL}/api/diagnosticCenter/getDCName`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ dcId }),
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch diagnostic center ${dcId}: ${response.statusText} (${response.status})`);
      return null;
    }
    
    const result = await response.json();
    console.log(`DC API response for ${dcId}:`, result);
    if (result.success && result.data?.centerName) {
      const name = result.data.centerName;
      diagnosticCenterCache.set(dcId, name);
      console.log(`Cached DC name: ${dcId} -> ${name}`);
      return name;
    }
    console.warn(`DC name not found in response for ${dcId}:`, result);
    return null;
  } catch (error) {
    console.error(`Error fetching diagnostic center ${dcId}:`, error);
    return null;
  }
}

/**
 * Fetch branch name by ID
 */
export async function getBranchName(branchId: string): Promise<string | null> {
  if (!branchId) return null;
  
  // Check cache first
  if (branchCache.has(branchId)) {
    return branchCache.get(branchId) || null;
  }
  
  try {
    // Use local API route to avoid CORS issues
    const response = await fetch(`${LOCAL_API_BASE_URL}/api/diagnosticCenter/getBranchName`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ branchId }),
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch branch ${branchId}: ${response.statusText}`);
      return null;
    }
    
    const result = await response.json();
    if (result.success && result.data?.branchName) {
      const name = result.data.branchName;
      branchCache.set(branchId, name);
      return name;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching branch ${branchId}:`, error);
    return null;
  }
}

/**
 * Fetch multiple diagnostic center names in batch
 */
export async function getDiagnosticCenterNames(dcIds: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const uncachedIds = dcIds.filter(id => !diagnosticCenterCache.has(id));
  
  // Fetch all uncached IDs in parallel
  const promises = uncachedIds.map(async (id) => {
    const name = await getDiagnosticCenterName(id);
    if (name) {
      result.set(id, name);
    }
  });
  
  await Promise.all(promises);
  
  // Add cached results
  dcIds.forEach(id => {
    if (diagnosticCenterCache.has(id)) {
      result.set(id, diagnosticCenterCache.get(id)!);
    }
  });
  
  return result;
}

/**
 * Fetch multiple branch names in batch
 */
export async function getBranchNames(branchIds: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const uncachedIds = branchIds.filter(id => !branchCache.has(id));
  
  // Fetch all uncached IDs in parallel
  const promises = uncachedIds.map(async (id) => {
    const name = await getBranchName(id);
    if (name) {
      result.set(id, name);
    }
  });
  
  await Promise.all(promises);
  
  // Add cached results
  branchIds.forEach(id => {
    if (branchCache.has(id)) {
      result.set(id, branchCache.get(id)!);
    }
  });
  
  return result;
}

/**
 * Clear caches (useful for testing or refresh)
 */
export function clearCaches() {
  diagnosticCenterCache.clear();
  branchCache.clear();
}

