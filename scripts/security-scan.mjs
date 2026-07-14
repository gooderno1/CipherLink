import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const manifest = JSON.parse(await readFile(path.join(root, "manifest.json"), "utf8"));
assert.equal(manifest.id, "cipher-link");
assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
assert.equal(manifest.isDesktopOnly, false);

const bundle = await readFile(path.join(root, "dist/main.js"), "utf8");
for (const forbidden of [
  "child_process",
  "node:fs",
  "require(\"fs\")",
  "require('fs')",
  "require(\"electron\")",
  "eval(",
  "node_modules/@codemirror/state/",
  "node_modules/@codemirror/view/",
  "node_modules/@codemirror/language/",
  "node_modules/@lezer/common/",
  "node_modules/@lezer/highlight/",
  "node_modules/@lezer/lr/",
  "multiple instances of @codemirror/state",
]) {
  assert.equal(bundle.includes(forbidden), false, `Production bundle contains ${forbidden}`);
}
assert.equal(bundle.includes("sourceMappingURL="), false, "Production bundle contains a source map");

for (const file of await sourceFiles(root)) {
  const content = await readFile(file, "utf8");
  assert.equal(/AGE-SECRET-KEY-[A-Z0-9-]+/.test(content), false, `Private age identity found in ${file}`);
  if (file.includes(`${path.sep}src${path.sep}`)) {
    assert.equal(content.includes("console.log("), false, `Debug logging found in ${file}`);
    assert.equal(content.includes(".obsidian/plugins"), false, `Hardcoded config directory found in ${file}`);
    assert.equal(
      /memoloom-secure\/user\.identity/i.test(content),
      false,
      `Private identity default found in ${file}`,
    );
  }
}

process.stdout.write("CipherLink security scan passed.\n");

async function sourceFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if ([".git", "node_modules", "dist", "local_dev_work"].includes(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await sourceFiles(fullPath)));
    else if (/\.(?:ts|js|mjs|json|md|css)$/.test(entry.name)) files.push(fullPath);
  }
  return files;
}
