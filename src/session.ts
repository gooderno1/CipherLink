import type { IdentityPair } from "./crypto/crypto";

export class SecureSession {
  private pair: IdentityPair | null = null;

  get isUnlocked(): boolean {
    return this.pair !== null;
  }

  get identity(): string {
    if (!this.pair) throw new Error("CipherLink is locked.");
    return this.pair.identity;
  }

  get recipient(): string {
    if (!this.pair) throw new Error("CipherLink is locked.");
    return this.pair.recipient;
  }

  unlock(pair: IdentityPair): void {
    this.lock();
    this.pair = pair;
  }

  lock(): void {
    if (this.pair) this.pair.identity = "";
    this.pair = null;
  }
}
