import { NextApiRequest, NextApiResponse } from 'next';
import connectDBMiddleware from '@/lib/middleware/connectDB';
import ProfileTable from '@/lib/models/Profile';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { profileId } = req.body;

    if (!profileId) {
      return res.status(400).json({ error: 'Profile ID is required' });
    }

    const profile = await ProfileTable.findById(profileId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Set isDoctor to true, but keep doctorApproved as false (pending approval)
    profile.isDoctor = true;
    profile.doctorApproved = false;

    await profile.save();

    return res.status(200).json({
      success: true,
      message: 'Doctor status requested successfully. Waiting for admin approval.',
      profile,
    });
  } catch (error: any) {
    console.error('Error requesting doctor status:', error);
    return res.status(500).json({ error: error.message });
  }
};

export default connectDBMiddleware(handler);

