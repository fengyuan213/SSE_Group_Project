import { execSync } from "child_process";
import os from "os";

const isWin = os.platform() === "win32";
const python = isWin ? ".venv\\Scripts\\python" : ".venv/bin/python";

// Get port from environment variable or use default
const port = process.env.FLASK_PORT || 5000;

console.log(`🚀 Starting Flask development server on port ${port}...`);
execSync(`${python} -m flask run --host=0.0.0.0 --port ${port}`, {
  stdio: "inherit",
});
