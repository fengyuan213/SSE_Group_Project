import fs from "fs";
import path from "path";

const dirs = ["__pycache__", ".mypy_cache", ".pytest_cache"];

console.log("🧽 Cleaning caches...");
for (const dir of dirs) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log(`🗑️  Removed ${dir}`);
  }
}

// Clean venv contents (not the folder itself since it's a docker volume)
const venvDir = ".venv";
if (fs.existsSync(venvDir)) {
  console.log(`🗑️  Cleaning ${venvDir} contents...`);
  const items = fs.readdirSync(venvDir);
  for (const item of items) {
    const itemPath = path.join(venvDir, item);
    fs.rmSync(itemPath, { recursive: true, force: true });
  }
  console.log(`✅ Cleaned ${venvDir} contents`);
}

console.log("✅ Clean complete!");
