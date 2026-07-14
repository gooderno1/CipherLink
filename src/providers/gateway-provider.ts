import { requestUrl } from "obsidian";
import { requireGatewayBaseUrl } from "../security/input-boundaries";
import type { EnvelopeDescriptor, SaveResult, StoredCiphertext } from "../types";
import type { SecureDocumentProvider } from "./provider";

export interface GatewaySession {
  token: string;
  expiresAt: number;
}

export interface GatewayPublicConfig {
  protocolVersion: number;
  gatewayRecipient: string;
  primaryEpoch: number;
}

export class GatewayProvider implements SecureDocumentProvider {
  private session: GatewaySession | null = null;

  constructor(
    private readonly baseUrl: () => string,
    private readonly authenticate: (baseUrl: string) => Promise<GatewaySession>,
  ) {}

  async revokeSession(): Promise<void> {
    if (!this.session) return;
    const session = this.session;
    this.session = null;
    const baseUrl = requireGatewayBaseUrl(this.baseUrl());
    if (!baseUrl) return;
    try {
      await requestUrl({
        url: `${baseUrl}/api/v1/session`,
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.token}` },
        throw: false,
      });
    } catch {
      // Local session state is revoked even if the gateway is unreachable.
    }
  }

  async getPublicConfig(): Promise<GatewayPublicConfig> {
    const response = await this.request("/api/v1/config/public", "GET", undefined, false);
    return {
      protocolVersion: requiredNumber(response.protocolVersion, "protocolVersion"),
      gatewayRecipient: requiredString(response.gatewayRecipient, "gatewayRecipient"),
      primaryEpoch: requiredNumber(response.primaryEpoch, "primaryEpoch"),
    };
  }

  async load(envelope: EnvelopeDescriptor): Promise<StoredCiphertext> {
    const secureRef = requireRef(envelope);
    const response = await this.request(`/api/v1/refs/${encodeURIComponent(secureRef)}/open`, "POST", {});
    return {
      ciphertext: base64ToBytes(requiredString(response.ciphertext, "ciphertext")),
      version: JSON.stringify({
        objectId: requiredString(response.objectId, "objectId"),
        version: requiredNumber(response.version, "version"),
        primaryEpoch: requiredNumber(response.primaryEpoch, "primaryEpoch"),
      }),
      primaryEpoch: requiredNumber(response.primaryEpoch, "primaryEpoch"),
    };
  }

  async create(id: string, ciphertext: Uint8Array): Promise<SaveResult & { secureRef: string }> {
    const config = await this.getPublicConfig();
    const secureRef = `CL-${id.toUpperCase()}`;
    const response = await this.request("/api/v1/objects", "POST", {
      objectId: id,
      secureRef,
      objectType: "markdown-note",
      dataClass: "S1",
      ciphertext: bytesToBase64(ciphertext),
      fieldAllowlist: [],
      operationAllowlist: [],
      primaryEpoch: config.primaryEpoch,
    });
    return {
      secureRef: requiredString(response.secureRef, "secureRef"),
      version: JSON.stringify({
        objectId: requiredString(response.objectId, "objectId"),
        version: requiredNumber(response.version, "version"),
        primaryEpoch: requiredNumber(response.primaryEpoch, "primaryEpoch"),
      }),
      primaryEpoch: requiredNumber(response.primaryEpoch, "primaryEpoch"),
    };
  }

  async save(
    envelope: EnvelopeDescriptor,
    ciphertext: Uint8Array,
    expectedVersion?: string,
  ): Promise<SaveResult> {
    requireRef(envelope);
    if (!expectedVersion) throw new Error("Gateway note has no loaded version token.");
    const versionToken = parseVersionToken(expectedVersion);
    const response = await this.request(`/api/v1/objects/${encodeURIComponent(versionToken.objectId)}`, "PATCH", {
      ciphertext: bytesToBase64(ciphertext),
      baseVersion: versionToken.version,
      primaryEpoch: versionToken.primaryEpoch,
    });
    return {
      version: JSON.stringify({
        objectId: requiredString(response.objectId, "objectId"),
        version: requiredNumber(response.version, "version"),
        primaryEpoch: requiredNumber(response.primaryEpoch, "primaryEpoch"),
      }),
      primaryEpoch: requiredNumber(response.primaryEpoch, "primaryEpoch"),
    };
  }

  private async request(
    path: string,
    method: "GET" | "POST" | "PATCH" | "DELETE",
    body?: Record<string, unknown>,
    authenticated = true,
  ): Promise<Record<string, unknown>> {
    const baseUrl = requireGatewayBaseUrl(this.baseUrl());
    if (authenticated && (!this.session || this.session.expiresAt <= Date.now() + 10_000)) {
      this.session = await this.authenticate(baseUrl);
    }
    const request = {
      url: `${baseUrl}${path}`,
      method,
      headers: {
        "Content-Type": "application/json",
        ...(authenticated && this.session ? { Authorization: `Bearer ${this.session.token}` } : {}),
      },
      throw: false,
    };
    const response = await requestUrl(body ? { ...request, body: JSON.stringify(body) } : request);
    const value = response.json as Record<string, unknown>;
    if (response.status < 200 || response.status >= 300) {
      const detail = typeof value.message === "string" ? value.message : "Gateway request failed";
      const code = typeof value.error === "string" ? ` [${value.error}]` : "";
      throw new Error(`${detail}${code} (${response.status}).`);
    }
    return value;
  }
}

function requireRef(envelope: EnvelopeDescriptor): string {
  if (!envelope.secureRef) throw new Error("Gateway envelope has no secure reference.");
  return envelope.secureRef;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value) throw new Error(`Gateway response is missing ${field}.`);
  return value;
}

function requiredNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Gateway response is missing ${field}.`);
  }
  return value;
}

function parseVersionToken(value: string): { objectId: string; version: number; primaryEpoch: number } {
  const parsed = JSON.parse(value) as Record<string, unknown>;
  return {
    objectId: requiredString(parsed.objectId, "objectId"),
    version: requiredNumber(parsed.version, "version"),
    primaryEpoch: requiredNumber(parsed.primaryEpoch, "primaryEpoch"),
  };
}
