import { NextApiRequest, NextApiResponse } from 'next';
import connectDBMiddleware from '@/lib/middleware/connectDB';
import SharedMembersTable from '@/lib/models/SharedMembers';

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
      return res.status(400).json({ error: 'Member ID is required' });
    }

    const memberData = await SharedMembersTable.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!memberData) {
      return res.status(404).json({ error: 'Shared member not found' });
    }

    return res.status(200).json(memberData);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export default connectDBMiddleware(handler);

