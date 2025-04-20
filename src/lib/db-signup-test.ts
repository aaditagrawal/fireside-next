#!/usr/bin/env ts-node
import pool, { executeQuery } from "./db.ts";
import { registerUser } from "./auth.ts";

async function main() {
  const testEmail = `test_${Date.now()}@example.com`;
  const testName = "DB Test User";
  const testPassword = "TestPass123";

  console.log(`Running signup test for email: ${testEmail}`);

  // Attempt registration
  const regResult = await registerUser({ name: testName, email: testEmail, password: testPassword });
  if (!regResult.success || !regResult.user) {
    console.error("Registration failed:", regResult.error);
    process.exit(1);
  }
  console.log("Registration success:", regResult.user);

  // Verify directly in DB
  const verifyRows: any[] = await executeQuery({
    query: "SELECT * FROM Users WHERE Email = ?",
    values: [testEmail],
  });
  console.log(`Database entries found for ${testEmail}: ${verifyRows.length}`);
  console.table(verifyRows);

  // Cleanup test user
  await executeQuery({
    query: "DELETE FROM Users WHERE Email = ?",
    values: [testEmail],
  });
  console.log("Cleanup: deleted test user");

  await pool.end();
}

main().catch(err => {
  console.error("Test script error:", err);
  process.exit(1);
});
