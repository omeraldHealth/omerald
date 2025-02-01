import { NextApiRequest, NextApiResponse } from 'next';
import connectMySQLMiddleware from '@/lib/mysql/middleware/connectMySQL';
import getPool from '@/lib/mysql/db';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const pool = getPool();
    
    // Get query parameters for filtering/pagination
    const { status, limit, offset, sortBy = 'created_at', sortOrder = 'DESC' } = req.query;
    
    // Build base query for counting
    let countQuery = 'SELECT COUNT(*) as total FROM articles';
    const countParams: any[] = [];
    
    // Build query for data
    let query = 'SELECT * FROM articles';
    const params: any[] = [];
    
    // Add status filter if provided
    if (status) {
      const statusValue = parseInt(status as string, 10);
      countQuery += ' WHERE status = ?';
      countParams.push(statusValue);
      query += ' WHERE status = ?';
      params.push(statusValue);
    }
    
    // Get total count first
    const [countResult] = await pool.execute(countQuery, countParams) as any[];
    const totalCount = countResult[0]?.total || 0;
    
    // Add sorting
    const validSortColumns = ['created_at', 'updated_at', 'approval_date', 'title', 'id'];
    const sortColumn = validSortColumns.includes(sortBy as string) ? sortBy : 'created_at';
    const sortDirection = (sortOrder as string).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortColumn} ${sortDirection}`;
    
    // Add pagination
    if (limit) {
      query += ' LIMIT ?';
      params.push(parseInt(limit as string, 10));
      
      if (offset) {
        query += ' OFFSET ?';
        params.push(parseInt(offset as string, 10));
      }
    }
    
    const [rows] = await pool.execute(query, params);
    
    return res.status(200).json({
      success: true,
      data: rows,
      count: Array.isArray(rows) ? rows.length : 0,
      totalCount: totalCount,
    });
  } catch (error: any) {
    console.error('Error fetching articles:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export default connectMySQLMiddleware(handler);

