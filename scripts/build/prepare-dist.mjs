import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..", "..");

for (const filename of ["hydra-synth.js", "hydra-synth.js.map"]) {
  const filePath = path.join(rootDir, "dist", filename);
  try {
    fs.rmSync(filePath, { force: true });
  } catch (error) {
    if (error && error.code !== "ENOENT") {
      throw error;
    }
  }
}
