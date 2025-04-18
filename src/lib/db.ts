import mariadb from "mariadb";

const pool = mariadb.createPool({
  host: process.env.MYSQL_HOST || "localhost",
  port: parseInt(process.env.MYSQL_PORT || "3306"),
  database: process.env.MYSQL_DATABASE || "test", // Update this if your database name is different
  user: process.env.MYSQL_USER || "appuser", // Using the dedicated app user instead of root
  password: process.env.MYSQL_PASSWORD || "secure_password", // Using the password set for appuser
  connectionLimit: 5, // Adjust based on your needs
});

export async function executeQuery({
  query,
  values,
}: {
  query: string;
  values?: (string | number | boolean | null | bigint | Date)[];
}) {
  let connection;
  try {
    connection = await pool.getConnection();
    const results = await connection.query(query, values);
    return results;
  } catch (error) {
    console.error("Database query error:", error);
    throw new Error("Database query failed");
  } finally {
    if (connection) connection.release(); // Release the connection back to the pool
  }
}

export default pool;
