import { NextApiRequest, NextApiResponse } from 'next';
import connectDBMiddleware from '@/lib/middleware/connectDB';
import ReportsTable from '@/lib/models/Reports';

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

  if (!req.body) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'EMPTY_BODY',
        message: 'Request body cannot be empty',
      },
    });
  }

  if (!req.body.ids || !Array.isArray(req.body.ids) || req.body.ids.length === 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_IDS_ARRAY',
        message: 'ids must be a non-empty array in the request body',
      },
    });
  }

  try {
    const reports = await ReportsTable.find({
      _id: { $in: req.body.ids },
    }).sort({ reportDate: -1 });

    return res.status(200).json({
      success: true,
      data: reports,
      count: reports.length,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to fetch reports',
      },
    });
  }
};

export const config = {
  api: {
    externalResolver: true,
  },
};

export default connectDBMiddleware(handler);

