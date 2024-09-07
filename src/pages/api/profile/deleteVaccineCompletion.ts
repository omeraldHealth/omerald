import { NextApiRequest, NextApiResponse } from 'next';
import connectDBMiddleware from '@/lib/middleware/connectDB';
import ProfileTable from '@/lib/models/Profile';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { profileId, doseId } = req.body;

    if (!profileId || !doseId) {
      return res.status(400).json({ error: 'Profile ID and Dose ID are required' });
    }

    // Find the profile
    const profile = await ProfileTable.findById(profileId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Initialize vaccineCompletions as object if it doesn't exist
    if (!profile.vaccineCompletions || typeof profile.vaccineCompletions !== 'object') {
      profile.vaccineCompletions = {};
    }

    // Normalize doseId to string
    const normalizedDoseId = doseId.toString();

    // Delete the completion from the object
    delete profile.vaccineCompletions[normalizedDoseId];

    // Mark the object as modified to ensure Mongoose saves it
    profile.markModified('vaccineCompletions');
    const updatedProfile = await profile.save();

    // Convert to plain object
    const profileData = updatedProfile.toObject ? updatedProfile.toObject() : updatedProfile;
    const vaccineCompletionsObj = profileData.vaccineCompletions || {};

    return res.status(200).json({
      message: 'Vaccine completion deleted successfully',
      profile: {
        ...profileData,
        vaccineCompletions: vaccineCompletionsObj,
      },
      vaccineCompletions: vaccineCompletionsObj,
    });
  } catch (error: any) {
    console.error('Error deleting vaccine completion:', error);
    return res.status(500).json({ error: error.message });
  }
};

export default connectDBMiddleware(handler);

