import express from "express";
import mysql from "mysql2/promise";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// Create MySQL pool
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: Number(process.env.MYSQL_PORT),
  ssl: { rejectUnauthorized: false },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// --- LOGIN / REGISTER API ---
app.post("/api/login", async (req, res) => {
  const { email, password, name, barangay, role } = req.body;

  try {
    // Check if user exists
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    let user;

    if (rows.length === 0) {
      // New user → Insert into MySQL
      const [result] = await pool.query(
        `INSERT INTO users (name, email, password, barangay, role, created_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [name || email.split("@")[0], email, password, barangay || "Panalaron", role || "customer"]
      );

      user = {
        id: result.insertId,
        name: name || email.split("@")[0],
        email,
        role: role || "customer",
        barangay: barangay || "Panalaron",
      };
    } else {
      // Existing user → verify password
      user = rows[0];
      if (user.password !== password) {
        return res.status(401).json({ success: false, message: "Invalid credentials" });
      }
    }

    return res.json({ success: true, user });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Health check
app.get("/api/health", (req, res) => res.json({ success: true, message: "Server running" }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
