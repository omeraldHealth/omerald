import { NextApiRequest, NextApiResponse } from 'next';
import connectDBMiddleware from '@/lib/middleware/connectDB';
import SubscriptionTable from '@/lib/models/SubscriptionOrder';

export default connectDBMiddleware(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const orders = await SubscriptionTable.find().sort({ createdAt: -1 });
    return res.status(200).json(orders);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

