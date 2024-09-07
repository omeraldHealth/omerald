import { NextApiRequest, NextApiResponse } from 'next';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import formidable from 'formidable';
import fs from 'fs/promises';
import { createReadStream } from 'fs';

// Disable default body parser to handle file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper function to sanitize credentials (remove all whitespace, newlines, etc.)
const sanitizeCredential = (cred: string | undefined): string | undefined => {
  if (!cred) return undefined;
  // Remove all whitespace including newlines, tabs, and spaces, but keep hyphens for regions
  return cred.replace(/\s+/g, '').trim();
};

// Helper function to sanitize region (remove whitespace but keep hyphens)
const sanitizeRegion = (region: string | undefined): string => {
  if (!region) return 'us-east-1';
  // Remove leading/trailing whitespace and newlines, but keep internal hyphens
  return region.trim().replace(/[\n\r\t]/g, '');
};

// Initialize S3 client
// Supports both IAM roles (for AWS infrastructure) and access keys (for local/dev)
const getS3Client = () => {
  const accessKeyIdRaw = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKeyRaw = process.env.AWS_SECRET_ACCESS_KEY;
  const regionRaw = process.env.AWS_REGION || process.env.AWS_SECRET_REGION || 'us-east-1';

  // Sanitize credentials to remove any whitespace or newlines
  const accessKeyId = sanitizeCredential(accessKeyIdRaw);
  const secretAccessKey = sanitizeCredential(secretAccessKeyRaw);
  const region = sanitizeRegion(regionRaw);

  // Validate region format (should be like 'us-east-1', 'eu-west-1', etc.)
  const regionPattern = /^[a-z0-9-]+$/;
  if (!regionPattern.test(region)) {
    throw new Error(
      `Invalid AWS region format: "${region}". Region should be in format like 'us-east-1', 'eu-west-1', etc.`
    );
  }

  // If credentials are provided, use them (for local/dev)
  // Otherwise, let SDK use default credential chain (IAM role, environment, etc.)
  if (accessKeyId && secretAccessKey) {
    // Validate credential formats
    if (accessKeyId.length < 16 || accessKeyId.length > 128) {
      throw new Error(
        `Invalid AWS Access Key ID format. Access Key ID should be between 16-128 characters. Current length: ${accessKeyId.length}`
      );
    }

    if (secretAccessKey.length < 32 || secretAccessKey.length > 128) {
      throw new Error(
        `Invalid AWS Secret Access Key format. Secret Access Key should be between 32-128 characters. Current length: ${secretAccessKey.length}`
      );
    }

    try {
      return new S3Client({
        region: region,
        credentials: {
          accessKeyId: accessKeyId,
          secretAccessKey: secretAccessKey,
        },
        // AWS SDK v3 always uses SigV4 by default
      });
    } catch (error: any) {
      console.error('Error creating S3 client:', error);
      throw new Error(
        `Failed to initialize S3 client: ${error.message}. Please check your AWS credentials and region configuration.`
      );
    }
  }

  // Try to use default credential chain (IAM role, environment variables, etc.)
  // This is useful when running on AWS infrastructure (EC2, ECS, Lambda)
  try {
    return new S3Client({
      region: region,
      // No credentials specified - SDK will use default credential chain
      // AWS SDK v3 always uses SigV4 by default
    });
  } catch (error: any) {
    throw new Error(
      `AWS credentials are not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in your environment variables, ` +
      `or configure an IAM role if running on AWS infrastructure. Error: ${error.message}`
    );
  }
};

// Support both bucket name variable formats
const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || process.env.AWS_BUCKET_NAME || 'omerald-diag-s3';

// Cache S3 client instance to avoid recreating it on every request (performance optimization)
let cachedS3Client: S3Client | null = null;

const getOrCreateS3Client = (): S3Client => {
  if (cachedS3Client) {
    return cachedS3Client;
  }
  cachedS3Client = getS3Client();
  return cachedS3Client;
};

// Helper to parse form data with optimized settings for faster parsing
const parseForm = (req: NextApiRequest): Promise<{ fields: any; files: any }> => {
  return new Promise((resolve, reject) => {
    const form = formidable({
      maxFileSize: 50 * 1024 * 1024, // 50MB limit for reports
      keepExtensions: true,
      // Optimize for performance - disable unnecessary features
      multiples: false, // Single file uploads are faster
      encoding: 'utf-8',
      // Allow empty files (for edge cases)
      allowEmptyFiles: false,
      // Minimize file processing
      minFileSize: 1,
    });

    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse form data
    const { fields, files } = await parseForm(req);
    
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    const userId = Array.isArray(fields.userId) ? fields.userId[0] : fields.userId;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Validate file type (PDF and images)
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp'
    ];
    if (!allowedTypes.includes(file.mimetype || '')) {
      return res.status(400).json({ 
        error: 'Invalid file type. Only PDF and image files are allowed.' 
      });
    }

    // Generate file metadata
    const fileExtension = file.originalFilename?.split('.').pop() || 'pdf';
    const fileName = `reports/${userId}/${uuidv4()}.${fileExtension}`;
    const contentType = file.mimetype || 'application/pdf';

    // Get or create cached S3 client (faster - reuses connection)
    let s3Client;
    try {
      s3Client = getOrCreateS3Client();
    } catch (s3ClientError: any) {
      console.error('S3 Client initialization error:', s3ClientError);
      return res.status(500).json({
        success: false,
        error: 'AWS Configuration Error',
        message: s3ClientError.message || 'Failed to initialize AWS S3 client. Please check your AWS credentials configuration.',
        details: process.env.NODE_ENV === 'development' ? s3ClientError.stack : undefined,
      });
    }

    // Use streaming for better performance with large files
    // Read file as stream instead of loading entire file into memory
    const fileStream = createReadStream(file.filepath);

    // Upload to S3 using stream for better performance
    const uploadCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: fileStream, // Use stream instead of buffer
      ContentType: contentType,
      // Try to set ACL if bucket allows it, otherwise rely on bucket policy
      // ACL: 'public-read', // Uncomment if bucket ACLs are enabled
    });

    try {
      // Upload file to S3
      await s3Client.send(uploadCommand);
      console.log('File uploaded successfully to S3:', fileName);
      
      // Clean up temp file immediately after successful upload (don't wait for signed URL)
      try {
        await fs.unlink(file.filepath);
      } catch (cleanupError) {
        console.error('Error cleaning up temp file:', cleanupError);
      }
    } catch (uploadError: any) {
      console.error('Error uploading file to S3:', uploadError);
      console.error('Upload Error Details:', {
        name: uploadError.name,
        code: uploadError.Code,
        message: uploadError.message,
        stack: uploadError.stack,
        $metadata: uploadError.$metadata,
      });
      
      // Clean up temporary file before returning error
      try {
        await fs.unlink(file.filepath);
      } catch (cleanupError) {
        console.error('Error cleaning up temp file:', cleanupError);
      }
      
      // Handle specific S3 errors
      if (uploadError.name === 'AccessDenied' || uploadError.Code === 'AccessDenied') {
        console.error('S3 AccessDenied Error Details:', {
          bucket: BUCKET_NAME,
          key: fileName,
          region: process.env.AWS_REGION || process.env.AWS_SECRET_REGION || 'us-east-1',
          errorCode: uploadError.Code,
          errorMessage: uploadError.message,
        });
        
        return res.status(403).json({
          success: false,
          error: 'Access Denied',
          message: 'You do not have permission to upload files to this storage location. Please check your AWS credentials and bucket permissions.',
          help: 'See AWS_S3_SETUP.md for instructions on configuring IAM permissions and bucket policies.',
        });
      }
      
      // Handle malformed credentials error
      if (
        uploadError.message?.includes('malformed') ||
        uploadError.message?.includes('Credential') ||
        uploadError.message?.includes('authorization header') ||
        uploadError.Code === 'SignatureDoesNotMatch' ||
        uploadError.name === 'SignatureDoesNotMatch'
      ) {
        return res.status(400).json({
          success: false,
          error: 'AWS Credentials Error',
          message: 'AWS credentials are malformed or invalid. Please check your AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables in Vercel.',
          help: 'Make sure there are no extra spaces, newlines, or special characters in your AWS credentials. Credentials should be copied exactly as provided by AWS.',
          details: process.env.NODE_ENV === 'development' 
            ? `Error: ${uploadError.message}` 
            : 'Check Vercel environment variables for proper credential formatting.',
        });
      }
      
      // Handle bucket not found
      if (uploadError.name === 'NoSuchBucket' || uploadError.Code === 'NoSuchBucket') {
        return res.status(404).json({
          success: false,
          error: 'Bucket Not Found',
          message: `The S3 bucket "${BUCKET_NAME}" does not exist or is not accessible.`,
          help: 'Please verify your AWS_S3_BUCKET_NAME environment variable is correct.',
        });
      }
      
      return res.status(500).json({
        success: false,
        error: 'Upload Failed',
        message: uploadError.message || 'Failed to upload file to S3',
        errorCode: uploadError.Code || uploadError.name,
        help: 'Please check your AWS configuration and try again.',
      });
    }

    // Return immediately with direct URL (skip signed URL generation for faster response)
    // Signed URL can be generated on-demand via /api/upload/getSignedUrl if needed
    const region = sanitizeRegion(process.env.AWS_REGION || process.env.AWS_SECRET_REGION);
    const directUrl = `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${fileName}`;

    // Return immediately without waiting for signed URL generation (much faster)
    return res.status(200).json({
      success: true,
      url: directUrl, // Direct URL - fastest response
      directUrl: directUrl,
      fileName: fileName,
      message: 'Report uploaded to S3 successfully',
      // Note: Signed URL can be generated on-demand via /api/upload/getSignedUrl endpoint if needed
    });
  } catch (error: any) {
    console.error('Error uploading report to S3:', error);
    
    // Handle specific S3 errors
    if (error.name === 'AccessDenied' || error.Code === 'AccessDenied') {
      return res.status(403).json({
        success: false,
        error: 'Access Denied',
        message: 'You do not have permission to upload files. Please check your AWS credentials and bucket permissions.',
      });
    }
    
    if (error.name === 'NoSuchBucket' || error.Code === 'NoSuchBucket') {
      return res.status(404).json({
        success: false,
        error: 'Bucket Not Found',
        message: 'The specified S3 bucket does not exist. Please check your bucket configuration.',
      });
    }
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload report to S3',
    });
  }
};

export default handler;

