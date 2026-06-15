const path = require('path');
const dotenv = require('dotenv');

dotenv.config({
  path: path.join(__dirname, '../.env'),
  quiet: true,
});

const SSLMODE_ALIASES = new Set(['prefer', 'require', 'verify-ca']);

function normalizeDatabaseUrl(connectionString) {
  if (!connectionString) {
    return connectionString;
  }

  try {
    const url = new URL(connectionString);
    const sslMode = url.searchParams.get('sslmode');

    if (SSLMODE_ALIASES.has(sslMode)) {
      // Preserve current pg behavior without triggering the deprecation warning.
      url.searchParams.set('sslmode', 'verify-full');
      return url.toString();
    }
  } catch (error) {
    // Leave invalid values untouched so pg can report the original problem.
  }

  return connectionString;
}

if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = normalizeDatabaseUrl(process.env.DATABASE_URL);
}

module.exports = process.env;
