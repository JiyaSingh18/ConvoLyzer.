const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());

app.get('/api/stt-status', (req, res) => {
  res.json({ status: 'ready' });
});

const port = 5000;
app.listen(port, () => {
  console.log(`Basic test server running on port ${port}`);
}); 