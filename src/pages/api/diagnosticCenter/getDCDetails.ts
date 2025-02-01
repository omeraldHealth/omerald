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

  if (!req.body || !req.body.dcId) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_DC_ID',
        message: 'dcId is required in request body',
      },
    });
  }

  try {
    const { dcId } = req.body;

    // Fetch from DC API
    const response = await fetch(`${DC_API_BASE_URL}/api/profiles/${dcId}`);
    
    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: {
          code: 'DC_API_ERROR',
          message: `Failed to fetch diagnostic center: ${response.statusText}`,
        },
      });
    }
    
    const result = await response.json();
    
    if (result.success && result.data) {
      const dcData = result.data;
      return res.status(200).json({
        success: true,
        data: {
          dcId,
          centerName: dcData.centerName || dcData.name,
          logoUrl: dcData.brandingInfo?.logoUrl || null,
          phoneNumber: dcData.phoneNumber || null,
          email: dcData.email || null,
          brandingInfo: dcData.brandingInfo || null,
        },
      });
    }
    
    return res.status(404).json({
      success: false,
      error: {
        code: 'DC_NOT_FOUND',
        message: 'Diagnostic center not found',
      },
    });
  } catch (error: any) {
    console.error('Error fetching diagnostic center details:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to fetch diagnostic center details',
      },
    });
  }
};

export default handler;











