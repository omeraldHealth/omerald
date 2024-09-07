import { NextApiRequest, NextApiResponse } from 'next';
import { DEFAULT_DC_LOGO_URL } from '@/components/common/lib/constants/constants';

const DC_API_BASE_URL = 'https://diagnostic.omerald.com';

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

  if (!req.body || !req.body.branchId) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_BRANCH_ID',
        message: 'branchId is required in request body',
      },
    });
  }

  try {
    const { branchId } = req.body;

    // Fetch from DC API
    const response = await fetch(`${DC_API_BASE_URL}/api/branches/${branchId}`);
    
    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: {
          code: 'BRANCH_API_ERROR',
          message: `Failed to fetch branch: ${response.statusText}`,
        },
      });
    }
    
    const result = await response.json();
    
    if (result.success && result.data) {
      const branchData = result.data;
      
      // Get logo URL and validate it - use default if broken or missing
      const originalLogoUrl = branchData.brandingInfo?.logoUrl || branchData.logoUrl || null;
      const logoUrl = isValidLogoUrl(originalLogoUrl) ? originalLogoUrl : DEFAULT_DC_LOGO_URL;
      
      // Build response data, overriding logoUrl
      const responseData = {
        ...branchData, // Pass through all data from DC API
        logoUrl: logoUrl, // Use validated logo URL
        brandingInfo: branchData.brandingInfo ? {
          ...branchData.brandingInfo,
          logoUrl: logoUrl, // Override logoUrl in brandingInfo too
        } : {
          logoUrl: logoUrl,
          bannerUrl: null,
          facebookUrl: '',
          instaUrl: '',
        },
      };
      
      return res.status(200).json({
        success: true,
        data: responseData,
      });
    }
    
    return res.status(404).json({
      success: false,
      error: {
        code: 'BRANCH_NOT_FOUND',
        message: 'Branch not found',
      },
    });
  } catch (error: any) {
    console.error('Error fetching branch details:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to fetch branch details',
      },
    });
  }
};

export default handler;











