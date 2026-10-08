const path = require('path');
const { loadEnvConfig } = require('@next/env');

const projectRoot = path.resolve(__dirname, '..');
loadEnvConfig(projectRoot);

function getDatabaseConfig() {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    };
  }

  return {
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433', 10),
    database: process.env.DB_NAME || 'postgismap',
  };
}

module.exports = { getDatabaseConfig };
