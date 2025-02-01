import { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import connectDB from '../db';

const connectDBMiddleware = (
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // Check if already connected
    if (
      mongoose.connections.length > 0 &&
      mongoose.connections[0].readyState === 1
    ) {
      return handler(req, res);
    }

    // If already connecting, wait for it
    if (
      mongoose.connections.length > 0 &&
      mongoose.connections[0].readyState === 2
    ) {
      await new Promise((resolve) => {
        mongoose.connection.once('connected', resolve);
      });
      return handler(req, res);
    }

    // Use new db connection
    try {
      console.log('🔌 Connecting to MongoDB...', {
        uri: process.env.MONGO_URI
          ? `${process.env.MONGO_URI.substring(0, 30)}...`
          : 'NOT SET',
        dbName: process.env.MONGO_DB_ENV || 'NOT SET',
      });

      await connectDB();
    } catch (error: any) {
      console.error('❌ MongoDB connection error:', error.message);
      return res.status(500).json({
        success: false,
        error: {
          code: 'DB_CONNECTION_ERROR',
          message: 'Failed to connect to database',
        },
      });
    }

    return handler(req, res);
  };
};

export default connectDBMiddleware;

