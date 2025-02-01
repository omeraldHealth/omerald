import { NextApiRequest, NextApiResponse } from 'next';
import connectDBMiddleware from '@/lib/middleware/connectDB';
import ProfileTable from '@/lib/models/Profile';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const profiles = await ProfileTable.find().sort({ createdDate: -1 });
    return res.status(200).json(profiles);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export default connectDBMiddleware(handler);

