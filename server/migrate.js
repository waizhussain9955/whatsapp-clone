const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres.pithpspoeugydpzjgowg',
  password: '+zTrgwG*%v9/pn4',
  host: 'aws-1-ap-northeast-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await pool.query('ALTER TABLE messages ADD COLUMN IF NOT EXISTS "replyTo" TEXT');
    console.log('Successfully added replyTo column');
  } catch (err) {
    console.error('Error adding column:', err);
  } finally {
    pool.end();
  }
}

run();
