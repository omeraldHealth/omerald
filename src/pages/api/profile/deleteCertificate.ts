import { NextApiRequest, NextApiResponse } from 'next';
import connectDBMiddleware from '@/lib/middleware/connectDB';
import ProfileTable from '@/lib/models/Profile';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

// Initialize S3 client
const getS3Client = () => {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || process.env.AWS_SECRET_REGION || 'us-east-1';

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('AWS credentials are not configured');
  }

  return new S3Client({
    region: region.trim(),
    credentials: {
      accessKeyId: accessKeyId.trim(),
      secretAccessKey: secretAccessKey.trim(),
    },
  });
};

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || process.env.AWS_BUCKET_NAME || 'omerald-diag-s3';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'DELETE') {
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

    const certificateUrl = profile.doctorCertificate;

    // Delete from S3 if certificate URL exists
    if (certificateUrl && certificateUrl.includes('amazonaws.com')) {
      try {
        // Extract the key from the S3 URL
        // URL format: https://bucket.s3.region.amazonaws.com/key
        const urlParts = certificateUrl.split('.amazonaws.com/');
        if (urlParts.length === 2) {
          const key = urlParts[1];
          const s3Client = getS3Client();

          const deleteCommand = new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
          });

          await s3Client.send(deleteCommand);
          console.log('Certificate deleted from S3:', key);
        }
      } catch (s3Error: any) {
        console.error('Error deleting from S3:', s3Error);
        // Continue even if S3 delete fails
      }
    }

    // Remove certificate from profile
    profile.doctorCertificate = '';
    await profile.save();

    return res.status(200).json({
      success: true,
      message: 'Certificate deleted successfully',
      profile,
    });
  } catch (error: any) {
    console.error('Error deleting certificate:', error);
    return res.status(500).json({ error: error.message });
  }
};

export default connectDBMiddleware(handler);

