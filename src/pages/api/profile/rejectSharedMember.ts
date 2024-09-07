import { NextApiRequest, NextApiResponse } from 'next';
import connectDBMiddleware from '@/lib/middleware/connectDB';
import ProfileTable from '@/lib/models/Profile';
import SharedMembersTable from '@/lib/models/SharedMembers';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { profileId, shareId, fromSharedMembersTable } = req.body;

    if (!shareId) {
      return res.status(400).json({ error: 'Share ID is required' });
    }

    if (fromSharedMembersTable) {
      // Remove from SharedMembersTable
      await SharedMembersTable.deleteOne({ _id: shareId });
    } else if (profileId) {
      // Update status in profile.sharedMembers
      const profile = await ProfileTable.findById(profileId);
      if (profile && profile.sharedMembers) {
        const sharedMemberIndex = profile.sharedMembers.findIndex(
          (sm: any) => sm._id?.toString() === shareId
        );
        if (sharedMemberIndex !== -1) {
          profile.sharedMembers[sharedMemberIndex].status = 'rejected';
          await profile.save();
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Member share rejected',
    });
  } catch (error: any) {
    console.error('Error rejecting shared member:', error);
    return res.status(500).json({ error: error.message });
  }
};

export default connectDBMiddleware(handler);

