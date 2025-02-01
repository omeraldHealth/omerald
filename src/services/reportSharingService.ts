export interface SharedReport {
  id: string;
  pathologist: {
    name: string;
    id: string;
  } | null;
  patient: {
    name: string;
    dob: string;
    gender: 'male' | 'female' | 'other';
    contact: {
      phone: string;
      email: string;
    };
  };
  diagnosticCenter: {
    diagnostic: {
      id: string;
      name: string;
    };
    branch: {
      id: string;
      name: string;
    };
  };
  reportData: {
    reportName: string;
    isManual: boolean;
    url?: string;
    pdfUrl?: string;
    imageUrl?: string;
    fileType?: 'pdf' | 'image';
    parsedData?: {
      test?: {
        _id: string;
        testName: string;
        testCode?: string;
      };
      parameters: Array<{
        name: string;
        value: any;
        units?: string;
        bioRefRange?: any;
        subText?: string;
        description?: string;
      }>;
      components: Array<{
        title: string;
        content: string;
        isDynamic: boolean;
        images?: string[];
      }>;
    };
    reportDate: string;
    updatedDate: string;
  };
  shareDetail: {
    userContact: string;
    userId: string | null;
    accepted: boolean;
    sharedAt: string;
  };
}

export interface SharedReportsResponse {
  reports: SharedReport[];
  total: number;
  pending: number;
  accepted: number;
}

export async function getSharedReports(
  phoneNumber: string,
  status?: 'pending' | 'accepted'
): Promise<SharedReportsResponse> {
  if (!phoneNumber) {
    throw new Error('Phone number is required');
  }

  // Use server-side API route to avoid CORS issues
  const url = '/api/reports/getSharedReportsFromDC';
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumber,
        status,
        page: 1,
        pageSize: 20,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch shared reports: ${response.statusText}`);
    }
    
    const result = await response.json();
 
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to fetch shared reports');
    }
    
    return result.data;
  } catch (error: any) {
    console.error('Error fetching shared reports:', error);
    throw error;
  }
}

export async function acceptSharedReport(
  phoneNumber: string,
  reportId: string,
  userId?: string
): Promise<{ message: string; report: SharedReport }> {
  if (!phoneNumber || !reportId) {
    throw new Error('Phone number and report ID are required');
  }

  // Use server-side API route to avoid CORS issues
  const url = '/api/reports/acceptSharedReportFromDC';
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumber,
        reportId,
        userId,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Failed to accept report: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to accept report');
    }
    
    return result.data;
  } catch (error: any) {
    console.error('Error accepting shared report:', error);
    throw error;
  }
}


// New API endpoint for fetching reports with sharedReportDetails
export interface ReportWithSharedDetails {
  _id?: string;
  id: string;
  pathologist?: {
    name: string;
    id?: string;
  } | null;
  patient: {
    name: string;
    dob: string;
    gender: 'male' | 'female' | 'other';
    contact: {
      phone: string;
      email: string;
    };
  };
  diagnosticCenter: {
    diagnostic: string; // ID
    branch: string; // ID
  };
  reportData: {
    reportName: string;
    isManual: boolean;
    url?: string;
    pdfUrl?: string;
    imageUrl?: string;
    fileType?: 'pdf' | 'image';
    parsedData?: {
      test?: string | {
        _id?: string;
        testName?: string;
        testCode?: string;
      };
      parameters?: Array<any>;
      components?: Array<{
        title: string;
        content: string;
        isDynamic: boolean;
        images?: string[];
      }>;
    };
    reportDate: string;
    updatedDate: string;
  };
  sharedReportDetails: Array<{
    userContact: string;
    accepted: boolean;
    userId: string | null;
    blocked?: boolean;
    rejected?: boolean;
    sharedAt: string;
  }>;
  __v?: number;
  [key: string]: any;
}

export interface ReportsResponse {
  reports: ReportWithSharedDetails[];
  total?: number;
}

export async function getReportsFromDC(
  phoneNumber: string
): Promise<ReportsResponse> {
  if (!phoneNumber) {
    throw new Error('Phone number is required');
  }

  // Use server-side API route to avoid CORS issues
  const url = '/api/reports/getReportsFromDC';
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phoneNumber }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch reports: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to fetch reports from DC');
    }
    
    return result.data || { reports: [], total: 0 };
  } catch (error: any) {
    console.error('Error fetching reports from DC:', error);
    throw error;
  }
}

