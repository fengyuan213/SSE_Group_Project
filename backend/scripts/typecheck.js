import { execSync } from "child_process";
import os from "os";

const isWin = os.platform() === "win32";
const pyright = isWin ? ".venv\\Scripts\\pyright" : ".venv/bin/pyright";

console.log("🔎 Running pyright type checks...");
execSync(`${pyright}`, { stdio: "inherit" });
