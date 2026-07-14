import * as age from "age-encryption";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export interface IdentityPair {
  identity: string;
  recipient: string;
}

export interface ProtectedIdentityPackage {
  format: "cipherlink-identity-v1";
  protectedIdentity: string;
  recipient: string;
  createdAt: string;
}

export interface CompatibleIdentityPackage {
  format: "cipherlink-identity-v1" | "memoloom-secure-identity-v1";
  protectedIdentity: string;
  recipient: string;
  createdAt: string;
}

export async function generateIdentityPair(): Promise<IdentityPair> {
  const identity = await age.generateIdentity();
  return { identity, recipient: await age.identityToRecipient(identity) };
}

export async function protectIdentity(
  pair: IdentityPair,
  password: string,
): Promise<ProtectedIdentityPackage> {
  const encrypter = new age.Encrypter();
  encrypter.setPassphrase(password);
  const encrypted = await encrypter.encrypt(encoder.encode(pair.identity));
  return {
    format: "cipherlink-identity-v1",
    protectedIdentity: age.armor.encode(encrypted),
    recipient: pair.recipient,
    createdAt: new Date().toISOString(),
  };
}

export async function unlockIdentity(
  identityPackage: CompatibleIdentityPackage,
  password: string,
): Promise<IdentityPair> {
  if (
    identityPackage.format !== "cipherlink-identity-v1" &&
    identityPackage.format !== "memoloom-secure-identity-v1"
  ) {
    throw new Error("Unsupported CipherLink identity package.");
  }
  const decrypter = new age.Decrypter();
  decrypter.addPassphrase(password);
  const identity = decoder.decode(
    await decrypter.decrypt(decodeProtectedIdentity(identityPackage.protectedIdentity)),
  );
  const recipient = await age.identityToRecipient(identity);
  if (recipient !== identityPackage.recipient) {
    throw new Error("Identity package recipient does not match its private identity.");
  }
  return { identity, recipient };
}

export async function encryptText(
  plaintext: string,
  recipients: string[],
): Promise<Uint8Array> {
  const uniqueRecipients = [...new Set(recipients.filter(Boolean))];
  if (uniqueRecipients.length === 0) {
    throw new Error("At least one age recipient is required.");
  }
  const encrypter = new age.Encrypter();
  for (const recipient of uniqueRecipients) encrypter.addRecipient(recipient);
  return encrypter.encrypt(encoder.encode(plaintext));
}

export async function decryptText(
  ciphertext: Uint8Array,
  identity: string,
): Promise<string> {
  const decrypter = new age.Decrypter();
  decrypter.addIdentity(identity);
  return decoder.decode(await decrypter.decrypt(ciphertext));
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const result = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    result[index] = binary.charCodeAt(index);
  }
  return result;
}

function decodeProtectedIdentity(value: string): Uint8Array {
  return value.includes("BEGIN AGE ENCRYPTED FILE")
    ? age.armor.decode(value)
    : base64ToBytes(value);
}
