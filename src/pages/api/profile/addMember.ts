import { NextApiRequest, NextApiResponse } from 'next';
import connectDBMiddleware from '@/lib/middleware/connectDB';
import ProfileTable from '@/lib/models/Profile';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { profileId, memberId, relation, phoneNumber, sharedWith } = req.body;

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

    // Check if trying to add self as member
    if (profile._id.toString() === memberId) {
      return res.status(400).json({ error: 'Cannot add yourself as a member' });
    }

    // Add member to the members array
    const newMember = {
      memberId,
      relation,
      phoneNumber: phoneNumber || '',
      sharedWith: sharedWith || [],
    };

    profile.members = profile.members || [];
    profile.members.push(newMember);

    const updatedProfile = await profile.save();

    return res.status(200).json({
      success: true,
      profile: updatedProfile,
      member: newMember,
    });
  } catch (error: any) {
    console.error('Error adding member:', error);
    return res.status(500).json({ error: error.message });
  }
};

export default connectDBMiddleware(handler);

