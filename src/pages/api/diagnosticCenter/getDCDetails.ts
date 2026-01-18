import { NextApiRequest, NextApiResponse } from 'next';
import { DEFAULT_DC_LOGO_URL } from '@/components/common/lib/constants/constants';

const DC_API_BASE_URL = 'https://omerald-dc.vercel.app';

// Helper function to check if logo URL is broken or invalid
const isValidLogoUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  // Filter out broken Unsplash URLs and other invalid URLs
  if (url.includes('images.unsplash.com') && url.includes('photo-1559757148')) {
    return false;
  }
  return true;
};

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
      
      // Get logo URL and validate it - use default if broken or missing
      const originalLogoUrl = dcData.brandingInfo?.logoUrl || null;
      const logoUrl = isValidLogoUrl(originalLogoUrl) ? originalLogoUrl : DEFAULT_DC_LOGO_URL;
      
      return res.status(200).json({
        success: true,
        data: {
          dcId,
          centerName: dcData.centerName || dcData.name,
          logoUrl: logoUrl,
          phoneNumber: dcData.phoneNumber || null,
          email: dcData.email || null,
          brandingInfo: dcData.brandingInfo ? {
            ...dcData.brandingInfo,
            logoUrl: logoUrl, // Override with validated logo URL
          } : {
            logoUrl: logoUrl,
          },
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











