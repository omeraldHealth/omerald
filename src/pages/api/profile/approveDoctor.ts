import { NextApiRequest, NextApiResponse } from 'next';
import connectDBMiddleware from '@/lib/middleware/connectDB';
import ProfileTable from '@/lib/models/Profile';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { profileId, action } = req.body; // action: 'approve' or 'reject'

    if (!profileId || !action) {
      return res.status(400).json({ error: 'Profile ID and action are required' });
    }

    const profile = await ProfileTable.findById(profileId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    if (action === 'approve') {
      // When approving, set both isDoctor and doctorApproved to true
      profile.isDoctor = true;
      profile.doctorApproved = true;
      profile.markModified('isDoctor');
      profile.markModified('doctorApproved');
      await profile.save();
      
      console.log('Doctor approved:', {
        profileId: profile._id,
        isDoctor: profile.isDoctor,
        doctorApproved: profile.doctorApproved,
      });
      
      return res.status(200).json({
        success: true,
        message: 'Doctor status approved successfully',
        profile,
      });
    } else if (action === 'reject') {
      profile.isDoctor = false;
      profile.doctorApproved = false;
      profile.markModified('isDoctor');
      profile.markModified('doctorApproved');
      await profile.save();
      return res.status(200).json({
        success: true,
        message: 'Doctor request rejected',
        profile,
      });
    } else {
      return res.status(400).json({ error: 'Invalid action. Use "approve" or "reject"' });
    }
  } catch (error: any) {
    console.error('Error processing doctor approval:', error);
    return res.status(500).json({ error: error.message });
  }
};

export default connectDBMiddleware(handler);

