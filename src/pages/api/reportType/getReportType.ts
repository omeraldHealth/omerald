import { NextApiRequest, NextApiResponse } from 'next';
import connectDBMiddleware from '@/lib/middleware/connectDB';
import ReportTypesTable from '@/lib/models/ReportTypes';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { _id } = req.body;
    if (!_id) {
      res.status(400).json({ error: 'Report Type ID is required' });
      return;
    }

    const data = await ReportTypesTable.findById(_id);
    if (!data) {
      res.status(404).json({ error: 'Report Type not found' });
      return;
    }
    
    // Return consistent format
    res.status(200).json({
      success: true,
      data: data,
      testName: data.testName || data.name || data.type,
      name: data.name || data.testName || data.type,
      type: data.type || data.testName || data.name,
    });
    return;
  } catch (error: any) {
    console.error('Error fetching report type:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Internal server error' 
    });
    return;
  }
};

export default connectDBMiddleware(handler);

