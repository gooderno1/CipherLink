import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  requireAgeObjectPath,
  requireGatewayBaseUrl,
  requireVaultRelativePath,
} from "../src/security/input-boundaries";

test("vault paths reject absolute paths, traversal, and ambiguous segments", () => {
  assert.equal(requireVaultRelativePath(".cipherlink/objects", "Folder"), ".cipherlink/objects");
  assert.equal(requireVaultRelativePath("Imports\\identity.age.json", "File"), "Imports/identity.age.json");
  for (const value of ["", "/tmp/body.md.age", "C:/body.md.age", "../body.md.age", "a//body.md.age", "a/./body.md.age"]) {
    assert.throws(() => requireVaultRelativePath(value, "Path"));
  }
});

test("ciphertext object references accept only vault-relative md.age files", () => {
  assert.equal(
    requireAgeObjectPath(".cipherlink/objects/019f.md.age"),
    ".cipherlink/objects/019f.md.age",
  );
  for (const value of [".obsidian/community-plugins.json", "../body.md.age", "https://example.com/body.md.age"]) {
    assert.throws(() => requireAgeObjectPath(value));
  }
});

test("gateway URLs require HTTPS except for loopback development", () => {
  assert.equal(requireGatewayBaseUrl("https://gateway.example.com/"), "https://gateway.example.com");
  assert.equal(requireGatewayBaseUrl("http://127.0.0.1:7474"), "http://127.0.0.1:7474");
  assert.equal(requireGatewayBaseUrl("http://[::1]:7474"), "http://[::1]:7474");
  for (const value of [
    "http://gateway.example.com",
    "ftp://gateway.example.com",
    "https://user:pass@gateway.example.com",
    "https://gateway.example.com?token=value",
  ]) {
    assert.throws(() => requireGatewayBaseUrl(value));
  }
});

test("runtime avoids browser storage and whole-vault Markdown enumeration", async () => {
  const i18n = await readFile("src/i18n.ts", "utf8");
  const main = await readFile("src/main.ts", "utf8");
  const envelope = await readFile("src/envelope/envelope.ts", "utf8");
  assert.equal(i18n.includes("localStorage"), false);
  assert.equal(i18n.includes("sessionStorage"), false);
  assert.equal(main.includes("getMarkdownFiles"), false);
  assert.equal(envelope.includes("getMarkdownFiles"), false);
  assert.match(main, /file\.parent\?\.children/);
  assert.match(main, /workspace\.getActiveFile\(\)/);
});
