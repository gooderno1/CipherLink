import {
  getLanguage,
  Notice,
  normalizePath,
  Plugin,
  requestUrl,
  TFile,
  TFolder,
} from "obsidian";
import {
  decryptText,
  encryptText,
  generateIdentityPair,
  CompatibleIdentityPackage,
  protectIdentity,
  ProtectedIdentityPackage,
  unlockIdentity,
} from "./crypto/crypto";
import { EnvelopeService } from "./envelope/envelope";
import {
  createSecureBodyEditorExtension,
  createSecureBodyPostProcessor,
} from "./editor/native-integration";
import type { SecureBodyInstance } from "./editor/secure-body";
import type { SecureBodyHost } from "./editor/secure-body";
import type { Translator } from "./i18n";
import { localizeError, resolveLanguage, translate } from "./i18n";
import { GatewayProvider, GatewaySession } from "./providers/gateway-provider";
import { decodeGatewayPayload, encodeGatewayPayload } from "./providers/gateway-payload";
import { LocalProvider } from "./providers/local-provider";
import type { SecureDocumentProvider } from "./providers/provider";
import { SecureSession } from "./session";
import { requireVaultRelativePath } from "./security/input-boundaries";
import { CipherLinkSettingTab } from "./settings";
import {
  ChangePasswordModal,
  ImportIdentityModal,
  PasswordModal,
  PublicMetadataModal,
  SetupModal,
} from "./ui/modals";
import type {
  CipherLinkSettings,
  EnvelopeDescriptor,
  NewSecureNote,
} from "./types";
import { DEFAULT_SETTINGS } from "./types";

export default class CipherLinkPlugin extends Plugin implements SecureBodyHost {
  settings: CipherLinkSettings = { ...DEFAULT_SETTINGS };
  readonly t: Translator = (key, variables) =>
    translate(resolveLanguage(this.settings.language, getLanguage()), key, variables);
  readonly session = new SecureSession();
  private envelopes!: EnvelopeService;
  private localProvider!: LocalProvider;
  private gatewayProvider!: GatewayProvider;
  private readonly secureBodies = new Set<SecureBodyInstance>();
  private readonly envelopeFiles = new Map<string, TFile>();
  private readonly pendingSecureBodyFocus = new Set<string>();

  async onload(): Promise<void> {
    await this.loadSettings();
    this.envelopes = new EnvelopeService(
      this.app.vault,
      this.app.metadataCache,
      this.app.fileManager,
      this.t,
    );
    this.localProvider = new LocalProvider(this.app.vault, () => this.settings.objectFolder);
    this.gatewayProvider = new GatewayProvider(
      () => this.settings.gatewayUrl,
      (baseUrl) => this.authenticateGateway(baseUrl),
    );
    this.registerEditorExtension(createSecureBodyEditorExtension(this));
    this.registerMarkdownPostProcessor(createSecureBodyPostProcessor(this), 100);
    this.addSettingTab(new CipherLinkSettingTab(this.app, this));
    this.addRibbonIcon("file-lock-2", this.t("command.create"), () => this.openCreateNote());
    this.addCommand({
      id: "create-encrypted-note",
      name: this.t("command.create"),
      callback: () => this.openCreateNote(),
    });
    this.addCommand({
      id: "change-identity-password",
      name: this.t("command.changePassword"),
      checkCallback: (checking) => {
        if (!this.settings.initialized) return false;
        if (!checking) this.openChangePassword();
        return true;
      },
    });
    this.addCommand({
      id: "import-protected-identity",
      name: this.t("command.importIdentity"),
      checkCallback: (checking) => {
        if (this.settings.initialized) return false;
        if (!checking) this.openImportIdentity();
        return true;
      },
    });
    this.addCommand({
      id: "migrate-current-age-file",
      name: this.t("command.migrateAge"),
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        const available = Boolean(file?.path.endsWith(".md.age"));
        if (available && !checking && file) {
          void this.migrateAgeFile(file).catch((cause) => {
            new Notice(localizeError(cause, this.t));
          });
        }
        return available;
      },
    });
    this.addCommand({
      id: "unlock-session",
      name: this.t("command.unlock"),
      checkCallback: (checking) => {
        if (!this.settings.initialized || this.session.isUnlocked) return false;
        if (!checking) void this.unlock();
        return true;
      },
    });
    this.addCommand({
      id: "lock-session",
      name: this.t("command.lock"),
      checkCallback: (checking) => {
        if (!this.session.isUnlocked) return false;
        if (!checking) void this.lock();
        return true;
      },
    });
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        menu.addItem((item) =>
          item
            .setTitle(this.t("command.create"))
            .setIcon("file-lock-2")
            .onClick(() => {
              const folder = file instanceof TFolder ? file.path : file.parent?.path;
              this.openCreateNote(folder || undefined);
            }),
        );
      }),
    );
  }

  onunload(): void {
    this.gatewayProvider?.revokeSession().catch(() => undefined);
    for (const body of this.secureBodies) body.lockImmediately();
    this.secureBodies.clear();
    this.session.lock();
  }

  get isInitialized(): boolean {
    return this.settings.initialized;
  }

  isUnlocked(): boolean {
    return this.session.isUnlocked;
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  async unlock(): Promise<void> {
    if (!this.settings.initialized) {
      this.openSetup();
      return;
    }
    await new Promise<void>((resolve) => {
      const modal = new PasswordModal(
        this.app,
        this.t,
        async (password) => {
          const identityPackage = await this.readIdentityPackage();
          this.session.unlock(await unlockIdentity(identityPackage, password));
          await this.refreshSecureBodies();
          new Notice(this.t("notice.unlocked"));
          resolve();
        },
        resolve,
      );
      modal.open();
    });
  }

  async lock(): Promise<void> {
    await Promise.all([...this.secureBodies].map((body) => body.lock()));
    if (this.gatewayProvider) await this.gatewayProvider.revokeSession().catch(() => undefined);
    this.session.lock();
    new Notice(this.t("notice.locked"));
  }

  async readEnvelope(file: TFile): Promise<EnvelopeDescriptor> {
    const envelope = await this.envelopes.read(file);
    this.envelopeFiles.set(envelope.id, envelope.file);
    return envelope;
  }

  async resolveEnvelope(id: string, preferredFile?: TFile): Promise<EnvelopeDescriptor> {
    const mapped = this.envelopeFiles.get(id);
    const candidates = [mapped, preferredFile, this.app.workspace.getActiveFile()].filter(
      (file): file is TFile => file instanceof TFile,
    );
    const envelope = await this.envelopes.resolve(id, candidates);
    this.envelopeFiles.set(id, envelope.file);
    return envelope;
  }

  consumeSecureBodyFocusRequest(id: string): boolean {
    return this.pendingSecureBodyFocus.delete(id);
  }

  async loadBody(envelope: EnvelopeDescriptor): Promise<{ body: string; version?: string }> {
    const stored = await this.provider(envelope.provider).load(envelope);
    const plaintext = await decryptText(stored.ciphertext, this.session.identity);
    const body = envelope.provider === "gateway"
      ? decodeGatewayPayload(envelope.id, plaintext)
      : plaintext;
    return stored.version ? { body, version: stored.version } : { body };
  }

  async saveBody(
    envelope: EnvelopeDescriptor,
    body: string,
    expectedVersion?: string,
  ): Promise<string | undefined> {
    const payload = envelope.provider === "gateway"
      ? encodeGatewayPayload(envelope.id, body)
      : body;
    const ciphertext = await encryptText(payload, await this.recipients(envelope.provider));
    const result = await this.provider(envelope.provider).save(
      envelope,
      ciphertext,
      expectedVersion,
    );
    return result.version;
  }

  async editPublicMetadata(envelope: EnvelopeDescriptor): Promise<void> {
    new PublicMetadataModal(
      this.app,
      this.t,
      envelope,
      async (aliases, tags, relationships) => {
        await this.envelopes.updatePublicMetadata(envelope, aliases, tags, relationships);
        new Notice(this.t("notice.metadataUpdated"));
      },
    ).open();
  }

  registerSecureBody(instance: SecureBodyInstance): () => void {
    this.secureBodies.add(instance);
    return () => this.secureBodies.delete(instance);
  }

  private async loadSettings(): Promise<void> {
    const saved = (await this.loadData()) as (Partial<CipherLinkSettings> & {
      identityPackagePath?: unknown;
    }) | null;
    const supported = { ...(saved ?? {}) };
    delete supported.identityPackagePath;
    this.settings = Object.assign({}, DEFAULT_SETTINGS, supported);
  }

  openSetup(afterSetup?: () => void): void {
    new SetupModal(this.app, this.t, async (password) => {
      const pair = await generateIdentityPair();
      const identityPackage = await protectIdentity(pair, password);
      await this.writeIdentityPackage(identityPackage);
      this.settings.initialized = true;
      this.settings.userRecipient = pair.recipient;
      await this.saveSettings();
      this.session.unlock(pair);
      await this.refreshSecureBodies();
      new Notice(this.t("notice.identityCreated"));
      if (afterSetup) window.setTimeout(afterSetup, 0);
    }).open();
  }

  openChangePassword(): void {
    new ChangePasswordModal(this.app, this.t, async (currentPassword, newPassword) => {
      const pair = await unlockIdentity(await this.readIdentityPackage(), currentPassword);
      await this.writeIdentityPackage(await protectIdentity(pair, newPassword));
      this.session.unlock(pair);
      new Notice(this.t("notice.passwordChanged"));
    }).open();
  }

  openImportIdentity(): void {
    new ImportIdentityModal(this.app, this.t, async (path, password) => {
      if (!path) throw new Error(this.t("error.identityNotFound"));
      const normalized = normalizePath(requireVaultRelativePath(path, "Identity package path"));
      if (!(await this.app.vault.adapter.exists(normalized))) {
        throw new Error(this.t("error.identityNotFound"));
      }
      const source = JSON.parse(
        await this.app.vault.adapter.read(normalized),
      ) as CompatibleIdentityPackage;
      const pair = await unlockIdentity(source, password);
      await this.writeIdentityPackage(await protectIdentity(pair, password));
      this.settings.initialized = true;
      this.settings.userRecipient = pair.recipient;
      await this.saveSettings();
      this.session.unlock(pair);
      await this.refreshSecureBodies();
      new Notice(this.t("notice.identityImported"));
    }).open();
  }

  private async migrateAgeFile(file: TFile): Promise<void> {
    const alreadyLinked = (file.parent?.children ?? []).some((candidate) => {
      if (!(candidate instanceof TFile) || candidate.extension !== "md") return false;
      const frontmatter = this.app.metadataCache.getFileCache(candidate)?.frontmatter;
      return frontmatter?.cipherlink_object === file.path;
    });
    if (alreadyLinked) throw new Error(this.t("error.alreadyLinked"));
    const title = file.name.replace(/\.md\.age$/i, "") || this.t("view.encryptedNote");
    const id = crypto.randomUUID();
    const envelope = await this.envelopes.create(
      file.parent?.path ?? "",
      { title, aliases: [], tags: [], relationships: [], provider: "local" },
      id,
      { objectPath: file.path },
    );
    this.envelopeFiles.set(id, envelope);
    await this.openCreatedEnvelope(envelope, id);
    new Notice(this.t("notice.envelopeCreated"));
  }

  openCreateNote(targetFolder?: string): void {
    const proceed = (): void => {
      void this.createBlankNote(targetFolder).catch((cause) => {
        new Notice(localizeError(cause, this.t));
      });
    };
    if (!this.settings.initialized) {
      this.openSetup(proceed);
      return;
    }
    if (this.session.isUnlocked) proceed();
    else {
      void this.unlock().then(() => {
        if (this.session.isUnlocked) proceed();
      });
    }
  }

  private async createBlankNote(targetFolder?: string): Promise<void> {
    const activePath = this.app.workspace.getActiveFile()?.path ?? "";
    const folder = targetFolder ?? this.app.fileManager.getNewFileParent(activePath).path;
    await this.createNote(
      {
        title: this.t("document.untitled"),
        aliases: [],
        tags: [],
        relationships: [],
        provider: this.settings.defaultProvider,
      },
      folder === "/" ? "" : folder,
    );
  }

  private async createNote(note: NewSecureNote, targetFolder?: string): Promise<void> {
    if (!this.session.isUnlocked) throw new Error(this.t("error.locked"));
    const id = crypto.randomUUID();
    const initialBody = "";
    const payload = note.provider === "gateway" ? encodeGatewayPayload(id, initialBody) : initialBody;
    const ciphertext = await encryptText(payload, await this.recipients(note.provider));
    const location = await this.provider(note.provider).create(id, ciphertext);
    const file = await this.envelopes.create(
      targetFolder ?? "",
      note,
      id,
      location,
    );
    this.envelopeFiles.set(id, file);
    await this.openCreatedEnvelope(file, id);
  }

  private async openCreatedEnvelope(file: TFile, id: string): Promise<void> {
    this.pendingSecureBodyFocus.add(id);
    try {
      await this.app.workspace.getLeaf(false).openFile(file, { active: true });
    } catch (cause) {
      this.pendingSecureBodyFocus.delete(id);
      throw cause;
    }
  }

  private provider(kind: "local" | "gateway"): SecureDocumentProvider {
    return kind === "gateway" ? this.gatewayProvider : this.localProvider;
  }

  private async recipients(kind: "local" | "gateway"): Promise<string[]> {
    const recipients = [this.settings.userRecipient];
    if (kind === "gateway") {
      await this.refreshGatewayConfiguration();
      if (!this.settings.gatewayRecipient) {
        throw new Error(this.t("error.gatewayRecipient"));
      }
      recipients.push(this.settings.gatewayRecipient);
    }
    return recipients;
  }

  async refreshGatewayConfiguration(): Promise<void> {
    const config = await this.gatewayProvider.getPublicConfig();
    if (config.protocolVersion !== 1) {
      throw new Error(this.t("error.gatewayProtocol", { version: config.protocolVersion }));
    }
    this.settings.gatewayProtocolVersion = config.protocolVersion;
    this.settings.gatewayRecipient = config.gatewayRecipient;
    this.settings.gatewayPrimaryEpoch = config.primaryEpoch;
    await this.saveSettings();
  }

  private async refreshSecureBodies(): Promise<void> {
    await Promise.all([...this.secureBodies].map((body) => body.refresh()));
  }

  private async authenticateGateway(baseUrl: string): Promise<GatewaySession> {
    const challenge = await requestUrl({
      url: `${baseUrl}/api/v1/session/challenge`,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
      throw: false,
    });
    if (challenge.status < 200 || challenge.status >= 300) {
      throw new Error(`Gateway challenge failed (${challenge.status}).`);
    }
    const challengeBody = challenge.json as Record<string, unknown>;
    const challengeId = requiredString(challengeBody.challengeId, "challengeId");
    const encryptedChallenge = base64ToBytes(
      requiredString(challengeBody.ciphertext, "ciphertext"),
    );
    const responseValue = JSON.parse(
      await decryptText(encryptedChallenge, this.session.identity),
    ) as Record<string, unknown>;
    const complete = await requestUrl({
      url: `${baseUrl}/api/v1/session/unlock`,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        challengeId,
        nonce: requiredString(responseValue.nonce, "nonce"),
      }),
      throw: false,
    });
    if (complete.status < 200 || complete.status >= 300) {
      throw new Error(`Gateway authentication failed (${complete.status}).`);
    }
    const completeBody = complete.json as Record<string, unknown>;
    return {
      token: requiredString(completeBody.token, "token"),
      expiresAt: requiredNumber(completeBody.expiresAt, "expiresAt"),
    };
  }

  private async readIdentityPackage(): Promise<CompatibleIdentityPackage> {
    const path = this.identityPackagePath();
    if (!(await this.app.vault.adapter.exists(path))) {
      throw new Error(this.t("error.identityMissing"));
    }
    const parsed = JSON.parse(await this.app.vault.adapter.read(path)) as CompatibleIdentityPackage;
    return parsed;
  }

  private async writeIdentityPackage(identityPackage: ProtectedIdentityPackage): Promise<void> {
    const path = this.identityPackagePath();
    await ensureAdapterParent(this.app.vault.adapter, path);
    await this.app.vault.adapter.write(path, `${JSON.stringify(identityPackage, null, 2)}\n`);
  }

  private identityPackagePath(): string {
    return normalizePath(
      `${this.app.vault.configDir}/plugins/${this.manifest.id}/identity.age.json`,
    );
  }
}

async function ensureAdapterParent(
  adapter: { exists(path: string): Promise<boolean>; mkdir(path: string): Promise<void> },
  path: string,
): Promise<void> {
  const segments = path.split("/").slice(0, -1);
  let current = "";
  for (const segment of segments) {
    current = current ? `${current}/${segment}` : segment;
    if (!(await adapter.exists(current))) await adapter.mkdir(current);
  }
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
