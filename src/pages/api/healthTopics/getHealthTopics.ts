import { NextApiRequest, NextApiResponse } from 'next';

const HEALTH_TOPICS_API_URL = 'http://medin.life/api/v1/health_topics/get_health_topics';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: `Method ${req.method} not allowed. Only GET is supported.`,
      },
    });
  }

  try {
    const response = await fetch(HEALTH_TOPICS_API_URL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept-Language': 'en-US',
        appaccesstoken: 'A7UVIN#3943=T@b^Nbdhb7s3Sf_v@p_B',
        appauthoken: '3zB3WsznQu0oqxyr3rwQ3u1QYWQw1mDadE9rFCPEMYd2SOcruUBQPvv1XuR9Hlbv_1660434921',
      },
    });

    if (!response.ok) {
      throw new Error(`Health topics API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const topics = data?.result || data?.data || [];

    return res.status(200).json({
      success: true,
      data: Array.isArray(topics) ? topics : [],
      count: Array.isArray(topics) ? topics.length : 0,
    });
  } catch (error: any) {
    console.error('Error fetching health topics:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to fetch health topics',
      },
    });
  }
};

export default handler;







