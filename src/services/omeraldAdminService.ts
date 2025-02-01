// Service to fetch data from Omerald Admin API
// Uses proxy API routes to avoid CORS issues

import axios from 'axios';

// Use local proxy API routes instead of direct calls to avoid CORS
const USE_PROXY = true;
const ADMIN_API_BASE_URL = 'https://omerald-admin.vercel.app';

// Create axios instance for direct calls (if needed)
const adminApiClient = axios.create({
  baseURL: ADMIN_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/plain, */*',
  },
  withCredentials: false,
});

// Create axios instance for proxy calls
// For client-side: use relative URLs, for server-side: use full URL
const getProxyBaseURL = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  // Server-side: use environment variable or default to localhost
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
};

const proxyApiClient = axios.create({
  baseURL: getProxyBaseURL(),
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/plain, */*',
  },
});

// Vaccine-related endpoints
export interface Vaccine {
  _id?: string;
  id?: string;
  name: string;
  description?: string;
  [key: string]: any;
}

export interface VaccineDose {
  _id?: string;
  id?: string;
  name: string;
  vaccine: string | { _id: string; id: string; name: string };
  duration?: string | number; // Age in months when dose should be given
  [key: string]: any;
}

export interface VaccineDuration {
  _id?: string;
  id?: string;
  duration: string;
  vaccine?: string | { _id: string; id: string; name: string };
  [key: string]: any;
}

export interface ApiResponse<T> {
  data?: T;
  success?: boolean;
  message?: string;
  [key: string]: any;
}

/**
 * Fetch all vaccines
 * Endpoint: GET /api/vaccine/readVaccines (via proxy: /api/admin/vaccines)
 */
export async function getVaccines(): Promise<Vaccine[]> {
  try {
    const client = USE_PROXY ? proxyApiClient : adminApiClient;
    const endpoint = USE_PROXY ? '/api/admin/vaccines' : '/api/vaccine/readVaccines';
    
    const response = await client.get<any>(endpoint);
    // API returns array directly or wrapped in data property
    const data = response.data;
    if (Array.isArray(data)) {
      return data;
    }
    if (data && typeof data === 'object' && Array.isArray(data.data)) {
      return data.data;
    }
    // Handle case where response might be wrapped differently
    if (data && typeof data === 'object' && data.result && Array.isArray(data.result)) {
      return data.result;
    }
    console.warn('Unexpected response format for vaccines:', data);
    return [];
  } catch (error: any) {
    console.error('Error fetching vaccines:', {
      message: error?.message,
      response: error?.response?.data,
      status: error?.response?.status,
      statusText: error?.response?.statusText,
    });
    throw new Error(error?.response?.data?.message || error?.response?.data?.error || error?.message || 'Failed to fetch vaccines');
  }
}

/**
 * Fetch all vaccine doses
 * Endpoint: GET /api/dose/readDose (via proxy: /api/admin/doses)
 */
export async function getVaccineDoses(): Promise<VaccineDose[]> {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/2fbc7e35-288c-4e48-8204-8ecc0d034a57',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'omeraldAdminService.ts:110',message:'getVaccineDoses function entry',data:{useProxy:USE_PROXY,endpoint:USE_PROXY?'/api/admin/doses':'/api/dose/readDose'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  try {
    const client = USE_PROXY ? proxyApiClient : adminApiClient;
    const endpoint = USE_PROXY ? '/api/admin/doses' : '/api/dose/readDose';
    
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/2fbc7e35-288c-4e48-8204-8ecc0d034a57',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'omeraldAdminService.ts:115',message:'getVaccineDoses making API call',data:{endpoint},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    const response = await client.get<any>(endpoint);
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/2fbc7e35-288c-4e48-8204-8ecc0d034a57',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'omeraldAdminService.ts:118',message:'getVaccineDoses API call success',data:{status:response?.status,hasData:!!response?.data,dataIsArray:Array.isArray(response?.data)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    // API returns array directly or wrapped in data property
    const data = response.data;
    if (Array.isArray(data)) {
      return data;
    }
    if (data && typeof data === 'object' && Array.isArray(data.data)) {
      return data.data;
    }
    // Handle case where response might be wrapped differently
    if (data && typeof data === 'object' && data.result && Array.isArray(data.result)) {
      return data.result;
    }
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/2fbc7e35-288c-4e48-8204-8ecc0d034a57',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'omeraldAdminService.ts:129',message:'getVaccineDoses unexpected format - returning empty',data:{dataType:typeof data},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    console.warn('Unexpected response format for vaccine doses:', data);
    return [];
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/2fbc7e35-288c-4e48-8204-8ecc0d034a57',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'omeraldAdminService.ts:132',message:'getVaccineDoses error caught',data:{errorCode:error?.code,errorMessage:error?.message,status:error?.response?.status,isTimeout:error?.code==='ECONNABORTED'||error?.message?.includes('timeout')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    console.error('Error fetching vaccine doses:', {
      message: error?.message,
      response: error?.response?.data,
      status: error?.response?.status,
      statusText: error?.response?.statusText,
    });
    throw new Error(error?.response?.data?.message || error?.response?.data?.error || error?.message || 'Failed to fetch vaccine doses');
  }
}

/**
 * Fetch all vaccine durations
 * Endpoint: GET /api/duration/readDuration (via proxy: /api/admin/durations)
 */
export async function getVaccineDurations(): Promise<VaccineDuration[]> {
  try {
    const client = USE_PROXY ? proxyApiClient : adminApiClient;
    const endpoint = USE_PROXY ? '/api/admin/durations' : '/api/duration/readDuration';
    
    const response = await client.get<any>(endpoint);
    // API returns array directly or wrapped in data property
    const data = response.data;
    if (Array.isArray(data)) {
      return data;
    }
    if (data && typeof data === 'object' && Array.isArray(data.data)) {
      return data.data;
    }
    // Handle case where response might be wrapped differently
    if (data && typeof data === 'object' && data.result && Array.isArray(data.result)) {
      return data.result;
    }
    console.warn('Unexpected response format for vaccine durations:', data);
    return [];
  } catch (error: any) {
    console.error('Error fetching vaccine durations:', {
      message: error?.message,
      response: error?.response?.data,
      status: error?.response?.status,
      statusText: error?.response?.statusText,
    });
    throw new Error(error?.response?.data?.message || error?.response?.data?.error || error?.message || 'Failed to fetch vaccine durations');
  }
}

/**
 * Fetch all vaccine-related data (vaccines, doses, durations) in parallel
 */
export async function getAllVaccineData() {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/2fbc7e35-288c-4e48-8204-8ecc0d034a57',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'omeraldAdminService.ts:179',message:'getAllVaccineData function entry',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  try {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/2fbc7e35-288c-4e48-8204-8ecc0d034a57',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'omeraldAdminService.ts:182',message:'Starting Promise.all for vaccine data',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    const [vaccines, doses, durations] = await Promise.all([
      getVaccines(),
      getVaccineDoses(),
      getVaccineDurations(),
    ]);
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/2fbc7e35-288c-4e48-8204-8ecc0d034a57',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'omeraldAdminService.ts:188',message:'Promise.all completed successfully',data:{vaccinesLength:vaccines?.length||0,dosesLength:doses?.length||0,durationsLength:durations?.length||0,hasVaccines:!!vaccines,hasDoses:!!doses,hasDurations:!!durations},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    return { vaccines, doses, durations };
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/2fbc7e35-288c-4e48-8204-8ecc0d034a57',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'omeraldAdminService.ts:192',message:'getAllVaccineData error caught',data:{errorMessage:error?.message,errorString:error?.toString(),errorType:error?.constructor?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    console.error('Error fetching all vaccine data:', error);
    throw error;
  }
}

/**
 * Fetch report types
 * Endpoint: GET /api/report/report/readReport
 */
export async function getReportTypes(): Promise<any[]> {
  try {
    const response = await adminApiClient.get<any>(
      '/api/report/report/readReport'
    );
    // API returns array directly or wrapped in data property
    const data = response.data;
    if (Array.isArray(data)) {
      return data;
    }
    if (data && typeof data === 'object' && Array.isArray(data.data)) {
      return data.data;
    }
    return [];
  } catch (error: any) {
    console.error('Error fetching report types:', error);
    throw new Error(error?.response?.data?.message || 'Failed to fetch report types');
  }
}

/**
 * Fetch diagnosed conditions
 * Endpoint: GET /api/diagnosedCondition/readDiagCondition
 */
export async function getDiagnosedConditions(): Promise<any[]> {
  try {
    const response = await adminApiClient.get<any>(
      '/api/diagnosedCondition/readDiagCondition'
    );
    // API returns array directly or wrapped in data property
    const data = response.data;
    if (Array.isArray(data)) {
      return data;
    }
    if (data && typeof data === 'object' && Array.isArray(data.data)) {
      return data.data;
    }
    return [];
  } catch (error: any) {
    console.error('Error fetching diagnosed conditions:', error);
    throw new Error(error?.response?.data?.message || 'Failed to fetch diagnosed conditions');
  }
}

/**
 * Generic function to fetch data from any admin API endpoint
 * @param endpoint API endpoint (e.g., '/api/vaccines')
 * @param params Query parameters
 */
export async function fetchFromAdminApi<T = any>(
  endpoint: string,
  params?: Record<string, any>
): Promise<T> {
  try {
    const response = await adminApiClient.get<ApiResponse<T>>(endpoint, { params });
    return (response.data?.data || response.data) as T;
  } catch (error: any) {
    console.error(`Error fetching from ${endpoint}:`, error);
    throw new Error(error?.response?.data?.message || `Failed to fetch from ${endpoint}`);
  }
}

export default {
  getVaccines,
  getVaccineDoses,
  getVaccineDurations,
  getAllVaccineData,
  getReportTypes,
  getDiagnosedConditions,
  fetchFromAdminApi,
};

