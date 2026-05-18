import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

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

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, barangay, role } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    const [result] = await getPool().query(
      'INSERT INTO users (name,email,password,barangay,role,created_at) VALUES (?,?,?,?,?,NOW())',
      [name, email, hashed, barangay, role || 'customer']
    );
    res.status(201).json({ success: true, userId: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const [rows] = await getPool().query('SELECT * FROM users WHERE email=?', [username]);
    if (!rows.length) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role, barangay: user.barangay }, token });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await getPool();
  console.log('✅ Connected to Aiven MySQL water_market_db');
});
