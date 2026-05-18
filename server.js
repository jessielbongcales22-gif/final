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
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE || 'water_market_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: { rejectUnauthorized: false },
});

// --- LOGIN / REGISTER ---
app.post('/api/login', async (req, res) => {
  const { email, password, name, barangay, role } = req.body;
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email=?', [email]);
    let user;
    if (rows.length === 0) {
      // Register new user
      const [result] = await pool.query(
        'INSERT INTO users (name, email, password, barangay, role, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
        [name || email.split('@')[0], email, password, barangay || 'Panalaron', role || 'customer']
      );
      user = { id: result.insertId, name: name || email.split('@')[0], email, role: role || 'customer', barangay: barangay || 'Panalaron' };
    } else {
      user = rows[0];
      if (user.password !== password) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    return res.json({ success: true, user });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// --- PRODUCTS ---
app.get('/api/products', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products ORDER BY name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- ORDERS / WALK-IN SALE ---
app.get('/api/orders', async (req, res) => {
  try {
    const [orders] = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    res.json(orders);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/orders', async (req, res) => {
  const { customerName, barangay, address, payment, type, items } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO orders (customer_name_manual, barangay, address, payment_method, order_type, order_status, payment_status) VALUES (?, ?, ?, ?, ?, "pending", "pending")',
      [customerName, barangay, address, payment, type || 'Walk-in']
    );
    const orderId = result.insertId;
    for (const item of items) {
      await pool.query(
        'INSERT INTO order_items (order_id, product_id, quantity, price_at_time) VALUES (?, ?, ?, ?)',
        [orderId, item.productId, item.quantity, item.price]
      );
    }
    res.status(201).json({ success: true, orderId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- UPDATE ORDER STATUS ---
app.put('/api/orders/:id', async (req, res) => {
  const { status, paymentStatus } = req.body;
  try {
    await pool.query('UPDATE orders SET order_status=?, payment_status=? WHERE id=?', [status, paymentStatus, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- React SPA fallback ---
app.use(express.static(path.join(__dirname, 'dist')));
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// --- Start server ---
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  try {
    await pool.getConnection();
    console.log('✅ Connected to Aiven MySQL water_market_db');
  } catch (err) {
    console.error('❌ Failed to connect to MySQL:', err.message);
  }
});
