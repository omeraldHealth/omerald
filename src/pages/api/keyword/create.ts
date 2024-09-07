import { NextApiRequest, NextApiResponse } from 'next';
import connectDBMiddleware from '@/lib/middleware/connectDB';
import KeywordsTable from '@/lib/models/Keywords';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!req.body) {
    return res.status(400).json({ error: 'Input cannot be empty' });
  }

  try {
    const keywordObject = new KeywordsTable(req.body);
    const data = await keywordObject.save();
    return res.status(201).json({ message: 'Keyword Inserted Successfully', data });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error while saving data' });
  }
};

export default connectDBMiddleware(handler);

