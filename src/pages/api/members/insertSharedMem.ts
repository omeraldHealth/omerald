import { NextApiRequest, NextApiResponse } from 'next';
import connectDBMiddleware from '@/lib/middleware/connectDB';
import SharedMembersTable from '@/lib/models/SharedMembers';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sharedMember = new SharedMembersTable({
      receiverName: req.body.receiverName,
      receiverContact: req.body.receiverContact,
      memberId: req.body.memberId,
      sharedTime: req.body.sharedTime || new Date(),
      status: req.body.status || 'pending',
      sharedByName: req.body.sharedByName,
      sharedById: req.body.sharedById,
    });

    const memberData = await sharedMember.save();
    return res.status(201).json(memberData);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export default connectDBMiddleware(handler);

