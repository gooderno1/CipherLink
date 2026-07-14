import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const vaultIndex = process.argv.indexOf("--vault");
if (vaultIndex < 0 || !process.argv[vaultIndex + 1]) {
  throw new Error("Usage: node scripts/install-plugin.mjs --vault <vault-path>");
}

const vault = path.resolve(process.argv[vaultIndex + 1]);
const destination = path.join(vault, ".obsidian", "plugins", "cipher-link");
await mkdir(destination, { recursive: true });
await Promise.all([
  copyFile(path.resolve("dist/main.js"), path.join(destination, "main.js")),
  copyFile(path.resolve("manifest.json"), path.join(destination, "manifest.json")),
  copyFile(path.resolve("styles.css"), path.join(destination, "styles.css")),
]);
process.stdout.write(`CipherLink installed (not enabled) at ${destination}\n`);
