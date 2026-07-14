import type { EnvelopeDescriptor, SaveResult, StoredCiphertext } from "../types";

export interface SecureDocumentProvider {
  load(envelope: EnvelopeDescriptor): Promise<StoredCiphertext>;
  create(id: string, ciphertext: Uint8Array): Promise<SaveResult & { objectPath?: string; secureRef?: string }>;
  save(
    envelope: EnvelopeDescriptor,
    ciphertext: Uint8Array,
    expectedVersion?: string,
  ): Promise<SaveResult>;
}
