const mysql = require('mysql2/promise');
require('dotenv').config();

// SSL configuration for PlanetScale (or other cloud databases)
const sslConfig = process.env.DB_SSL === 'true' ? {
  rejectUnauthorized: true
} : false;

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'fundraise_app',
  port: process.env.DB_PORT || 3306,
  ssl: sslConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;

