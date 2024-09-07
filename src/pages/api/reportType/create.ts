import { NextApiRequest, NextApiResponse } from 'next';
import connectDBMiddleware from '@/lib/middleware/connectDB';
import ReportTypesTable from '@/lib/models/ReportTypes';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!req.body) {
    return res.status(400).json({ error: 'Input cannot be empty' });
  }

  try {
    const reportTypeObject = new ReportTypesTable(req.body);
    const data = await reportTypeObject.save();
    return res.status(201).json({ message: 'Report Type Inserted Successfully', data });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error while saving data' });
  }
};

export default connectDBMiddleware(handler);

