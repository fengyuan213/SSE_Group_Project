import { execSync } from "child_process";
import fs from "fs";
import os from "os";

const isWin = os.platform() === "win32";
const pip = isWin ? ".venv\\Scripts\\pip" : ".venv/bin/pip";

console.log("🐍 Setting up Python virtual environment...");

// Remove existing venv if needed
if (fs.existsSync(".venv")) {
  console.log("💣 Removing old .venv...");
  fs.rmSync(".venv", { recursive: true, force: true });
}

// Create venv
execSync("python -m venv .venv", { stdio: "inherit" });

// Install dependencies
execSync(`${pip} install -r requirements.txt`, { stdio: "inherit" });

console.log("✅ Setup complete!");
