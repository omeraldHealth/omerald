import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const ADMIN_API_BASE_URL =
  process.env.ADMIN_API_BASE_URL ||
  process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL ||
  'https://admin.omerald.com';

export type UserSettingItem = {
  _id: string;
  FAQs?: string;
  Privacy_Policy?: string;
  Terms_Of_Service?: string;
  Platform_Consent?: string;
  Disclaimer?: string;
  Customer_Support?: string;
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const response = await axios.get<UserSettingItem[]>(
      `${ADMIN_API_BASE_URL}/api/userSetting/getAllUserSetting`,
      {
        headers: {
          Accept: 'application/json, text/plain, */*',
        },
        timeout: 10000,
      }
    );

    return res.status(200).json(response.data ?? []);
  } catch (error: unknown) {
    const err = error as { response?: { status?: number; data?: unknown }; message?: string };
    console.error('Error fetching user settings from admin API:', err);
    return res.status(err?.response?.status ?? 500).json({
      error:
        (err?.response?.data as { message?: string })?.message ??
        err?.message ??
        'Failed to fetch user settings',
      details: err?.response?.data,
    });
  }
};

export default handler;
