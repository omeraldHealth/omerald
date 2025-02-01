import { NextApiRequest, NextApiResponse } from 'next';

const DC_API_BASE_URL = process.env.DC_API_BASE_URL || process.env.NEXT_PUBLIC_DC_API_BASE_URL || 'https://omerald-dc.vercel.app';

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

  if (!req.body || !req.body.reportId || !req.body.userContact) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_REQUIRED_FIELDS',
        message: 'reportId and userContact are required in request body',
      },
    });
  }

  try {
    const { reportId, userContact } = req.body;

    const url = `${DC_API_BASE_URL}/api/reports/reject`;
    
    // Fetch from DC API (server-side, no CORS issues)
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reportId,
        userContact,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || errorData.message || `Failed to reject report: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    return res.status(200).json({
      success: true,
      data: result.data || result,
    });
  } catch (error: any) {
    console.error('Error rejecting report from DC:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to reject report from DC',
      },
    });
  }
};

export default handler;







