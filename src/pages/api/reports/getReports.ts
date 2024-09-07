import { NextApiRequest, NextApiResponse } from 'next';
import connectDBMiddleware from '@/lib/middleware/connectDB';
import ReportsTable from '@/lib/models/Reports';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: `Method ${req.method} not allowed. Only GET is supported.`,
      },
    });
  }

  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_USER_ID',
          message: 'userId query parameter is required',
        },
      });
    }

    const reports = await ReportsTable.find({ userId: userId }).sort({
      reportDate: -1,
    });

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
        message: error.message || 'Internal server error',
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

