import { NextApiRequest, NextApiResponse } from 'next';
import getPool from '../db';

const connectMySQLMiddleware = (
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // Get or create connection pool
      const pool = getPool();
      
      // Test connection with a simple query
      const connection = await pool.getConnection();
      await connection.ping();
      connection.release();

      return handler(req, res);
    } catch (error: any) {
      console.error('❌ MySQL connection error:', error.message);
      return res.status(500).json({
        success: false,
        error: {
          code: 'DB_CONNECTION_ERROR',
          message: 'Failed to connect to MySQL database',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
      });
    }
  };
};

export default connectMySQLMiddleware;

