import fs from "fs";

const dirs = ["__pycache__", ".mypy_cache", ".pytest_cache"];

console.log("🧽 Cleaning caches...");
for (const dir of dirs) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log(`🗑️  Removed ${dir}`);
  }
}

console.log("✅ Clean complete!");
