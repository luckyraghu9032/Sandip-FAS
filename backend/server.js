const express = require('express');
const cors = require('cors');
const path = require('path');
require('./config/env');
const { ensureAppSchema } = require('./utils/schema');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Routes
const authRoutes = require('./routes/auth');
const hodRoutes = require('./routes/hod');
const coordinatorRoutes = require('./routes/coordinator');
const studentRoutes = require('./routes/student');
const notificationRoutes = require('./routes/notifications');
app.use('/api/auth', authRoutes);
app.use('/api/hod', hodRoutes);
app.use('/api/coordinator', coordinatorRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/notifications', notificationRoutes);

// Basic health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend is running and connected to Neon' });
});

// Serve static frontend files
app.use('/css', express.static(path.join(__dirname, '../frontend/css')));
app.use(express.static(path.join(__dirname, '../frontend')));

app.use((err, req, res, next) => {
  const isJsonParseError = err instanceof SyntaxError && err.type === 'entity.parse.failed';
  const statusCode = isJsonParseError ? 400 : (err.status || err.statusCode || 500);

  console.error(`${req.method} ${req.originalUrl} failed:`, err.stack || err);

  if (res.headersSent) {
    next(err);
    return;
  }

  res.status(statusCode).json({
    error: isJsonParseError
      ? 'Request body must be valid JSON.'
      : (statusCode === 500 ? 'Internal server error' : (err.message || 'Request failed.')),
  });
});


async function startServer() {
  try {
    await ensureAppSchema();
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    }).on('error', (err) => {
      console.error('Server failed to start:', err.message);
      process.exit(1);
    });
  } catch (error) {
    console.error('Failed to prepare database schema:', error.message);
    process.exit(1);
  }
}

// Start server if run directly (local development)
if (require.main === module) {
  startServer();
}

// Export for serverless environments like Vercel
module.exports = app;
