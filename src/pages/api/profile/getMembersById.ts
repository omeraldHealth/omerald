import { NextApiRequest, NextApiResponse } from 'next';
import connectDBMiddleware from '@/lib/middleware/connectDB';
import ProfileTable from '@/lib/models/Profile';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  // Support both GET (legacy) and POST (for array of IDs)
  if (req.method === 'GET') {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: 'Profile ID is required' });
    }

    const profile = await ProfileTable.findById(id);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    return res.status(200).json(profile.members || []);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
  }

  if (req.method === 'POST') {
    try {
      const { members } = req.body;
      
      if (!members || !Array.isArray(members) || members.length === 0) {
        return res.status(400).json({ error: 'members array is required' });
      }

      // Fetch all profiles by their IDs
      const profiles = await ProfileTable.find({
        _id: { $in: members },
      });

      return res.status(200).json({
        success: true,
        data: profiles,
        count: profiles.length,
      });
    } catch (error: any) {
      console.error('Error fetching members by IDs:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};

export default connectDBMiddleware(handler);

