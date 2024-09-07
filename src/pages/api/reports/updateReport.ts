import { NextApiRequest, NextApiResponse } from 'next';
import connectDBMiddleware from '@/lib/middleware/connectDB';
import ReportsTable from '@/lib/models/Reports';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'PUT' && req.method !== 'PATCH') {
    return res.status(405).json({
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: `Method ${req.method} not allowed. Only PUT or PATCH are supported.`,
      },
    });
  }

  if (!req.body) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'EMPTY_BODY',
        message: 'Request body cannot be empty',
      },
    });
  }

  const reportId = req.query.id || req.body.id;
  if (!reportId) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_REPORT_ID',
        message: 'Report ID is required (provide as query parameter ?id= or in request body)',
      },
    });
  }

  try {
    const updateData = { ...req.body };
    updateData.updatedTime = new Date();

    if (updateData.reportDate) {
      updateData.reportDate = new Date(updateData.reportDate);
    }
    if (updateData.uploadDate) {
      updateData.uploadDate = new Date(updateData.uploadDate);
    }
    if (updateData.uploadedAt) {
      updateData.uploadedAt = new Date(updateData.uploadedAt);
    }

    // Handle MongoDB operators like $pull
    let updateQuery: any = {};
    if (updateData.$pull) {
      // If $pull is provided, use it in the update query
      updateQuery = { $pull: updateData.$pull };
      // Remove $pull from updateData
      delete updateData.$pull;
      // Merge other fields
      Object.keys(updateData).forEach(key => {
        if (key !== '$pull') {
          updateQuery[key] = updateData[key];
        }
      });
    } else {
      updateQuery = updateData;
    }

    const updatedReport = await ReportsTable.findByIdAndUpdate(
      reportId,
      updateQuery,
      { new: true, runValidators: true }
    );

    if (!updatedReport) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'REPORT_NOT_FOUND',
          message: `Report with ID ${reportId} not found`,
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: updatedReport,
      message: 'Report updated successfully',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to update report',
      },
    });
  }
};

export default connectDBMiddleware(handler);

