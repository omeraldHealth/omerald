import { NextApiRequest, NextApiResponse } from 'next';
import connectDBMiddleware from '@/lib/middleware/connectDB';
import ProfileTable from '@/lib/models/Profile';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { profileId, certificateUrl } = req.body;

    console.log('Received request to save certificate:', {
      profileId,
      certificateUrl,
      bodyKeys: Object.keys(req.body),
    });

    if (!profileId || !certificateUrl) {
      console.error('Missing required fields:', { profileId: !!profileId, certificateUrl: !!certificateUrl });
      return res.status(400).json({ error: 'Profile ID and certificate URL are required' });
    }

    const profile = await ProfileTable.findById(profileId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    console.log('Saving certificate URL to profile:', {
      profileId: profileId,
      certificateUrl: certificateUrl,
      currentIsDoctor: profile.isDoctor,
      currentDoctorApproved: profile.doctorApproved,
    });

    // Mark fields as modified to ensure they're saved
    profile.doctorCertificate = certificateUrl;
    profile.markModified('doctorCertificate');
    
    // If certificate is uploaded, automatically set isDoctor to true if not already set
    // This ensures the user is marked as requesting doctor status
    if (!profile.isDoctor) {
      profile.isDoctor = true;
      profile.doctorApproved = false; // Keep as pending until admin approves
      profile.markModified('isDoctor');
      profile.markModified('doctorApproved');
    }
    
    const savedProfile = await profile.save();
    console.log('Profile saved. doctorCertificate field:', savedProfile.doctorCertificate);

    // Verify it was saved
    const updatedProfile = await ProfileTable.findById(profileId);
    console.log('Certificate saved. Verification:', {
      doctorCertificate: updatedProfile?.doctorCertificate,
      isDoctor: updatedProfile?.isDoctor,
      doctorApproved: updatedProfile?.doctorApproved,
    });

    return res.status(200).json({
      success: true,
      message: 'Certificate uploaded successfully',
      profile: updatedProfile,
    });
  } catch (error: any) {
    console.error('Error uploading certificate:', error);
    return res.status(500).json({ error: error.message });
  }
};

export default connectDBMiddleware(handler);

