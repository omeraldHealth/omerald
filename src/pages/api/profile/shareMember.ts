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
      recipientProfileId,
      shareType = 'acquaintance' // 'doctor' or 'acquaintance', default to 'acquaintance'
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

    // Validate: Don't allow sharing with yourself
    if (formattedPhone === sharerProfile.phoneNumber) {
      return res.status(400).json({ error: 'Cannot share profile with yourself' });
    }

    // Also check by profile ID if recipientProfileId is provided
    if (recipientProfileId && recipientProfileId.toString() === sharerProfileId.toString()) {
      return res.status(400).json({ error: 'Cannot share profile with yourself' });
    }

    // Find the member in sharer's profile (if it exists there)
    // Note: Member doesn't need to be in sharer's profile - they can share any member they have access to
    let member = sharerProfile.members?.find(
      (m: any) => m.memberId?.toString() === memberId.toString()
    );

    // If member is the sharer themselves (Self) and doesn't exist in members array, create it
    if (!member && memberId.toString() === sharerProfileId.toString()) {
      // This is the Self profile being shared - ensure member entry exists
      sharerProfile.members = sharerProfile.members || [];
      member = {
        memberId: sharerProfileId,
        relation: 'Self',
        phoneNumber: sharerProfile.phoneNumber,
        sharedWith: [],
      };
      sharerProfile.members.push(member);
    }

    // If member exists in sharer's profile, check if already shared and update sharedWith
    if (member) {
      // Check if already shared with this recipient
      const alreadyShared = member.sharedWith?.some(
        (id: string) => id === recipientProfileId || id === formattedPhone
      );

      if (alreadyShared && recipientProfileId) {
        return res.status(400).json({ error: 'Member already shared with this user' });
      }

      // Update sharer's profile: Add recipient to member's sharedWith array
      const updatedSharedWith = member.sharedWith || [];
      if (recipientProfileId) {
        if (!updatedSharedWith.includes(recipientProfileId)) {
          updatedSharedWith.push(recipientProfileId);
        }
      } else {
        // If user not found, store phone number
        if (!updatedSharedWith.includes(formattedPhone)) {
          updatedSharedWith.push(formattedPhone);
        }
      }

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
    // If member is not in sharer's profile (e.g., it's a shared member), we can still share it
    // We just won't update the sharer's profile, but we'll still add it to recipient's sharedMembers

    // If recipient profile exists, add to their sharedMembers
    if (recipientProfileId) {
      const recipientProfile = await ProfileTable.findById(recipientProfileId);
      if (recipientProfile) {
        // Check if already exists in sharedMembers
        const existingShare = recipientProfile.sharedMembers?.find(
          (sm: any) => sm.memberId === memberId && sm.sharedBy === sharerProfileId
        );

        if (existingShare) {
          return res.status(400).json({ error: 'Member already shared with this user' });
        }

        recipientProfile.sharedMembers = recipientProfile.sharedMembers || [];
        recipientProfile.sharedMembers.push({
          id: memberId,
          memberId: memberId,
          status: 'pending',
          sharedBy: sharerProfileId,
          sharedByName: `${sharerProfile.firstName} ${sharerProfile.lastName}`,
          sharedByPhone: sharerProfile.phoneNumber,
          shareType: shareType, // Store the share type
          createdAt: new Date(),
        });
        await recipientProfile.save();
      }
    } else {
      // User not found - store in SharedMembers table for later retrieval
      // When user registers with this phone number, they can check for pending shares
      try {
        const existingPendingShare = await SharedMembersTable.findOne({
          receiverContact: formattedPhone,
          memberId: memberId,
          status: 'pending',
        });

        if (!existingPendingShare) {
          const pendingShare = new SharedMembersTable({
            receiverName: formattedPhone, // Will be updated when user registers
            receiverContact: formattedPhone,
            memberId: memberId,
            status: 'pending',
            sharedByName: `${sharerProfile.firstName} ${sharerProfile.lastName}`,
            sharedById: sharerProfileId,
            shareType: shareType, // Store the share type
            sharedTime: new Date(),
          });
          await pendingShare.save();
        }
      } catch (error: any) {
        console.error('Error saving pending share:', error);
        // Don't fail the request if this fails
      }
    }

    // Only save sharer profile if we modified it (i.e., if member was in their profile)
    if (member) {
      await sharerProfile.save();
    }

    return res.status(200).json({
      success: true,
      message: recipientProfileId 
        ? 'Member shared successfully' 
        : 'Share request saved. User will be notified when they register.',
      sharerProfile,
      recipientFound: !!recipientProfileId,
    });
  } catch (error: any) {
    console.error('Error sharing member:', error);
    return res.status(500).json({ error: error.message });
  }
};

export default connectDBMiddleware(handler);

