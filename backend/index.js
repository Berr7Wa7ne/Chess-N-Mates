const express = require('express');
const cors = require('cors');
require('./config/env');

const usersRoutes = require('./routes/users');
const competitionsRoutes = require('./routes/competitions');
const matchesRoutes = require('./routes/matches');
const disputesRoutes = require('./routes/disputes');

const app = express();

app.use(cors({
  origin: '*',
}));
app.use(express.json());

app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/competitions', competitionsRoutes);
app.use('/api/v1/matches', matchesRoutes);
app.use('/api/v1/disputes', disputesRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Chess Community API' });
});

const PORT = Number(process.env.PORT) || 3001;

const server = app.listen(PORT);

server.on('listening', () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Press Ctrl+C to stop');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Stop the other process or set PORT to a different value.`);
  } else {
    console.error('Failed to start server:', err.message);
  }
  process.exit(1);
});
