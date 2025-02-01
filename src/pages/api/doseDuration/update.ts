import { NextApiRequest, NextApiResponse } from 'next';
import connectDBMiddleware from '@/lib/middleware/connectDB';
import DoseDurationsTable from '@/lib/models/DoseDurations';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!req.body) {
    return res.status(400).json({ error: 'Input cannot be empty' });
  }

  try {
    const id = req.body._id;
    if (!id) {
      return res.status(400).json({ error: 'Dose Duration ID is required' });
    }

    const data = await DoseDurationsTable.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!data) {
      return res.status(404).json({ error: `Data not found for id ${id}` });
    }

    return res.json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error while updating Data' });
  }
};

export default connectDBMiddleware(handler);

