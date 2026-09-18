const { Pool } = require('pg');

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    })
  : null;

if (pool) {
  pool.on('connect', () => {
    console.log('[DB] Connected to PostgreSQL Database.');
  });
  pool.on('error', (err) => {
    console.error('[DB] PostgreSQL pool error:', err.message);
  });
} else {
  console.log('[DB] No DATABASE_URL provided. Running in standalone High-Fidelity Mock & In-Memory Store mode (ideal for development, testing, and viva demos).');
}

module.exports = {
  query: (text, params) => {
    if (pool) {
      return pool.query(text, params);
    }
    return null;
  },
  pool
};
