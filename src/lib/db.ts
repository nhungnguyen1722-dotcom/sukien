import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL;
const isRemoteSsl = !!databaseUrl && /neon\.tech|sslmode=require|sslmode=verify-full/i.test(databaseUrl);

const pool = new Pool(
  databaseUrl
    ? {
        connectionString: databaseUrl,
        ...(isRemoteSsl ? { ssl: { rejectUnauthorized: false } } : {}),
      }
    : {
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '1111222267',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        database: process.env.DB_NAME || 'postgismap',
      }
);

export default pool;
