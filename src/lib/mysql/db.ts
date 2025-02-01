import mysql from 'mysql2/promise';

const MYSQL_HOST = process.env.MYSQL_HOST || '';
const MYSQL_DATABASE = process.env.MYSQL_DATABASE || '';
const MYSQL_USER = process.env.MYSQL_USER || '';
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || '';
const MYSQL_PORT = parseInt(process.env.MYSQL_PORT || '3306', 10);

if (!MYSQL_HOST || !MYSQL_DATABASE || !MYSQL_USER || !MYSQL_PASSWORD) {
  throw new Error('Please define MYSQL_HOST, MYSQL_DATABASE, MYSQL_USER, and MYSQL_PASSWORD environment variables inside .env.local');
}

interface MySQLCache {
  pool: mysql.Pool | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mysqlPool: MySQLCache | undefined;
}

let cached: MySQLCache = global.mysqlPool || { pool: null };

if (!global.mysqlPool) {
  global.mysqlPool = cached;
}

function getPool(): mysql.Pool {
  if (cached.pool) {
    return cached.pool;
  }

  cached.pool = mysql.createPool({
    host: MYSQL_HOST,
    port: MYSQL_PORT,
    database: MYSQL_DATABASE,
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  });

  console.log('✅ MySQL connection pool created for:', MYSQL_DATABASE);
  return cached.pool;
}

export default getPool;

