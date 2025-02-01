import { NextApiRequest, NextApiResponse } from 'next';
import connectDBMiddleware from '@/lib/middleware/connectDB';
import VaccinesTable from '@/lib/models/Vaccines';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const id = req.body._id || req.query.id;
    if (!id) {
      return res.status(400).json({ error: 'Vaccine ID is required' });
    }

    const data = await VaccinesTable.findByIdAndDelete(id);

    if (!data) {
      return res.status(404).json({ error: `Data not found for id ${id}` });
    }

    return res.json({ message: 'Vaccine Deleted Successfully', data });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error while Deleting Data' });
  }
};

export default connectDBMiddleware(handler);

