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

  if (!req.body || (!req.body.pathologistId && !req.body.branchId)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_PARAMS',
        message: 'Either pathologistId or branchId is required in request body',
      },
    });
  }

  try {
    const { pathologistId, branchId, pathologistName } = req.body;

    // If we have pathologistId, fetch directly
    if (pathologistId) {
      const response = await fetch(`${DC_API_BASE_URL}/api/pathologists/${pathologistId}`);
      
      if (!response.ok) {
        return res.status(response.status).json({
          success: false,
          error: {
            code: 'PATHOLOGIST_API_ERROR',
            message: `Failed to fetch pathologist: ${response.statusText}`,
          },
        });
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        const pathologistData = result.data;
        return res.status(200).json({
          success: true,
          data: {
            pathologistId,
            name: pathologistData.name || pathologistName,
            signature: pathologistData.signature || null,
            designation: pathologistData.designation || 'Pathologist',
          },
        });
      }
    }

    // If we have branchId, fetch branch pathologists and find by name
    if (branchId) {
      const response = await fetch(`${DC_API_BASE_URL}/api/branches/${branchId}/pathologists`);
      
      if (!response.ok) {
        return res.status(response.status).json({
          success: false,
          error: {
            code: 'BRANCH_PATHOLOGISTS_API_ERROR',
            message: `Failed to fetch branch pathologists: ${response.statusText}`,
          },
        });
      }
      
      const result = await response.json();
      
      if (result.success && result.data?.pathologists) {
        const pathologists = result.data.pathologists;
        let pathologist = null;

        // If pathologistName is provided, find by name
        if (pathologistName) {
          pathologist = pathologists.find((p: any) => 
            p.name?.toLowerCase() === pathologistName.toLowerCase()
          );
        }

        // If not found by name and pathologistId is provided, find by ID
        if (!pathologist && pathologistId) {
          pathologist = pathologists.find((p: any) => 
            p.id === pathologistId || p._id === pathologistId
          );
        }

        // If still not found, use first pathologist
        if (!pathologist && pathologists.length > 0) {
          pathologist = pathologists[0];
        }

        if (pathologist) {
          return res.status(200).json({
            success: true,
            data: {
              pathologistId: pathologist.id || pathologist._id,
              name: pathologist.name || pathologistName,
              signature: pathologist.signature || null,
              designation: pathologist.designation || 'Pathologist',
            },
          });
        }
      }
    }
    
    return res.status(404).json({
      success: false,
      error: {
        code: 'PATHOLOGIST_NOT_FOUND',
        message: 'Pathologist not found',
      },
    });
  } catch (error: any) {
    console.error('Error fetching pathologist details:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to fetch pathologist details',
      },
    });
  }
};

export default handler;











