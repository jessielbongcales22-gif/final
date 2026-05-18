// ════════════════════════════════════════════════════════════════════════════
// Water Market Backend — All-in-one server
// Runs on Node.js, connects to Aiven MySQL, serves the built frontend
// ════════════════════════════════════════════════════════════════════════════

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import mysql from 'mysql2/promise';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*' }));
app.use(express.json());

// ════════════════════════════════════════════════════════════════════════════
// DATABASE
// ════════════════════════════════════════════════════════════════════════════
let pool = null;
function getPool() {
  if (pool) return pool;
  pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '10894'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'defaultdb',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: { rejectUnauthorized: false },
  });
  return pool;
}

async function testConnection() {
  try {
    await getPool().query('SELECT 1');
    console.log('✅ Connected to Aiven MySQL');
    return true;
  } catch (e) {
    console.error('❌ DB connection failed:', e.message);
    return false;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// MIDDLEWARE
// ════════════════════════════════════════════════════════════════════════════
function authenticateToken(req, res, next) {
  const token = (req.headers['authorization'] || '').split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied' });
  jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role))
      return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };
}

// ════════════════════════════════════════════════════════════════════════════
// HEALTH
// ════════════════════════════════════════════════════════════════════════════
app.get('/api/health', async (req, res) => {
  const ok = await testConnection();
  res.json({ status: ok ? 'connected' : 'disconnected', db: process.env.DB_NAME });
});

// ════════════════════════════════════════════════════════════════════════════
// AUTH
// ════════════════════════════════════════════════════════════════════════════
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const [rows] = await getPool().query('SELECT * FROM users WHERE email = ?', [email]);
    if (!rows.length) return res.status(401).json({ error: 'Invalid email or password' });
    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'secret', { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role, phone: user.phone, address: user.address, createdAt: user.created_at } });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, phone, address } = req.body;
    const [existing] = await getPool().query('SELECT id FROM users WHERE email = ? OR username = ?', [email, username]);
    if (existing.length) return res.status(400).json({ error: 'Email or username already exists' });
    const hash = await bcrypt.hash(password, 10);
    const id = 'u' + Date.now();
    await getPool().query('INSERT INTO users (id, username, email, password_hash, role, phone, address) VALUES (?,?,?,?,?,?,?)',
      [id, username, email, hash, 'customer', phone, address]);
    const token = jwt.sign({ id, username, email, role: 'customer' }, process.env.JWT_SECRET || 'secret', { expiresIn: '24h' });
    res.status(201).json({ token, user: { id, username, email, role: 'customer', phone, address } });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ════════════════════════════════════════════════════════════════════════════
// USERS
// ════════════════════════════════════════════════════════════════════════════
app.get('/api/users', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const [users] = await getPool().query('SELECT id, username, email, role, phone, address, created_at FROM users ORDER BY created_at DESC');
    res.json(users);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/users', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { username, email, password, role, phone, address } = req.body;
    if (!username || !email || !password || !role) return res.status(400).json({ error: 'Missing required fields' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    if (!['admin', 'staff', 'customer'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
    const [existing] = await getPool().query('SELECT id FROM users WHERE email = ? OR username = ?', [email, username]);
    if (existing.length) return res.status(400).json({ error: 'Email or username already exists' });
    const hash = await bcrypt.hash(password, 10);
    const id = 'u' + Date.now();
    await getPool().query('INSERT INTO users (id, username, email, password_hash, role, phone, address) VALUES (?,?,?,?,?,?,?)',
      [id, username, email, hash, role, phone || '', address || '']);
    res.status(201).json({ id, username, email, role, phone, address });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.put('/api/users/:id/role', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await getPool().query('UPDATE users SET role = ? WHERE id = ?', [req.body.role, req.params.id]);
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.delete('/api/users/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ error: 'Cannot delete your own account' });
    const [orders] = await getPool().query('SELECT id FROM orders WHERE customer_id = ?', [req.params.id]);
    for (const o of orders) await getPool().query('DELETE FROM order_items WHERE order_id = ?', [o.id]);
    await getPool().query('DELETE FROM orders WHERE customer_id = ?', [req.params.id]);
    await getPool().query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ════════════════════════════════════════════════════════════════════════════
// PRODUCTS
// ════════════════════════════════════════════════════════════════════════════
app.get('/api/products', authenticateToken, async (req, res) => {
  try {
    const [rows] = await getPool().query('SELECT * FROM products ORDER BY type, name');
    res.json(rows.map(p => ({ id: p.id, name: p.name, type: p.type, price: Number(p.price), stock: p.stock, unit: p.unit, description: p.description, minStock: p.min_stock })));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/products', authenticateToken, requireRole('admin', 'staff'), async (req, res) => {
  try {
    const { name, type, price, stock, unit, description, minStock } = req.body;
    const id = 'p' + Date.now();
    await getPool().query('INSERT INTO products (id, name, type, price, stock, unit, description, min_stock) VALUES (?,?,?,?,?,?,?,?)',
      [id, name, type, price, stock, unit, description, minStock]);
    res.status(201).json({ id, name, type, price, stock, unit, description, minStock });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.put('/api/products/:id', authenticateToken, requireRole('admin', 'staff'), async (req, res) => {
  try {
    const { name, type, price, stock, unit, description, minStock } = req.body;
    await getPool().query('UPDATE products SET name=?, type=?, price=?, stock=?, unit=?, description=?, min_stock=? WHERE id=?',
      [name, type, price, stock, unit, description, minStock, req.params.id]);
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.delete('/api/products/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await getPool().query('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ════════════════════════════════════════════════════════════════════════════
// ORDERS
// ════════════════════════════════════════════════════════════════════════════
app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    let query = 'SELECT * FROM orders ORDER BY created_at DESC';
    let params = [];
    if (req.user.role === 'customer') {
      query = 'SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC';
      params = [req.user.id];
    }
    const [orders] = await getPool().query(query, params);
    const result = [];
    for (const o of orders) {
      const [items] = await getPool().query('SELECT * FROM order_items WHERE order_id = ?', [o.id]);
      result.push({
        id: o.id, customerId: o.customer_id, customerName: o.customer_name,
        items: items.map(i => ({ productId: i.product_id, productName: i.product_name, quantity: i.quantity, price: Number(i.price), subtotal: Number(i.subtotal) })),
        totalAmount: Number(o.total_amount), status: o.status,
        paymentMethod: o.payment_method, paymentStatus: o.payment_status,
        orderType: o.order_type || 'delivery', deliveryAddress: o.delivery_address,
        notes: o.notes || '', createdAt: o.created_at, updatedAt: o.updated_at,
      });
    }
    res.json(result);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/orders', authenticateToken, async (req, res) => {
  try {
    const { items, totalAmount, paymentMethod, paymentStatus, orderType, deliveryAddress, notes, customerName, customerId, status } = req.body;
    const orderId = 'o' + Date.now();
    const now = new Date();
    const custId = customerId || req.user.id;
    const custName = customerName || req.user.username;
    const orderStatus = status || 'pending';
    const orderPayStat = paymentStatus || (paymentMethod === 'cash' ? 'pending' : 'paid');
    const type = orderType || 'delivery';
    await getPool().query(
      `INSERT INTO orders (id, customer_id, customer_name, total_amount, status, payment_method, payment_status, order_type, delivery_address, notes, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [orderId, custId, custName, totalAmount, orderStatus, paymentMethod, orderPayStat, type, deliveryAddress, notes || '', now, now]);
    for (const item of items) {
      await getPool().query('INSERT INTO order_items (id, order_id, product_id, product_name, quantity, price, subtotal) VALUES (?,?,?,?,?,?,?)',
        [crypto.randomUUID(), orderId, item.productId, item.productName, item.quantity, item.price, item.subtotal]);
      await getPool().query('UPDATE products SET stock = GREATEST(0, stock - ?) WHERE id = ?', [item.quantity, item.productId]);
    }
    res.status(201).json({ id: orderId });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.put('/api/orders/:id', authenticateToken, async (req, res) => {
  try {
    const { status, paymentStatus } = req.body;
    const fields = [], values = [];
    if (status) { fields.push('status = ?'); values.push(status); }
    if (paymentStatus) { fields.push('payment_status = ?'); values.push(paymentStatus); }
    fields.push('updated_at = ?'); values.push(new Date());
    values.push(req.params.id);
    await getPool().query(`UPDATE orders SET ${fields.join(', ')} WHERE id = ?`, values);
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.delete('/api/orders/:id', authenticateToken, requireRole('admin', 'staff'), async (req, res) => {
  try {
    await getPool().query('DELETE FROM order_items WHERE order_id = ?', [req.params.id]);
    await getPool().query('DELETE FROM orders WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ════════════════════════════════════════════════════════════════════════════
// REPORTS
// ════════════════════════════════════════════════════════════════════════════
app.get('/api/reports/summary', authenticateToken, requireRole('admin', 'staff'), async (req, res) => {
  try {
    const p = getPool();
    const [[{ total: totalSales }]]    = await p.query("SELECT COALESCE(SUM(total_amount),0) as total FROM orders WHERE status='completed'");
    const [[{ total: todaySales }]]    = await p.query("SELECT COALESCE(SUM(total_amount),0) as total FROM orders WHERE status='completed' AND DATE(created_at)=CURDATE()");
    const [[{ total: monthlySales }]]  = await p.query("SELECT COALESCE(SUM(total_amount),0) as total FROM orders WHERE status='completed' AND MONTH(created_at)=MONTH(CURDATE()) AND YEAR(created_at)=YEAR(CURDATE())");
    const [[{ count: todayOrders }]]   = await p.query("SELECT COUNT(*) as count FROM orders WHERE DATE(created_at)=CURDATE()");
    const [[{ count: pendingOrders }]] = await p.query("SELECT COUNT(*) as count FROM orders WHERE status IN ('pending','processing')");
    const [[{ count: totalOrders }]]   = await p.query("SELECT COUNT(*) as count FROM orders");
    const [[{ count: totalProducts }]] = await p.query("SELECT COUNT(*) as count FROM products");
    res.json({ totalSales: Number(totalSales), todaySales: Number(todaySales), monthlySales: Number(monthlySales), todayOrders, pendingOrders, totalOrders, totalProducts });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ════════════════════════════════════════════════════════════════════════════
// PAYMENT (PayMongo GCash)
// ════════════════════════════════════════════════════════════════════════════
const PAYMONGO_SECRET = process.env.PAYMONGO_SECRET_KEY || '';
const IS_PAYMONGO_CONFIGURED = PAYMONGO_SECRET && PAYMONGO_SECRET !== 'YOUR_PAYMONGO_SECRET_KEY';

app.post('/api/payment/create-checkout', async (req, res) => {
  try {
    const { amount, description, orderId, successUrl, failedUrl } = req.body;
    if (!IS_PAYMONGO_CONFIGURED) {
      return res.json({ checkoutUrl: null, simulated: true, message: 'PayMongo not configured.' });
    }
    const payload = {
      data: {
        attributes: {
          line_items: [{ name: description || 'Water Market Order', quantity: 1, amount: Math.round(amount * 100), currency: 'PHP' }],
          payment_method_types: ['gcash'],
          description: `Order #${orderId}`,
          success_url: successUrl, cancel_url: failedUrl,
          metadata: { order_id: orderId },
        },
      },
    };
    const response = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${Buffer.from(PAYMONGO_SECRET).toString('base64')}` },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) return res.status(400).json({ error: data.errors?.[0]?.detail || 'Payment creation failed' });
    res.json({ checkoutUrl: data.data.attributes.checkout_url, checkoutId: data.data.id, simulated: false });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ════════════════════════════════════════════════════════════════════════════
// AUTO-SETUP DATABASE TABLES + SEED on startup
// ════════════════════════════════════════════════════════════════════════════
async function setupDatabase() {
  await getPool().query(`CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY, username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE, password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin','staff','customer') NOT NULL DEFAULT 'customer',
    phone VARCHAR(20), address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await getPool().query(`CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(36) PRIMARY KEY, name VARCHAR(255) NOT NULL,
    type ENUM('water','container') NOT NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0, stock INT NOT NULL DEFAULT 0,
    unit VARCHAR(50) NOT NULL DEFAULT 'container', description TEXT,
    min_stock INT NOT NULL DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await getPool().query(`CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(36) PRIMARY KEY, customer_id VARCHAR(36) NOT NULL,
    customer_name VARCHAR(100) NOT NULL, total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    status ENUM('pending','processing','out-for-delivery','completed','cancelled') NOT NULL DEFAULT 'pending',
    payment_method ENUM('cash','gcash') NOT NULL DEFAULT 'cash',
    payment_status ENUM('pending','paid') NOT NULL DEFAULT 'pending',
    order_type ENUM('delivery','walk-in') NOT NULL DEFAULT 'delivery',
    delivery_address TEXT NOT NULL, notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await getPool().query(`CREATE TABLE IF NOT EXISTS order_items (
    id VARCHAR(36) PRIMARY KEY, order_id VARCHAR(36) NOT NULL,
    product_id VARCHAR(36) NOT NULL, product_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL DEFAULT 1, price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  // Seed admin + staff + product
  const adminHash = await bcrypt.hash('admin123', 10);
  const staffHash = await bcrypt.hash('staff123', 10);
  try {
    await getPool().query('INSERT INTO users (id,username,email,password_hash,role,phone,address) VALUES (?,?,?,?,?,?,?)',
      ['u1', 'admin', 'admin@watermarket.com', adminHash, 'admin', '09171234567', 'Purok Saging, Brgy. Panalaron, Hinunangan']);
  } catch (e) { /* exists */ }
  try {
    await getPool().query('INSERT INTO users (id,username,email,password_hash,role,phone,address) VALUES (?,?,?,?,?,?,?)',
      ['u2', 'staff1', 'staff1@watermarket.com', staffHash, 'staff', '09181234567', 'Purok Saging, Brgy. Panalaron, Hinunangan']);
  } catch (e) { /* exists */ }
  try {
    await getPool().query('INSERT INTO products (id,name,type,price,stock,unit,description,min_stock) VALUES (?,?,?,?,?,?,?,?)',
      ['p1', 'Purified Water', 'water', 30.00, 500, 'container', 'Refill of purified water', 50]);
  } catch (e) { /* exists */ }
  console.log('✅ Database tables ready + seed data ensured');
}

// ════════════════════════════════════════════════════════════════════════════
// SERVE FRONTEND
// ════════════════════════════════════════════════════════════════════════════
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  
  /**
   * FIX APPLIED HERE:
   * Express 5 requires the wildcard '*' to have a name.
   * Changed '*' to '/*any'
   */
  app.get('/*any', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'));
    } else {
      res.status(404).json({ error: 'API route not found' });
    }
  });
  console.log('📁 Serving frontend from /dist');
}

// ════════════════════════════════════════════════════════════════════════════
// START
// ════════════════════════════════════════════════════════════════════════════
async function start() {
  console.log('\n🚀 Water Market Backend Starting...');
  console.log(`   DB Host : ${process.env.DB_HOST}`);
  console.log(`   API Port: ${PORT}\n`);
  const connected = await testConnection();
  if (connected) {
    try { await setupDatabase(); } catch (e) { console.error('Setup error:', e.message); }
  }
  app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}\n🎉 Ready!\n`);
  });
}

start();
