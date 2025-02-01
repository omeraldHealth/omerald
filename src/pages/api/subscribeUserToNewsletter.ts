import { NextApiRequest, NextApiResponse } from 'next';
import mailchimp from '@mailchimp/mailchimp_marketing';

mailchimp.setConfig({
  apiKey: process.env.MAILCHIMP_API_KEY || '',
  server: process.env.MAILCHIMP_API_SERVER || '',
});

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const response = await mailchimp.lists.addListMember(
      process.env.MAILCHIMP_AUDIENCE_ID || '',
      {
        email_address: email,
        status: 'subscribed',
      }
    );
    return res.status(201).json({ success: true, data: response });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || error.toString() });
  }
};

