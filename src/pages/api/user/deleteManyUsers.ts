import { NextApiRequest, NextApiResponse } from 'next';
import connectDBMiddleware from '@/lib/middleware/connectDB';
import UserTable from '@/lib/models/User';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { ids } = req.query;
    if (!ids) {
      return res.status(400).json({ error: 'User IDs are required' });
    }

    const idsArray = Array.isArray(ids) ? ids : [ids];
    const users = await UserTable.find({ id: { $in: idsArray } });

    if (process.env.NODE_ENV !== 'production' && users.length > 0) {
      const result = await UserTable.deleteMany({ id: { $in: idsArray } });
      return res.status(200).json(result);
    } else {
      return res.status(404).json({ error: 'Users do not exist' });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export default connectDBMiddleware(handler);

