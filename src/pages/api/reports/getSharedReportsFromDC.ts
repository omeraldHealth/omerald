import { NextApiRequest, NextApiResponse } from 'next';

const DC_API_BASE_URL = 'https://omerald-dc.vercel.app';

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
    const { phoneNumber, status, page = 1, pageSize = 20 } = req.body;

    // Build query parameters
    const acceptedParam = status === 'accepted' ? 'true' : 'false';
    const url = `${DC_API_BASE_URL}/api/reports/fetchSharedReportsForUser/?phoneNumber=${encodeURIComponent(phoneNumber)}&accepted=${acceptedParam}&page=${page}&pageSize=${pageSize}`;
    
    // Fetch from DC API (server-side, no CORS issues)
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch shared reports: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to fetch shared reports');
    }
    
    return res.status(200).json({
      success: true,
      data: result.data,
    });
  } catch (error: any) {
    console.error('Error fetching shared reports from DC:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to fetch shared reports from DC',
      },
    });
  }
};

export default handler;







