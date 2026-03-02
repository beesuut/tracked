require('dotenv').config();

const express = require('express');
const cors = require('cors');
const session = require('express-session');

const app = express();

app.use(express.json());

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));

const authRoutes = require('./routes/auth');
const statsRoutes = require('./routes/stats');

app.use('/auth', authRoutes);
app.use('/stats', statsRoutes);

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    message: 'Tracked backend is running'
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
  ┌─────────────────────────────────────┐
  │  Tracked backend running            │
  │  http://127.0.0.1:${PORT}              │
  │                                     │
  │  Health: /health                    │
  │  Auth:   /auth/login                │
  └─────────────────────────────────────┘
  `);
});

const { startScrobbler } = require('./jobs/scrobbler');
startScrobbler();
