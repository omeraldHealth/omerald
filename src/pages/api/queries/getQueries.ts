import { NextApiRequest, NextApiResponse } from 'next';
import connectDBMiddleware from '@/lib/middleware/connectDB';
import QueryTable from '@/lib/models/Queries';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const queries = await QueryTable.find().sort({ createdAt: -1 });
    return res.status(200).json(queries);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export default connectDBMiddleware(handler);

