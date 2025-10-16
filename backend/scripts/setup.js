import { execSync } from "child_process";
import fs from "fs";
import os from "os";

const isWin = os.platform() === "win32";
const pip = isWin ? ".venv\\Scripts\\pip" : ".venv/bin/pip";

console.log("🐍 Setting up Python virtual environment...");

// Check if venv exists and is valid
const venvExists = fs.existsSync(".venv");
let pipWorks = false;

if (venvExists && fs.existsSync(pip)) {
  // Test if pip actually works
  try {
    execSync(`${pip} --version`, { stdio: "ignore" });
    pipWorks = true;
  } catch (e) {
    // pip is broken
  }
}

if (!venvExists || !pipWorks) {
  if (venvExists) {
    console.log("⚠ Virtual environment is invalid, recreating...");
    // Manually clean the volume contents (can't use --clear on volumes)
    execSync("rm -rf .venv/* .venv/.* 2>/dev/null || true", {
      shell: "/bin/bash",
    });
  } else {
    console.log("📦 Creating new virtual environment...");
  }
  execSync("python3 -m venv .venv", { stdio: "inherit" });
  console.log("✓ Virtual environment created");
} else {
  console.log("✓ Virtual environment already exists and is valid");
}

// Upgrade pip first
execSync(`${pip} install --upgrade pip`, { stdio: "inherit" });

// Install dependencies
execSync(`${pip} install -r requirements.txt`, { stdio: "inherit" });

console.log("✅ Setup complete!");
