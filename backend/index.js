const express = require('express');
const cors = require('cors');
require('dotenv').config();

const usersRoutes = require('./routes/users');
const competitionsRoutes = require('./routes/competitions');
const matchesRoutes = require('./routes/matches');
const disputesRoutes = require('./routes/disputes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/competitions', competitionsRoutes);
app.use('/api/v1/matches', matchesRoutes);
app.use('/api/v1/disputes', disputesRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Chess Community API' });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
