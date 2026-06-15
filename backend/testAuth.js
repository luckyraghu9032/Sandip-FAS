const db = require('./config/db');
const bcrypt = require('bcrypt');
require('./config/env');

async function test() {
  try {
    const res = await db.query('SELECT password FROM users WHERE email = $1', ['hod@sandipuniversity.edu.in']);
    if (res.rows.length === 0) {
      console.log('User not found');
      process.exit(0);
    }
    const match = await bcrypt.compare('hod_password_123', res.rows[0].password);
    console.log('Match result:', match);
    process.exit(0);
  } catch (err) {
    console.error('Error during test:', err);
    process.exit(1);
  }
}
test();
