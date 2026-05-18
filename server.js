import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// MySQL pool
let pool = null;
function getPool() {
  if (pool) return pool;
  pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: { rejectUnauthorized: false },
  });
  return pool;
}

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await getPool().query('SELECT NOW() AS current_time');
    res.json({ success: true, time: rows[0].current_time });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await getPool().query(
      'SELECT * FROM users WHERE email=? AND password=?',
      [username, password]
    );
    if (rows.length) res.json({ success: true, user: rows[0] });
    else res.status(401).json({ success: false, message: 'Invalid credentials' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Serve React SPA
app.use(express.static(path.join(__dirname, 'dist')));

// SPA fallback for React Router
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await getPool();
  console.log('✅ Connected to MySQL database');
});
