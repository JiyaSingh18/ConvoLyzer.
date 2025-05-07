import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';

// Load environment variables
config();

const app = express();

// Configure CORS
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3018', 'http://localhost:4000'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'api-key', 'Accept'],
  credentials: true
}));

app.use(express.json());

// Basic health check endpoint
app.get('/api/stt-status', (_req, res) => {
  res.json({ status: 'ready' });
});

// Start the server
const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log('Available endpoints:');
  console.log('- GET /api/stt-status');
}); 