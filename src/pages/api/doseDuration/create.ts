import { NextApiRequest, NextApiResponse } from 'next';
import connectDBMiddleware from '@/lib/middleware/connectDB';
import DoseDurationsTable from '@/lib/models/DoseDurations';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!req.body || !req.body.duration) {
    return res.status(400).json({ error: 'Input cannot be empty. Duration is required.' });
  }

  try {
    const doseDurationObject = new DoseDurationsTable({
      duration: req.body.duration,
    });

    const data = await doseDurationObject.save();
    return res.status(201).json({ message: 'Dose Duration Inserted Successfully', data });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error while saving data' });
  }
};

export default connectDBMiddleware(handler);

