import { NextApiRequest, NextApiResponse } from 'next';
import { S3Client, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Initialize S3 client
// Supports both IAM roles (for AWS infrastructure) and access keys (for local/dev)
const getS3Client = () => {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || process.env.AWS_SECRET_REGION || 'us-east-1';

  // If credentials are provided, use them (for local/dev)
  // Otherwise, let SDK use default credential chain (IAM role, environment, etc.)
  if (accessKeyId && secretAccessKey) {
    return new S3Client({
      region: region.trim(),
      credentials: {
        accessKeyId: accessKeyId.trim(),
        secretAccessKey: secretAccessKey.trim(),
      },
    });
  }

  // Try to use default credential chain (IAM role, environment variables, etc.)
  // This is useful when running on AWS infrastructure (EC2, ECS, Lambda)
  try {
    return new S3Client({
      region: region.trim(),
      // No credentials specified - SDK will use default credential chain
    });
  } catch (error) {
    throw new Error(
      'AWS credentials are not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in your environment variables, ' +
      'or configure an IAM role if running on AWS infrastructure. See AWS_S3_SETUP.md for details.'
    );
  }
};

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || process.env.AWS_BUCKET_NAME || 'omerald-diag-s3';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fileKey, expiresIn = 3600 } = req.body; // Default 1 hour

    if (!fileKey) {
      return res.status(400).json({ error: 'File key is required' });
    }

    // Normalize fileKey - ensure it's a string and handle any encoding issues
    let normalizedFileKey = String(fileKey).trim();
    
    // Decode URL-encoded characters if needed (e.g., %2B becomes +)
    // But only if it's URL-encoded, not if it's already decoded
    try {
      // Check if the key contains URL-encoded characters
      if (normalizedFileKey.includes('%')) {
        normalizedFileKey = decodeURIComponent(normalizedFileKey);
      }
    } catch (e) {
      // If decoding fails, use the original key
      console.warn('Failed to decode file key, using original:', normalizedFileKey);
    }

    console.log('Getting signed URL for fileKey:', normalizedFileKey);
    console.log('Bucket:', BUCKET_NAME);

    const s3Client = getS3Client();

    // First, check if the file exists
    try {
      const headCommand = new HeadObjectCommand({
        Bucket: BUCKET_NAME,
        Key: normalizedFileKey,
      });
      await s3Client.send(headCommand);
      console.log('File exists in S3:', normalizedFileKey);
    } catch (headError: any) {
      // If file doesn't exist, return 404
      if (headError.name === 'NotFound' || headError.$metadata?.httpStatusCode === 404 || headError.Code === 'NoSuchKey') {
        console.error('File not found in S3:', {
          fileKey: normalizedFileKey,
          originalFileKey: fileKey,
          bucket: BUCKET_NAME,
          error: headError.message,
        });
        return res.status(404).json({
          success: false,
          error: 'File not found',
          message: 'The requested file does not exist in storage.',
          fileKey: normalizedFileKey,
        });
      }
      // If access denied, return 403
      if (headError.name === 'AccessDenied' || headError.Code === 'AccessDenied' || headError.$metadata?.httpStatusCode === 403) {
        console.error('Access denied to file in S3:', {
          fileKey: normalizedFileKey,
          originalFileKey: fileKey,
          bucket: BUCKET_NAME,
          error: headError.message,
        });
        return res.status(403).json({
          success: false,
          error: 'Access Denied',
          message: 'You do not have permission to access this file. The file may have restricted permissions or the signed URL has expired.',
        });
      }
      // For other errors, log and continue (might be permission issue)
      console.warn('Error checking file existence:', {
        fileKey: normalizedFileKey,
        originalFileKey: fileKey,
        error: headError.message,
        name: headError.name,
        code: headError.Code,
      });
    }

    const getObjectCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: normalizedFileKey,
    });

    // Generate signed URL
    const signedUrl = await getSignedUrl(s3Client, getObjectCommand, {
      expiresIn: parseInt(expiresIn.toString()),
    });
    
    console.log('Successfully generated signed URL for:', normalizedFileKey);

    return res.status(200).json({
      success: true,
      url: signedUrl,
      expiresIn: expiresIn,
    });
  } catch (error: any) {
    console.error('Error generating signed URL:', error);
    
    // Check if it's a NoSuchKey error
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404 || error.Code === 'NoSuchKey') {
      return res.status(404).json({
        success: false,
        error: 'File not found',
        message: 'The requested file does not exist in storage.',
      });
    }
    
    // Check if it's an AccessDenied error
    if (error.name === 'AccessDenied' || error.Code === 'AccessDenied' || error.$metadata?.httpStatusCode === 403) {
      return res.status(403).json({
        success: false,
        error: 'Access Denied',
        message: 'You do not have permission to access this file. The file may have restricted permissions or your credentials lack the necessary access.',
      });
    }
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate signed URL',
    });
  }
};

export default handler;

