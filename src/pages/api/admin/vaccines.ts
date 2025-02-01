import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const ADMIN_API_BASE_URL = 'https://omerald-admin.vercel.app';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const response = await axios.get(`${ADMIN_API_BASE_URL}/api/vaccine/readVaccines`, {
      headers: {
        'Accept': 'application/json, text/plain, */*',
      },
    });

    // Return the data as-is (could be array or wrapped)
    return res.status(200).json(response.data);
  } catch (error: any) {
    console.error('Error fetching vaccines from admin API:', error);
    return res.status(error?.response?.status || 500).json({
      error: error?.response?.data?.message || error?.message || 'Failed to fetch vaccines',
      details: error?.response?.data,
    });
  }
};

export default handler;


