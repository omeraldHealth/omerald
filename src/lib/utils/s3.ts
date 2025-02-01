import { S3Client } from '@aws-sdk/client-s3';

/**
 * Initialize S3 client
 * Supports both IAM roles (for AWS infrastructure) and access keys (for local/dev)
 */
export const getS3Client = () => {
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
      'or configure an IAM role if running on AWS infrastructure.'
    );
  }
};

export const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || process.env.AWS_BUCKET_NAME || 'omerald-diag-s3';







