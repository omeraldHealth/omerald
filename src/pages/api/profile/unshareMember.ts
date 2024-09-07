import { NextApiRequest, NextApiResponse } from 'next';
import connectDBMiddleware from '@/lib/middleware/connectDB';
import ProfileTable from '@/lib/models/Profile';
import SharedMembersTable from '@/lib/models/SharedMembers';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      sharerProfileId, 
      memberId, 
      recipientPhoneNumber, 
      recipientProfileId 
    } = req.body;

    if (!sharerProfileId || !memberId || !recipientPhoneNumber) {
      return res.status(400).json({ 
        error: 'Sharer Profile ID, Member ID, and Recipient Phone Number are required' 
      });
    }

    // Get the sharer's profile
    const sharerProfile = await ProfileTable.findById(sharerProfileId);
    if (!sharerProfile) {
      return res.status(404).json({ error: 'Sharer profile not found' });
    }

    // Format phone number
    let formattedPhone = recipientPhoneNumber.replace(/\s/g, '');
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone;
    }

    // Find the member in sharer's profile (if it exists there)
    // Note: Member doesn't need to be in sharer's profile - they can unshare any member they have access to
    const member = sharerProfile.members?.find(
      (m: any) => m.memberId?.toString() === memberId.toString()
    );

    // If member exists in sharer's profile, remove recipient from member's sharedWith array
    if (member) {
      // Remove recipient from member's sharedWith array
      const updatedSharedWith = (member.sharedWith || []).filter((id: string) => {
        return id !== recipientProfileId && id !== formattedPhone;
      });

      // Update the member in sharer's profile
      const updatedMembers = sharerProfile.members.map((m: any) => {
        if (m.memberId?.toString() === memberId.toString()) {
          return {
            ...m,
            sharedWith: updatedSharedWith,
          };
        }
        return m;
      });

      sharerProfile.members = updatedMembers;
    }
    // If member is not in sharer's profile (e.g., it's a shared member), we can still unshare it
    // by removing it from recipient's sharedMembers

    // If recipient profile exists, remove from their sharedMembers
    if (recipientProfileId) {
      const recipientProfile = await ProfileTable.findById(recipientProfileId);
      if (recipientProfile) {
        recipientProfile.sharedMembers = (recipientProfile.sharedMembers || []).filter(
          (sm: any) => !(sm.memberId === memberId && sm.sharedBy === sharerProfileId)
        );
        await recipientProfile.save();
      }
    }

    // Also remove from SharedMembers table if exists
    try {
      await SharedMembersTable.deleteMany({
        receiverContact: formattedPhone,
        memberId: memberId,
      });
    } catch (error: any) {
      console.error('Error removing from SharedMembers table:', error);
      // Don't fail the request if this fails
    }

    // Only save sharer profile if we modified it (i.e., if member was in their profile)
    if (member) {
      await sharerProfile.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Member unshared successfully',
      sharerProfile,
    });
  } catch (error: any) {
    console.error('Error unsharing member:', error);
    return res.status(500).json({ error: error.message });
  }
};

export default connectDBMiddleware(handler);

