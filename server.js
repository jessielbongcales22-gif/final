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
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'water_market_db',
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
    const [rows] = await getPool().query('SELECT * FROM accounts WHERE username=? AND password=?', [username, password]);
    if (rows.length) res.json({ success: true, user: rows[0] });
    else res.status(401).json({ success: false, message: 'Invalid credentials' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Products
app.get('/api/products', async (req, res) => {
  try {
    const [rows] = await getPool().query('SELECT * FROM products ORDER BY name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Orders
app.get('/api/orders', async (req, res) => {
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

// Update order status
app.put('/api/orders/:id', async (req, res) => {
  const { status, paymentStatus } = req.body;
  try {
    await getPool().query('UPDATE orders SET order_status=?, payment_status=? WHERE id=?', [status, paymentStatus, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Serve React SPA
app.use(express.static(path.join(__dirname, 'dist')));
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await getPool();
  console.log('✅ Connected to Aiven MySQL water_market_db');
});
