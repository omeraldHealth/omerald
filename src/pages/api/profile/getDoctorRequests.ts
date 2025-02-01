import { NextApiRequest, NextApiResponse } from 'next';
import connectDBMiddleware from '@/lib/middleware/connectDB';
import ProfileTable from '@/lib/models/Profile';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Fetch all profiles where isDoctor is true but doctorApproved is false
    // Also include profiles that have a certificate but might not have isDoctor set yet
    const allPending = await ProfileTable.find({
      $or: [
        { isDoctor: true, doctorApproved: false },
        { doctorCertificate: { $exists: true, $ne: '' }, doctorApproved: false }
      ]
    });

    console.log('Query: Looking for isDoctor=true OR doctorCertificate exists');
    console.log('Found pending requests:', allPending.length);
    
    if (allPending.length > 0) {
      console.log('Sample requests:');
      allPending.forEach((p: any, index: number) => {
        console.log(`Request ${index + 1}:`, {
          _id: p._id?.toString(),
          firstName: p.firstName,
          lastName: p.lastName,
          isDoctor: p.isDoctor,
          doctorApproved: p.doctorApproved,
          hasCertificate: !!p.doctorCertificate,
          certificateUrl: p.doctorCertificate ? p.doctorCertificate.substring(0, 50) + '...' : 'none',
        });
      });
    } else {
      // Debug: Check if any profiles have isDoctor or certificate
      const allWithDoctor = await ProfileTable.find({ isDoctor: true });
      const allWithCert = await ProfileTable.find({ doctorCertificate: { $exists: true, $ne: '' } });
      console.log('Debug - Profiles with isDoctor=true:', allWithDoctor.length);
      console.log('Debug - Profiles with certificate:', allWithCert.length);
      if (allWithCert.length > 0) {
        console.log('Sample profile with cert:', {
          _id: allWithCert[0]._id?.toString(),
          isDoctor: allWithCert[0].isDoctor,
          doctorApproved: allWithCert[0].doctorApproved,
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: allPending.map((p: any) => ({
        _id: p._id?.toString(),
        firstName: p.firstName,
        lastName: p.lastName,
        email: p.email,
        phoneNumber: p.phoneNumber,
        doctorCertificate: p.doctorCertificate || '',
        isDoctor: p.isDoctor || false,
        doctorApproved: p.doctorApproved || false,
        createdAt: p.createdAt,
      })),
      count: allPending.length,
    });
  } catch (error: any) {
    console.error('Error fetching doctor requests:', error);
    return res.status(500).json({ error: error.message });
  }
};

export default connectDBMiddleware(handler);

