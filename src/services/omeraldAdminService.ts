// Service to fetch data from Omerald Admin API
// Uses proxy API routes to avoid CORS issues

import axios from 'axios';

// Use local proxy API routes instead of direct calls to avoid CORS
const USE_PROXY = true;
const ADMIN_API_BASE_URL = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL || 'https://admin.omerald.com')
  : (process.env.ADMIN_API_BASE_URL || process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL || 'https://admin.omerald.com');

// Create axios instance for direct calls (if needed)
const adminApiClient = axios.create({
  baseURL: ADMIN_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/plain, */*',
  },
  withCredentials: false,
  timeout: 10000, // 10 second timeout for faster failure
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
  timeout: 10000, // 10 second timeout for faster failure
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
  try {
    const client = USE_PROXY ? proxyApiClient : adminApiClient;
    const endpoint = USE_PROXY ? '/api/admin/doses' : '/api/dose/readDose';
    
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
    console.warn('Unexpected response format for vaccine doses:', data);
    return [];
  } catch (error: any) {
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
  try {
    const [vaccines, doses, durations] = await Promise.all([
      getVaccines(),
      getVaccineDoses(),
      getVaccineDurations(),
    ]);
    return { vaccines, doses, durations };
  } catch (error: any) {
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

