import { NextApiRequest, NextApiResponse } from 'next';
import connectDBMiddleware from '@/lib/middleware/connectDB';
import KeywordsTable from '@/lib/models/Keywords';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { _id } = req.body;
    if (!_id) {
      return res.status(400).json({ error: 'Keyword ID is required' });
    }

    const data = await KeywordsTable.findById(_id);
    if (!data) {
      return res.status(404).json({ error: 'Keyword not found' });
    }
    return res.json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export default connectDBMiddleware(handler);

