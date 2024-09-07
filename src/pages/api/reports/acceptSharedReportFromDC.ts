import { NextApiRequest, NextApiResponse } from 'next';

const DC_API_BASE_URL = process.env.DC_API_BASE_URL || process.env.NEXT_PUBLIC_DC_API_BASE_URL || 'https://diagnostic.omerald.com';

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

  if (!req.body || !req.body.phoneNumber || !req.body.reportId) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_REQUIRED_FIELDS',
        message: 'phoneNumber and reportId are required in request body',
      },
    });
  }

  try {
    const { phoneNumber, reportId, userId } = req.body;

    const url = `${DC_API_BASE_URL}/api/reports/shared/${encodeURIComponent(phoneNumber)}/accept`;
    
    // Fetch from DC API (server-side, no CORS issues)
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
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
    
    return res.status(200).json({
      success: true,
      data: result.data,
    });
  } catch (error: any) {
    console.error('Error accepting shared report from DC:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to accept shared report from DC',
      },
    });
  }
};

export default handler;







