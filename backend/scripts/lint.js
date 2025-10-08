import { execSync } from "child_process";
import os from "os";

const isWin = os.platform() === "win32";
const pylint = isWin ? ".venv\\Scripts\\pylint" : ".venv/bin/pylint";

console.log("🧹 Linting Python files with pylint...");
execSync(`${pylint} app`, { 
  stdio: "inherit",
  encoding: "utf-8",
});
