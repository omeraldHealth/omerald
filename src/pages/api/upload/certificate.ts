import { NextApiRequest, NextApiResponse } from 'next';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import formidable from 'formidable';
import fs from 'fs';

// Disable default body parser to handle file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

// Initialize S3 client - only if credentials are available
const getS3Client = () => {
  // Support both variable name formats
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || process.env.AWS_SECRET_REGION || 'us-east-1';

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('AWS credentials are not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in your environment variables.');
  }

  return new S3Client({
    region: region.trim(),
    credentials: {
      accessKeyId: accessKeyId.trim(),
      secretAccessKey: secretAccessKey.trim(),
    },
  });
};

// Support both bucket name variable formats
const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || process.env.AWS_BUCKET_NAME || 'omerald-diag-s3';

// Helper to parse form data
const parseForm = (req: NextApiRequest): Promise<{ fields: any; files: any }> => {
  return new Promise((resolve, reject) => {
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      keepExtensions: true,
    });

    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse form data
    const { fields, files } = await parseForm(req);
    
    const file = Array.isArray(files.certificate) ? files.certificate[0] : files.certificate;
    const profileId = Array.isArray(fields.profileId) ? fields.profileId[0] : fields.profileId;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!profileId) {
      return res.status(400).json({ error: 'Profile ID is required' });
    }

    // Read file
    const fileBuffer = fs.readFileSync(file.filepath);
    const fileExtension = file.originalFilename?.split('.').pop() || 'pdf';
    const fileName = `doctor-certificates/${profileId}/${uuidv4()}.${fileExtension}`;
    const contentType = file.mimetype || 'application/pdf';

    // Initialize S3 client
    const s3Client = getS3Client();

    // Upload to S3
    // Note: ACL is removed as the bucket has ACLs disabled
    // Files will be accessible based on bucket policy
    const uploadCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: fileBuffer,
      ContentType: contentType,
      // ACL removed - bucket has ACLs disabled
      // Make sure your bucket policy allows public read access if needed
    });

    await s3Client.send(uploadCommand);

    // Construct S3 URL
    const region = process.env.AWS_REGION || process.env.AWS_SECRET_REGION || 'us-east-1';
    const s3Url = `https://${BUCKET_NAME}.s3.${region.trim()}.amazonaws.com/${fileName}`;

    console.log('S3 Upload successful:', {
      fileName,
      s3Url,
      bucket: BUCKET_NAME,
      region: region.trim(),
    });

    // Clean up temporary file
    fs.unlinkSync(file.filepath);

    return res.status(200).json({
      success: true,
      url: s3Url,
      fileName: fileName,
      message: 'Certificate uploaded to S3 successfully',
    });
  } catch (error: any) {
    console.error('Error uploading certificate to S3:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to upload certificate to S3' 
    });
  }
};

export default handler;

