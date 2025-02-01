import { NextApiRequest, NextApiResponse } from 'next';
import connectDBMiddleware from '@/lib/middleware/connectDB';
import HealthTopicsTable from '@/lib/models/HealthTopics';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { _id } = req.body;
    if (!_id) {
      return res.status(400).json({ error: 'Health Topic ID is required' });
    }

    const data = await HealthTopicsTable.findById(_id);
    if (!data) {
      return res.status(404).json({ error: 'Health Topic not found' });
    }
    return res.json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export default connectDBMiddleware(handler);

