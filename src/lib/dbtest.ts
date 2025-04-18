import mariadb from "mariadb";

const pool = mariadb.createPool({
  host: process.env.MYSQL_HOST || "localhost",
  port: parseInt(process.env.MYSQL_PORT || "3306"),
  user: process.env.MYSQL_USER || "appuser", // update this
  password: process.env.MYSQL_PASSWORD || "secure_password", // update this
  database: process.env.MYSQL_DATABASE || "test", // ensure this database exists
  connectionLimit: 5,
});

async function testConnection() {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log("Connected to MariaDB successfully!");

    // Run a simple query to test the connection
    const rows = await connection.query("SELECT 'Connected!' AS status");
    console.log("Status:", rows[0].status);
  } catch (error) {
    console.error("Error connecting to MariaDB:", error);
  } finally {
    if (connection) connection.release();
    pool.end(); // Close the pool
  }
}

testConnection();
