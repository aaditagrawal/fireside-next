import mariadb from "mariadb";

const pool = mariadb.createPool({
  host: process.env.MYSQL_HOST || "127.0.0.1",
  port: parseInt(process.env.MYSQL_PORT || "3306"),
  user: process.env.MYSQL_USER || "appuser",
  password: process.env.MYSQL_PASSWORD || "secure_password",
  database: process.env.MYSQL_DATABASE || "rss_aggregator",
  connectionLimit: 5,
});

console.log("DB pool is using database:", process.env.MYSQL_DATABASE);

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
