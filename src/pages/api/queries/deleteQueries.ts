import { NextApiRequest, NextApiResponse } from 'next';
import connectDBMiddleware from '@/lib/middleware/connectDB';
import QueryTable from '@/lib/models/Queries';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: 'Query ID is required' });
    }

    const queryData = await QueryTable.findByIdAndDelete(id);

    if (!queryData) {
      return res.status(404).json({ error: 'Query not found' });
    }

    return res.status(200).json(queryData);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export default connectDBMiddleware(handler);

