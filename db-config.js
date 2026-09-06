const { loadEnvConfig } = require('@next/env');

loadEnvConfig(process.cwd());

function getDatabaseConfig() {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    };
  }

  return {
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '1111222267',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433', 10),
    database: process.env.DB_NAME || 'postgismap',
  };
}

module.exports = { getDatabaseConfig };
