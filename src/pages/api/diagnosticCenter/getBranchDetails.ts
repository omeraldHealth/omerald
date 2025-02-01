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
      return res.status(200).json({
        success: true,
        data: {
          branchId,
          branchName: branchData.branchName || branchData.name,
          branchAddress: branchData.branchAddress || branchData.address || null,
        },
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











