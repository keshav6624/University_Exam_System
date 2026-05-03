/**
 * Supabase Database Configuration
 * Uses Supabase PostgreSQL backend
 * 
 * For direct SQL queries, we use the PostgreSQL connection string
 * available from Supabase project settings
 */
const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client for auth and other features
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Supabase credentials not found in environment variables');
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * PostgreSQL Pool using Supabase connection string
 * Format: postgresql://postgres.PROJECT_ID:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres
 * 
 * You can find this in Supabase Dashboard > Project Settings > Database > Connection string
 */
const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL not found in environment variables');
  console.error('Please set DATABASE_URL (Supabase PostgreSQL connection string) in .env');
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

// Test connection with retries and graceful fallback
const testConnection = async (retries = 5, delayMs = 2000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const client = await pool.connect();
      client.release();
      console.log('✅ Supabase PostgreSQL connected successfully');
      return true;
    } catch (err) {
      console.error(`❌ Supabase PostgreSQL connection error (attempt ${i + 1}/${retries}):`, err.message);
      if (i < retries - 1) await new Promise(r => setTimeout(r, delayMs));
    }
  }
  console.error('❌ Unable to connect to Supabase PostgreSQL after retries. Continuing without DB connection.');
  return false;
};

testConnection().then(ok => {
  if (!ok) {
    // Leave pool as-is; query() will throw helpful error when used
  }
}).catch(err => {
  console.error('Unexpected error testing DB connection:', err.message || err);
});

/**
 * Query helper with error handling
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 */
const query = async (text, params) => {
  if (!pool) throw new Error('Database pool not initialized');
  try {
    return await pool.query(text, params);
  } catch (err) {
    console.error('Database query error:', err.message || err);
    throw err;
  }
};

/**
 * Transaction helper
 */
const withTransaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { query, pool, supabase, withTransaction };
