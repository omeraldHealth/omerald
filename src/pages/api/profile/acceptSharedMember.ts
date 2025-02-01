import { NextApiRequest, NextApiResponse } from 'next';
import connectDBMiddleware from '@/lib/middleware/connectDB';
import ProfileTable from '@/lib/models/Profile';
import SharedMembersTable from '@/lib/models/SharedMembers';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { profileId, shareId, memberId, relation, phoneNumber, fromSharedMembersTable } = req.body;

    if (!profileId || !memberId || !relation) {
      return res.status(400).json({ error: 'Profile ID, Member ID, and Relation are required' });
    }

    // Get the profile
    const profile = await ProfileTable.findById(profileId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Check if member already exists in the members array
    const existingMember = profile.members?.find(
      (m: any) => m.memberId === memberId || m.phoneNumber === phoneNumber
    );

    if (existingMember) {
      return res.status(400).json({ error: 'Member already exists in your profile' });
    }

    // Add member to the members array
    const newMember = {
      memberId,
      relation,
      phoneNumber: phoneNumber || '',
      sharedWith: [],
    };

    profile.members = profile.members || [];
    profile.members.push(newMember);

    // Update or remove from sharedMembers array
    if (fromSharedMembersTable) {
      // Remove from SharedMembersTable
      await SharedMembersTable.deleteOne({ _id: shareId });
    } else {
      // Update status in profile.sharedMembers
      if (shareId && profile.sharedMembers) {
        const sharedMemberIndex = profile.sharedMembers.findIndex(
          (sm: any) => sm._id?.toString() === shareId || (sm.memberId === memberId && sm.status === 'pending')
        );
        if (sharedMemberIndex !== -1) {
          profile.sharedMembers[sharedMemberIndex].status = 'accepted';
        }
      }
    }

    const updatedProfile = await profile.save();

    return res.status(200).json({
      success: true,
      profile: updatedProfile,
      member: newMember,
      message: 'Member accepted and added to your profile',
    });
  } catch (error: any) {
    console.error('Error accepting shared member:', error);
    return res.status(500).json({ error: error.message });
  }
};

export default connectDBMiddleware(handler);

