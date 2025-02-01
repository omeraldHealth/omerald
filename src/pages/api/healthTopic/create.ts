import { NextApiRequest, NextApiResponse } from 'next';
import connectDBMiddleware from '@/lib/middleware/connectDB';
import HealthTopicsTable from '@/lib/models/HealthTopics';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!req.body) {
    return res.status(400).json({ error: 'Input cannot be empty' });
  }

  try {
    const healthTopicObject = new HealthTopicsTable(req.body);
    const data = await healthTopicObject.save();
    return res.status(201).json({ message: 'Health Topic Inserted Successfully', data });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error while saving data' });
  }
};

export default connectDBMiddleware(handler);

