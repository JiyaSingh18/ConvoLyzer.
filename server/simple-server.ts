import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3018', 'http://localhost:4000'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'api-key', 'Accept'],
  credentials: true
}));

app.get('/api/stt-status', (_req, res) => {
  res.json({ status: 'ready' });
});

const port = 4000;
app.listen(port, () => {
  console.log(`Test server running on port ${port}`);
}); 