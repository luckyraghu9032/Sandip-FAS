require('./env');
const { Pool } = require('pg');
const path = require('path');

const isLocal = process.env.NODE_ENV === 'development' || !process.env.DATABASE_URL;

const poolConfig = isLocal
  ? {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'fas_database',
      ssl: false,
    }
  : {
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
    };

const pool = new Pool(poolConfig);

pool.on('connect', () => {
  console.log(isLocal ? 'Connected to local PostgreSQL' : 'Connected to Neon PostgreSQL');
});

pool.on('error', (err) => {
  console.error(isLocal ? 'Local PostgreSQL connection error:' : 'Neon connection error:', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};
