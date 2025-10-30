import { execSync } from "child_process";
import fs from "fs";

console.log("🗄️  Initializing database...");

// Wait for database to be ready
const maxAttempts = 30;
let attempt = 0;
let dbReady = false;

console.log("⏳ Waiting for database to be ready...");
while (attempt < maxAttempts && !dbReady) {
  try {
    execSync("pg_isready -h db -U postgres", { stdio: "ignore" });
    dbReady = true;
    console.log("✓ Database is ready");
  } catch (error) {
    attempt++;
    if (attempt >= maxAttempts) {
      console.log("⚠ Database not ready, skipping initialization");
      process.exit(0); // Exit gracefully
    }
    console.log(`Waiting for database... (${attempt}/${maxAttempts})`);
    execSync("sleep 2");
  }
}

// Check if database is already initialized
try {
  const result = execSync(
    "PGPASSWORD=postgres psql -h db -U postgres -d sse_project -t -c \"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';\"",
    { encoding: "utf-8" }
  );
  const tableCount = parseInt(result.trim());

  if (tableCount === 0 && fs.existsSync("schema/database_schema.sql")) {
    console.log("📥 Importing database schema...");
    execSync(
      "PGPASSWORD=postgres psql -h db -U postgres -d sse_project -f schema/database_schema.sql",
      { stdio: "inherit" }
    );
    console.log("✓ Database schema imported successfully");
  } else if (tableCount > 0) {
    console.log(
      `✓ Database already contains ${tableCount} tables, skipping initialization`
    );
  } else {
    console.log("⚠ Schema file not found, skipping initialization");
  }
} catch (error) {
  console.log("⚠ Could not check database, skipping initialization");
  process.exit(0); // Exit gracefully
}

console.log("✅ Database initialization complete!");
