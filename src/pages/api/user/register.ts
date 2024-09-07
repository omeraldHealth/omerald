import { NextApiRequest, NextApiResponse } from 'next';
import connectDBMiddleware from '@/lib/middleware/connectDB';
import UserTable from '@/lib/models/User';
import jwt from 'jsonwebtoken';

const jwtSecret = process.env.JWT_SECRET || '';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { phoneNumber, uid } = req.body;

    if (!phoneNumber || !uid) {
      return res.status(400).json({ error: 'Phone number and UID are required' });
    }

    const queryData = { phoneNumber, uid };
    const queryResult = await UserTable.find(queryData);
    let userObject = queryResult[0];

    if (!userObject) {
      const UserObject = new UserTable(queryData);
      userObject = await UserObject.save();
    }

    if (!jwtSecret) {
      return res.status(500).json({ error: 'JWT_SECRET not configured' });
    }

    const token = jwt.sign(userObject.toObject(), jwtSecret, {
      expiresIn: '365d',
    });

    res.setHeader('Set-Cookie', `authorization=${token}; HttpOnly; Path=/; Max-Age=31536000`);
    return res.status(200).json({
      success: true,
      token: 'Bearer ' + token,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error while saving data' });
  }
};

export default connectDBMiddleware(handler);

