import assert from "node:assert/strict";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  decryptText,
  encryptText,
  generateIdentityPair,
  protectIdentity,
  unlockIdentity,
} from "../src/crypto/crypto";

const PASSWORD = "correct horse battery staple";

test("identity package round-trips without storing the private identity", async () => {
  const pair = await generateIdentityPair();
  const identityPackage = await protectIdentity(pair, PASSWORD);
  const serialized = JSON.stringify(identityPackage);

  assert.equal(serialized.includes(pair.identity), false);
  assert.equal(serialized.includes("AGE-SECRET-KEY-"), false);
  assert.deepEqual(await unlockIdentity(identityPackage, PASSWORD), pair);
  await assert.rejects(() => unlockIdentity(identityPackage, "incorrect password"));

  const legacyCompatible = {
    ...identityPackage,
    format: "memoloom-secure-identity-v1" as const,
  };
  assert.deepEqual(await unlockIdentity(legacyCompatible, PASSWORD), pair);
});

test("encrypted note can only be opened by a listed identity", async () => {
  const owner = await generateIdentityPair();
  const unrelated = await generateIdentityPair();
  const marker = "SYNTHETIC_PRIVATE_BODY_8fd145e7";
  const ciphertext = await encryptText(`# Test\n\n${marker}`, [owner.recipient]);

  assert.equal(new TextDecoder().decode(ciphertext).includes(marker), false);
  assert.equal((await decryptText(ciphertext, owner.identity)).includes(marker), true);
  await assert.rejects(() => decryptText(ciphertext, unrelated.identity));
});

test("persisted standalone artifacts contain no plaintext marker", async () => {
  const runtime = path.resolve("local_dev_work/security-scan");
  await rm(runtime, { recursive: true, force: true });
  await mkdir(runtime, { recursive: true });
  const pair = await generateIdentityPair();
  const identityPackage = await protectIdentity(pair, PASSWORD);
  const marker = "SYNTHETIC_DISK_MARKER_31dc514f";
  const ciphertext = await encryptText(`# Secure\n\n${marker}`, [pair.recipient]);
  await writeFile(path.join(runtime, "identity.age.json"), JSON.stringify(identityPackage));
  await writeFile(path.join(runtime, "body.md.age"), ciphertext);

  for (const filename of ["identity.age.json", "body.md.age"]) {
    const persisted = await readFile(path.join(runtime, filename));
    assert.equal(persisted.includes(Buffer.from(marker)), false, `${filename} leaked plaintext`);
    assert.equal(persisted.includes(Buffer.from(pair.identity)), false, `${filename} leaked identity`);
  }
  await rm(runtime, { recursive: true, force: true });
});
