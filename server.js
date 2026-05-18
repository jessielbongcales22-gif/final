// server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Create MySQL pool
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
    ssl: {
      ca: process.env.MYSQL_SSL_CA, // Must contain the full CA certificate
      rejectUnauthorized: true,
    },
  });
  return pool;
}

// JWT Secret
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
// Registration
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, contact_number, barangay, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await getPool().query(
      `INSERT INTO users (name, email, password, contact_number, barangay, role, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [name, email, hashedPassword, contact_number, barangay, role || 'customer']
    );

    res.status(201).json({ success: true, userId: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const [rows] = await getPool().query('SELECT * FROM users WHERE email=?', [username]);
    if (rows.length === 0) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '8h' });

    res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role }, token });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Verify JWT Middleware
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Missing token' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

// ------------------ USERS ------------------
app.get('/api/users', authMiddleware, async (req, res) => {
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
app.get('/api/orders', authMiddleware, async (req, res) => {
  try {
    const [orders] = await getPool().query(`
      SELECT o.id, o.customer_name_manual AS customerName, o.order_type AS type,
             o.total_amount AS total, o.payment_method AS payment,
             o.payment_status AS paymentStatus, o.order_status AS status,
             o.barangay, o.address, o.created_at AS createdAt
      FROM orders o
      ORDER BY o.created_at DESC
    `);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Add Walk-In Order
app.post('/api/orders', authMiddleware, async (req, res) => {
  try {
    const { customerName, barangay, address, payment, type, items } = req.body;

    const [result] = await getPool().query(
      `INSERT INTO orders (customer_name_manual, barangay, address, payment_method, order_type, order_status, payment_status)
       VALUES (?, ?, ?, ?, ?, 'pending', 'pending')`,
      [customerName, barangay, address, payment, type || 'Walk-in']
    );

    const orderId = result.insertId;

    for (const item of items) {
      await getPool().query(
        `INSERT INTO order_items (order_id, product_id, quantity, price_at_time)
         VALUES (?, ?, ?, ?)`,
        [orderId, item.productId, item.quantity, item.price]
      );
    }

    res.status(201).json({ success: true, orderId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ------------------ STATIC SPA ------------------
app.use(express.static(path.join(__dirname, 'dist')));
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// ------------------ START SERVER ------------------
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await getPool();
  console.log('✅ Connected to Aiven MySQL water_market_db');
});
