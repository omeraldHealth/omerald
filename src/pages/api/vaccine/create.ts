import { NextApiRequest, NextApiResponse } from 'next';
import connectDBMiddleware from '@/lib/middleware/connectDB';
import VaccinesTable from '@/lib/models/Vaccines';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!req.body || !req.body.name) {
    return res.status(400).json({ error: 'Input cannot be empty. Name is required.' });
  }

  try {
    const vaccineObject = new VaccinesTable({
      name: req.body.name,
    });

    const data = await vaccineObject.save();
    return res.status(201).json({ message: 'Vaccine Inserted Successfully', data });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error while saving data' });
  }
};

export default connectDBMiddleware(handler);

