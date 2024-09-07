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

  const memberId = req.query.memberId;
  if (!memberId) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_MEMBER_ID',
        message: 'memberId query parameter is required',
      },
    });
  }

  try {
    const reports = await ReportsTable.find({ userId: memberId }).sort({
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

