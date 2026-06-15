const db = require('../config/db');

let schemaPromise = null;

async function syncUsersTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100),
      email VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL,
      prn_number VARCHAR(50) UNIQUE,
      division VARCHAR(50),
      department VARCHAR(100),
      profile_data JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS prn_number VARCHAR(50) UNIQUE
  `);

  await db.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS department VARCHAR(100)
  `);

  await db.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS profile_data JSONB DEFAULT '{}'::jsonb
  `);

  await db.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);

  await db.query(`
    ALTER TABLE users
    ALTER COLUMN division TYPE VARCHAR(50)
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_users_role_division ON users(role, division)
  `);
}

async function syncFasTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS fas_records (
      id SERIAL PRIMARY KEY,
      student_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      division VARCHAR(50),
      coordinator_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      uploaded_file_name VARCHAR(255),
      form_data JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(student_user_id)
    )
  `);

  await db.query(`
    ALTER TABLE fas_records
    ADD COLUMN IF NOT EXISTS division VARCHAR(50)
  `);

  await db.query(`
    ALTER TABLE fas_records
    ADD COLUMN IF NOT EXISTS coordinator_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
  `);

  await db.query(`
    ALTER TABLE fas_records
    ADD COLUMN IF NOT EXISTS uploaded_file_name VARCHAR(255)
  `);

  await db.query(`
    ALTER TABLE fas_records
    ADD COLUMN IF NOT EXISTS form_data JSONB DEFAULT '{}'::jsonb
  `);

  await db.query(`
    ALTER TABLE fas_records
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_fas_division ON fas_records(division)
  `);
}

async function ensureAppSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await syncUsersTable();
      await syncFasTable();
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }

  return schemaPromise;
}

module.exports = {
  ensureAppSchema,
};
