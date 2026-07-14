import type { TFile } from "obsidian";
import type { LanguagePreference } from "./i18n";

export type ProviderKind = "local" | "gateway";

export interface CipherLinkSettings {
  initialized: boolean;
  language: LanguagePreference;
  defaultProvider: ProviderKind;
  userRecipient: string;
  objectFolder: string;
  gatewayUrl: string;
  gatewayRecipient: string;
  gatewayPrimaryEpoch: number;
  gatewayProtocolVersion: number;
}

export interface PublicRelationship {
  target: string;
  label?: string;
}

export interface EnvelopeDescriptor {
  file: TFile;
  id: string;
  format: number;
  provider: ProviderKind;
  objectPath?: string;
  secureRef?: string;
  aliases: string[];
  tags: string[];
  relationships: PublicRelationship[];
}

export interface NewSecureNote {
  title: string;
  aliases: string[];
  tags: string[];
  relationships: PublicRelationship[];
  provider: ProviderKind;
}

export interface StoredCiphertext {
  ciphertext: Uint8Array;
  version?: string;
  primaryEpoch?: number;
}

export interface SaveResult {
  version?: string;
  primaryEpoch?: number;
}

export const DEFAULT_SETTINGS: CipherLinkSettings = {
  initialized: false,
  language: "auto",
  defaultProvider: "local",
  userRecipient: "",
  objectFolder: ".cipherlink/objects",
  gatewayUrl: "",
  gatewayRecipient: "",
  gatewayPrimaryEpoch: 0,
  gatewayProtocolVersion: 0,
};
