const express = require('express');
const cors = require('cors');
const path = require('path');
require('./config/env');
const { ensureAppSchema } = require('./utils/schema');

const app = express();
const PORT = process.env.PORT || 5001;

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5500',        // VS Code Live Server
  'http://127.0.0.1:5500',
  'https://sandip-fas-backend.onrender.com',  // Render frontend static site
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    }
  },
  credentials: true
};

app.use(cors(corsOptions));
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
  res.json({ status: 'sandip-fas-backend is running and connected to Neon' });
});

// NOTE: static files are served by Render Static Site (sandip-fas-frontend)

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
