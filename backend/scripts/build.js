import { execSync } from "child_process";
import os from "os";

const isWin = os.platform() === "win32";
const python = isWin ? ".venv\\Scripts\\python" : ".venv/bin/python";

console.log("🔨 Compiling Python files...");
execSync(`${python} -m compileall .`, { stdio: "inherit" });
