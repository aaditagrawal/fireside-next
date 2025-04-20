#!/usr/bin/env node
// DB Health Check Script
// Usage: node scripts/db-health-check.js

require('dotenv').config();
const mariadb = require('mariadb');

async function main() {
  const pool = mariadb.createPool({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER || 'appuser',
    password: process.env.MYSQL_PASSWORD || 'secure_password',
    database: process.env.MYSQL_DATABASE || 'rss_aggregator',
    connectionLimit: 5,
  });

  let conn;
  try {
    conn = await pool.getConnection();
    console.log('Connected to DB. Running health checks...');

    // 1) Check Users table row count
    const [{ 'COUNT(*)': userCount }] = await conn.query('SELECT COUNT(*) FROM Users');
    console.log(`Users table has ${userCount} rows.`);

    // 2) Insert & verify a dummy test user
    const testEmail = `health_${Date.now()}@example.com`;
    const testName = 'Health Check';
    const testHash = 'test_hash';
    const insertRes = await conn.query(
      "INSERT INTO Users (Name, Email, PasswordHash, Role) VALUES (?, ?, ?, 'user')",
      [testName, testEmail, testHash]
    );
    console.log('Inserted test user with ID', insertRes.insertId);

    const [found] = await conn.query(
      'SELECT COUNT(*) AS cnt FROM Users WHERE Email = ?',
      [testEmail]
    );
    console.log(`Verification: found ${found.cnt} row(s) for ${testEmail}.`);

    // Cleanup
    await conn.query('DELETE FROM Users WHERE Email = ?', [testEmail]);
    console.log('Cleaned up test user.');

    // 3) Check Feeds table count
    const [{ 'COUNT(*)': feedCount }] = await conn.query('SELECT COUNT(*) FROM Feeds');
    console.log(`Feeds table has ${feedCount} rows.`);
  } catch (err) {
    console.error('DB health check failed:', err);
    process.exit(1);
  } finally {
    if (conn) conn.release();
    pool.end();
  }
}

main();
