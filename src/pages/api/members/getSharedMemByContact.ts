import { NextApiRequest, NextApiResponse } from 'next';
import connectDBMiddleware from '@/lib/middleware/connectDB';
import SharedMembersTable from '@/lib/models/SharedMembers';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { receiverContact } = req.body;
    if (!receiverContact || !Array.isArray(receiverContact)) {
      return res.status(400).json({ error: 'receiverContact array is required' });
    }

    const members = await SharedMembersTable.find({
      receiverContact: { $in: receiverContact },
    });
    return res.status(200).json(members);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export default connectDBMiddleware(handler);

