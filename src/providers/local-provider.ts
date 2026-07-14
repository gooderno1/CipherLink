import { normalizePath, Vault } from "obsidian";
import { ensureVaultFolder } from "../envelope/envelope";
import { requireAgeObjectPath, requireVaultRelativePath } from "../security/input-boundaries";
import type { EnvelopeDescriptor, SaveResult, StoredCiphertext } from "../types";
import type { SecureDocumentProvider } from "./provider";

export class LocalProvider implements SecureDocumentProvider {
  constructor(
    private readonly vault: Vault,
    private readonly objectFolder: () => string,
  ) {}

  async load(envelope: EnvelopeDescriptor): Promise<StoredCiphertext> {
    const objectPath = this.requireObjectPath(envelope);
    if (!(await this.vault.adapter.exists(objectPath))) {
      throw new Error(`Ciphertext object not found: ${objectPath}`);
    }
    return { ciphertext: new Uint8Array(await this.vault.adapter.readBinary(objectPath)) };
  }

  async create(id: string, ciphertext: Uint8Array): Promise<{ objectPath: string }> {
    const folder = normalizePath(
      requireVaultRelativePath(this.objectFolder(), "Ciphertext object folder"),
    );
    await ensureVaultFolder(this.vault, folder);
    const objectPath = normalizePath(`${folder}/${id}.md.age`);
    if (await this.vault.adapter.exists(objectPath)) {
      throw new Error(`Ciphertext object already exists: ${objectPath}`);
    }
    await this.vault.adapter.writeBinary(objectPath, exactBuffer(ciphertext));
    return { objectPath };
  }

  async save(
    envelope: EnvelopeDescriptor,
    ciphertext: Uint8Array,
  ): Promise<SaveResult> {
    const objectPath = this.requireObjectPath(envelope);
    if (!(await this.vault.adapter.exists(objectPath))) {
      throw new Error(`Ciphertext object not found: ${objectPath}`);
    }
    await this.vault.adapter.writeBinary(objectPath, exactBuffer(ciphertext));
    return {};
  }

  private requireObjectPath(envelope: EnvelopeDescriptor): string {
    if (!envelope.objectPath) throw new Error("Local envelope has no ciphertext object path.");
    return normalizePath(requireAgeObjectPath(envelope.objectPath));
  }
}

function exactBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.slice().buffer as ArrayBuffer;
}
