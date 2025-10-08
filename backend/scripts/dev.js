import { execSync } from "child_process";
import os from "os";

const isWin = os.platform() === "win32";
const python = isWin ? ".venv\\Scripts\\python" : ".venv/bin/python";

console.log("🚀 Starting Flask development server...");
execSync(`${python} -m flask run --port 5000`, { stdio: "inherit" });
