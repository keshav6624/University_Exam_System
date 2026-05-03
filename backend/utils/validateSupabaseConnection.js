/**
 * Supabase Connection Validator
 * Run this to test your Supabase setup before running the app
 * 
 * Usage: node utils/validateSupabaseConnection.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');

const validateEnvVars = () => {
  console.log('\n📋 Checking environment variables...\n');
  
  const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'DATABASE_URL'];
  let allValid = true;
  
  required.forEach(key => {
    const value = process.env[key];
    if (value) {
      const masked = value.length > 20 ? value.substring(0, 20) + '...' : value;
      console.log(`✅ ${key}: ${masked}`);
    } else {
      console.log(`❌ ${key}: NOT SET`);
      allValid = false;
    }
  });
  
  return allValid;
};

const testSupabaseConnection = async () => {
  console.log('\n🔗 Testing Supabase API connection...\n');
  
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    const { data, error } = await supabase.auth.admin.listUsers();
    
    if (error) throw error;
    console.log('✅ Supabase API connection successful');
    return true;
  } catch (err) {
    console.log('❌ Supabase API connection failed:', err.message);
    return false;
  }
};

const testPostgresConnection = async () => {
  console.log('\n🗄️  Testing PostgreSQL connection...\n');
  
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
    
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('✅ PostgreSQL connection successful');
    console.log('   Server time:', result.rows[0].current_time);
    
    // Check if tables exist
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      LIMIT 1
    `);
    
    if (tableCheck.rows.length > 0) {
      console.log('✅ Database tables found');
    } else {
      console.log('⚠️  No tables found - run "npm run db:setup" to create schema');
    }
    
    await pool.end();
    return true;
  } catch (err) {
    console.log('❌ PostgreSQL connection failed:', err.message);
    console.log('\n💡 Tips:');
    console.log('   - Check DATABASE_URL format in .env');
    console.log('   - Ensure database password is correct');
    console.log('   - Verify Supabase project is running');
    return false;
  }
};

const main = async () => {
  console.log('\n╔═══════════════════════════════════════╗');
  console.log('║  Supabase Connection Validator        ║');
  console.log('╚═══════════════════════════════════════╝');
  
  const envValid = validateEnvVars();
  if (!envValid) {
    console.log('\n❌ Missing environment variables. Please update .env file.');
    process.exit(1);
  }
  
  const supabaseOk = await testSupabaseConnection();
  const postgresOk = await testPostgresConnection();
  
  console.log('\n╔═══════════════════════════════════════╗');
  if (supabaseOk && postgresOk) {
    console.log('║  ✅ All connections successful!       ║');
    console.log('║  Run "npm run dev" to start server    ║');
  } else {
    console.log('║  ❌ Some connections failed           ║');
    console.log('║  Please fix issues above              ║');
  }
  console.log('╚═══════════════════════════════════════╝\n');
  
  process.exit(supabaseOk && postgresOk ? 0 : 1);
};

main();
