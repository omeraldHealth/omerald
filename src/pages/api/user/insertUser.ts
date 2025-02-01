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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const UserObject = new UserTable({
      phoneNumber: req.body.phoneNumber,
      uid: req.body.uid,
      role: req.body.role || 'user',
    });

    const userData = await UserObject.save();
    return res.status(201).json(userData);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export default connectDBMiddleware(handler);

