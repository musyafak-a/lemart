const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = {
  // Menyediakan metode query yang langsung mengembalikan baris (rows)
  query: async (text, params) => {
    // Jika Anda memakai query builder yang menggunakan ?, ini akan langsung cocok.
    const [rows, fields] = await pool.execute(text, params);
    return rows;
  },
  pool,
};
