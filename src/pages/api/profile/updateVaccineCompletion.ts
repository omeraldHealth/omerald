import { NextApiRequest, NextApiResponse } from 'next';
import connectDBMiddleware from '@/lib/middleware/connectDB';
import ProfileTable from '@/lib/models/Profile';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { profileId, doseId, dateAdministered, remark, completed } = req.body;

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

    // Check if the completion exists
    const existingCompletion = profile.vaccineCompletions[normalizedDoseId];
    if (!existingCompletion) {
      return res.status(404).json({ error: 'Vaccine completion not found' });
    }

    // Update the completion data
    const updatedCompletion = {
      ...existingCompletion,
      ...(dateAdministered !== undefined && { dateAdministered: new Date(dateAdministered) }),
      ...(remark !== undefined && { remark }),
      ...(completed !== undefined && { completed: Boolean(completed) }),
      completedAt: new Date(),
    };

    profile.vaccineCompletions[normalizedDoseId] = updatedCompletion;

    // Mark the object as modified to ensure Mongoose saves it
    profile.markModified('vaccineCompletions');
    const updatedProfile = await profile.save();

    // Convert to plain object
    const profileData = updatedProfile.toObject ? updatedProfile.toObject() : updatedProfile;
    const vaccineCompletionsObj = profileData.vaccineCompletions || {};

    return res.status(200).json({
      message: 'Vaccine completion updated successfully',
      profile: {
        ...profileData,
        vaccineCompletions: vaccineCompletionsObj,
      },
      vaccineCompletions: vaccineCompletionsObj,
    });
  } catch (error: any) {
    console.error('Error updating vaccine completion:', error);
    return res.status(500).json({ error: error.message });
  }
};

export default connectDBMiddleware(handler);

