const db = require('../config/db');
const bcrypt = require('bcrypt');
const { ensureAppSchema } = require('../utils/schema');
require('../config/env');

async function initDb() {
  try {
    console.log('Initializing database...');
    await ensureAppSchema();
    console.log('Application schema synced.');

    // Seed HOD
    const hodEmail = process.env.HOD_EMAIL;
    const hodPassword = process.env.HOD_PASSWORD;
    const hashedPassword = await bcrypt.hash(hodPassword, 10);

    const existingHod = await db.query('SELECT * FROM users WHERE email = $1', [hodEmail]);

    if (existingHod.rows.length === 0) {
      await db.query(
        'INSERT INTO users (name, email, password, role, updated_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)',
        ['Head of Department', hodEmail, hashedPassword, 'hod']
      );
      console.log('HOD user seeded successfully.');
    } else {
      await db.query(
        'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2',
        [hashedPassword, hodEmail]
      );
      console.log('HOD password synced with .env.');
    }

    console.log('Database initialization complete.');
    process.exit(0);
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

initDb();
