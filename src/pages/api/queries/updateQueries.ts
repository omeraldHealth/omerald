import { NextApiRequest, NextApiResponse } from 'next';
import connectDBMiddleware from '@/lib/middleware/connectDB';
import QueryTable from '@/lib/models/Queries';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!req.body) {
    return res.status(400).json({ error: 'Input cannot be empty' });
  }

  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: 'Query ID is required' });
    }

    const query = await QueryTable.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!query) {
      return res.status(404).json({ error: 'Query not found' });
    }

    return res.status(200).json(query);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export default connectDBMiddleware(handler);

