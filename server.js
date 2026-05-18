// server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs'; // Use bcryptjs to avoid native build errors

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
    database: process.env.MYSQL_DATABASE || 'water_market_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: { rejectUnauthorized: false },
  });
  return pool;
}

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// ------------------ HEALTH CHECK ------------------
app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await getPool().query('SELECT NOW() AS current_time');
    res.json({ success: true, time: rows[0].current_time });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ------------------ AUTH ------------------
app.post('/api/register', async (req, res) => {
  const { name, email, password, barangay, role } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    const [result] = await getPool().query(
      'INSERT INTO users (name, email, password, barangay, role, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [name, email, hashed, barangay, role || 'customer']
    );
    res.status(201).json({ success: true, userId: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
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

// ------------------ USERS ------------------
app.get('/api/users', async (req, res) => {
  try {
    const [users] = await getPool().query('SELECT id, name, email, role, barangay, created_at FROM users');
    res.json(users);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ------------------ PRODUCTS ------------------
app.get('/api/products', async (req, res) => {
  try {
    const [products] = await getPool().query('SELECT * FROM products ORDER BY name');
    res.json(products);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ------------------ ORDERS ------------------
app.get('/api/orders', async (req, res) => {
  try {
    const [orders] = await getPool().query('SELECT * FROM orders ORDER BY created_at DESC');
    res.json(orders);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/orders', async (req, res) => {
  const { customerName, barangay, address, payment, type, items } = req.body;
  try {
    const [result] = await getPool().query(
      `INSERT INTO orders (customer_name_manual, barangay, address, payment_method, order_type, order_status, payment_status)
       VALUES (?, ?, ?, ?, ?, 'pending', 'pending')`,
      [customerName, barangay, address, payment, type || 'Walk-in']
    );
    const orderId = result.insertId;
    for (const item of items) {
      await getPool().query(
        `INSERT INTO order_items (order_id, product_id, quantity, price_at_time) VALUES (?, ?, ?, ?)`,
        [orderId, item.productId, item.quantity, item.price]
      );
    }
    res.status(201).json({ success: true, orderId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ------------------ SERVE SPA ------------------
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// ------------------ START SERVER ------------------
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await getPool();
  console.log('✅ Connected to MySQL / Aiven DB');
});
