import {
  FileManager,
  getFrontMatterInfo,
  MetadataCache,
  normalizePath,
  parseYaml,
  TFile,
  Vault,
} from "obsidian";
import type {
  EnvelopeDescriptor,
  NewSecureNote,
  PublicRelationship,
} from "../types";
import type { Translator } from "../i18n";

const RELATIONSHIP_HEADINGS = ["## Public relationships", "## 公开关系"];

export class EnvelopeService {
  constructor(
    private readonly vault: Vault,
    private readonly metadataCache: MetadataCache,
    private readonly fileManager: FileManager,
    private readonly t: Translator,
  ) {}

  async read(file: TFile): Promise<EnvelopeDescriptor> {
    const content = await this.vault.cachedRead(file);
    const frontmatter = this.metadataCache.getFileCache(file)?.frontmatter
      ?? parseFrontmatter(content);
    if (!frontmatter || frontmatter.cipherlink !== true) {
      throw new Error(`${file.path} is not a CipherLink envelope.`);
    }
    const descriptor: EnvelopeDescriptor = {
      file,
      id: requiredString(frontmatter.cipherlink_id, "cipherlink_id"),
      format: Number(frontmatter.cipherlink_format ?? 1),
      provider: frontmatter.cipherlink_provider === "gateway" ? "gateway" : "local",
      aliases: stringList(frontmatter.aliases),
      tags: stringList(frontmatter.tags),
      relationships: parseRelationships(content),
    };
    const objectPath = optionalString(frontmatter.cipherlink_object);
    const secureRef = optionalString(frontmatter.cipherlink_ref);
    if (objectPath) descriptor.objectPath = objectPath;
    if (secureRef) descriptor.secureRef = secureRef;
    return descriptor;
  }

  async resolve(id: string, candidates: readonly TFile[]): Promise<EnvelopeDescriptor> {
    const checked = new Set<string>();
    for (const candidate of candidates) {
      if (checked.has(candidate.path)) continue;
      checked.add(candidate.path);
      try {
        const envelope = await this.read(candidate);
        if (envelope.id === id) return envelope;
      } catch {
        // The editor may briefly expose the previous file while reusing a leaf.
      }
    }
    throw new Error(`CipherLink envelope not found: ${id}`);
  }

  async create(
    folder: string,
    note: NewSecureNote,
    id: string,
    location: { objectPath?: string; secureRef?: string },
  ): Promise<TFile> {
    await ensureVaultFolder(this.vault, folder);
    const path = await this.availablePath(folder, note.title);
    const properties = [
      "---",
      "cipherlink: true",
      "cipherlink_format: 1",
      `cipherlink_id: ${yamlScalar(id)}`,
      `cipherlink_provider: ${note.provider}`,
      location.objectPath
        ? `cipherlink_object: ${yamlScalar(normalizePath(location.objectPath))}`
        : `cipherlink_ref: ${yamlScalar(location.secureRef ?? id)}`,
      yamlList("aliases", note.aliases),
      yamlList("tags", note.tags),
      "---",
      `> [!cipherlink] ${this.t("envelope.lockedTitle")}`,
      `> ${this.t("envelope.lockedDesc")}`,
      "",
      `## ${this.t("envelope.relationships")}`,
      relationshipMarkdown(note.relationships, this.t("envelope.noRelationships")),
      "",
    ].join("\n");
    return this.vault.create(path, properties);
  }

  async updatePublicMetadata(
    envelope: EnvelopeDescriptor,
    aliases: string[],
    tags: string[],
    relationships: PublicRelationship[],
  ): Promise<void> {
    await this.fileManager.processFrontMatter(envelope.file, (frontmatter) => {
      frontmatter.aliases = cleanList(aliases);
      frontmatter.tags = cleanList(tags);
    });
    await this.vault.process(envelope.file, (content) =>
      replaceRelationshipSection(
        content,
        relationships,
        `## ${this.t("envelope.relationships")}`,
        this.t("envelope.noRelationships"),
      ),
    );
  }

  private async availablePath(folder: string, title: string): Promise<string> {
    const safeTitle = sanitizeFileName(title) || this.t("view.encryptedNote");
    for (let suffix = 0; suffix < 10_000; suffix += 1) {
      const name = suffix === 0 ? safeTitle : `${safeTitle} ${suffix + 1}`;
      const path = normalizePath(`${folder}/${name}.md`);
      if (!this.vault.getAbstractFileByPath(path)) return path;
    }
    throw new Error("Could not allocate a unique note filename.");
  }
}

function parseFrontmatter(content: string): Record<string, unknown> | null {
  const info = getFrontMatterInfo(content);
  if (!info.exists) return null;
  const parsed = parseYaml(info.frontmatter) as unknown;
  return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : null;
}

export function parseRelationships(content: string): PublicRelationship[] {
  const heading = RELATIONSHIP_HEADINGS.find((candidate) => content.includes(candidate));
  const section = heading ? content.split(heading)[1]?.split(/^## /m)[0] ?? "" : "";
  const result: PublicRelationship[] = [];
  const expression = /^-\s+\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/gm;
  for (const match of section.matchAll(expression)) {
    const relationship: PublicRelationship = { target: match[1]!.trim() };
    if (match[2]?.trim()) relationship.label = match[2].trim();
    result.push(relationship);
  }
  return result;
}

export function relationshipMarkdown(
  relationships: PublicRelationship[],
  noRelationships = "No public relationships",
): string {
  const values = relationships
    .filter((relationship) => relationship.target.trim())
    .map((relationship) => {
      const target = relationship.target.trim();
      const label = relationship.label?.trim();
      return `- [[${target}${label ? `|${label}` : ""}]]`;
    });
  return values.length > 0 ? values.join("\n") : `- ${noRelationships}`;
}

function replaceRelationshipSection(
  content: string,
  relationships: PublicRelationship[],
  preferredHeading: string,
  noRelationships: string,
): string {
  const existingHeading = RELATIONSHIP_HEADINGS.find((candidate) => content.includes(candidate));
  const heading = existingHeading ?? preferredHeading;
  const replacement = `${heading}\n${relationshipMarkdown(relationships, noRelationships)}\n`;
  const index = existingHeading ? content.indexOf(existingHeading) : -1;
  if (index < 0) return `${content.trimEnd()}\n\n${replacement}`;
  const nextHeading = content.indexOf("\n## ", index + heading.length);
  const end = nextHeading < 0 ? content.length : nextHeading + 1;
  return `${content.slice(0, index)}${replacement}${content.slice(end)}`;
}

export async function ensureVaultFolder(vault: Vault, folder: string): Promise<void> {
  const normalized = normalizePath(folder);
  if (!normalized || normalized === "/") return;
  let current = "";
  for (const segment of normalized.split("/")) {
    current = current ? `${current}/${segment}` : segment;
    if (vault.getAbstractFileByPath(current) || await vault.adapter.exists(current)) continue;
    try {
      await vault.createFolder(current);
    } catch (cause) {
      if (!(await vault.adapter.exists(current))) throw cause;
    }
  }
}

function sanitizeFileName(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim();
}

function yamlScalar(value: string): string {
  return JSON.stringify(value);
}

function yamlList(key: string, values: string[]): string {
  const cleaned = cleanList(values);
  if (cleaned.length === 0) return `${key}: []`;
  return `${key}:\n${cleaned.map((value) => `  - ${yamlScalar(value)}`).join("\n")}`;
}

function cleanList(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function stringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return typeof value === "string" ? [value] : [];
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

function requiredString(value: unknown, key: string): string {
  const parsed = optionalString(value);
  if (!parsed) throw new Error(`CipherLink envelope is missing ${key}.`);
  return parsed;
}
