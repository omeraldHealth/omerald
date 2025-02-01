import { NextApiRequest, NextApiResponse } from 'next';
import connectDBMiddleware from '@/lib/middleware/connectDB';
import SharedMembersTable from '@/lib/models/SharedMembers';
import ProfileTable from '@/lib/models/Profile';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { phoneNumber } = req.query;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    // Format phone number
    let formattedPhone = phoneNumber.toString().replace(/\s/g, '');
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone;
    }

    // Find all pending shares for this phone number
    const pendingShares = await SharedMembersTable.find({
      receiverContact: formattedPhone,
      status: 'pending',
    });

    // Get profile IDs from pending shares to fetch member details
    const sharerIds = [...new Set(pendingShares.map((ps: any) => ps.sharedById).filter(Boolean))];
    const sharerProfiles = sharerIds.length > 0 
      ? await ProfileTable.find({
          _id: { $in: sharerIds },
        })
      : [];

    // Enrich pending shares with sharer and member information
    const enrichedShares = await Promise.all(
      pendingShares.map(async (share: any) => {
        const sharer = sharerProfiles.find(
          (p: any) => p._id.toString() === share.sharedById.toString()
        );

        // Find the member in sharer's profile
        let memberDetails = null;
        if (sharer) {
          const member = sharer.members?.find(
            (m: any) => m.memberId?.toString() === share.memberId.toString()
          );
          if (member) {
            // Get full member profile
            const memberProfile = await ProfileTable.findById(share.memberId);
            if (memberProfile) {
              memberDetails = {
                ...memberProfile.toObject(),
                relation: member.relation,
              };
            }
          }
        }

        return {
          ...share.toObject(),
          sharer: sharer
            ? {
                id: sharer._id,
                name: `${sharer.firstName} ${sharer.lastName}`,
                phoneNumber: sharer.phoneNumber,
              }
            : null,
          memberDetails,
        };
      })
    );

    return res.status(200).json({
      success: true,
      pendingShares: enrichedShares,
      count: enrichedShares.length,
    });
  } catch (error: any) {
    console.error('Error fetching pending shares:', error);
    return res.status(500).json({ error: error.message });
  }
};

export default connectDBMiddleware(handler);






