const express = require('express');
const cors = require('cors');
require('./config/env');

const usersRoutes = require('./routes/users');
const competitionsRoutes = require('./routes/competitions');
const matchesRoutes = require('./routes/matches');
const disputesRoutes = require('./routes/disputes');
const botRoutes = require('./routes/bot');
const jobsRoutes = require('./routes/jobs');
const { validateBotApiKey } = require('./middleware/auth');
const { startDailyComputeCron } = require('./services/cronService');

const app = express();

app.use(cors({
  origin: '*',
}));
app.use(express.json());

// Public routes (no auth required)
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/competitions', competitionsRoutes);
app.use('/api/v1/matches', matchesRoutes);
app.use('/api/v1/disputes', disputesRoutes);

// Bot routes (require BOT_API_KEY auth)
app.use('/api/v1/bot', validateBotApiKey, botRoutes);

// Jobs (require JOBS_API_KEY / BOT_API_KEY)
app.use('/api/v1/jobs', jobsRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Chess Community API' });
});

app.get('/api/v1/health', (req, res) => {
  res.json({ 
    success: true, 
    data: { 
      status: 'ok', 
      time: new Date().toISOString(),
      version: '1.0.0'
    } 
  });
});

const PORT = Number(process.env.PORT) || 3001;

const server = app.listen(PORT);

server.on('listening', () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Press Ctrl+C to stop');
  startDailyComputeCron();
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Stop the other process or set PORT to a different value.`);
  } else {
    console.error('Failed to start server:', err.message);
  }
  process.exit(1);
});
