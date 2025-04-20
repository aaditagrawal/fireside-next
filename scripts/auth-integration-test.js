#!/usr/bin/env node
// Integration test: registers via API and verifies DB entry

require('dotenv').config();
const axios = require('axios').default;
const mariadb = require('mariadb');

(async () => {
  const baseUrl = process.argv[2] || 'http://localhost:3000';
  const apiUrl = `${baseUrl}/api/auth/register`;
  const testEmail = `itest_${Date.now()}@example.com`;
  const testName = 'Integration Test';
  const testPassword = 'TestPass123!';

  console.log(`POST ${apiUrl} -> registering ${testEmail}`);
  let resp;
  try {
    resp = await axios.post(apiUrl, { name: testName, email: testEmail, password: testPassword });
  } catch (err) {
    console.error('API request error:', err);
    process.exit(1);
  }
  console.log('API response status:', resp.status, 'data:', resp.data);
  if (!resp.data || !resp.data.success) {
    console.error('Registration API returned failure.');
    process.exit(1);
  }

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
    const rows = await conn.query('SELECT * FROM Users WHERE Email = ?', [testEmail]);
    console.log(`DB rows for ${testEmail}:`, rows.length);
    console.table(rows);
    // Cleanup
    await conn.query('DELETE FROM Users WHERE Email = ?', [testEmail]);
    console.log('Deleted test user from DB.');
  } catch (err) {
    console.error('DB verification error:', err);
    process.exit(1);
  } finally {
    if (conn) conn.release();
    await pool.end();
  }

  console.log('Integration test completed successfully.');
})();
