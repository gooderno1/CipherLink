import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import { EditorSelection, EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import {
  App,
  MarkdownRenderChild,
  MarkdownRenderer,
  Notice,
  setIcon,
  TFile,
} from "obsidian";
import type { Translator } from "../i18n";
import { localizeError } from "../i18n";
import type { EnvelopeDescriptor } from "../types";
import { livePreviewExtension } from "./live-preview";

export interface SecureBodyInstance {
  refresh(): Promise<void>;
  lock(): Promise<void>;
  lockImmediately(): void;
}

export interface SecureBodyHost {
  app: App;
  t: Translator;
  isUnlocked(): boolean;
  unlock(): Promise<void>;
  loadBody(envelope: EnvelopeDescriptor): Promise<{ body: string; version?: string }>;
  saveBody(
    envelope: EnvelopeDescriptor,
    body: string,
    expectedVersion?: string,
  ): Promise<string | undefined>;
  resolveEnvelope(id: string, preferredFile?: TFile): Promise<EnvelopeDescriptor>;
  consumeSecureBodyFocusRequest(id: string): boolean;
  editPublicMetadata(envelope: EnvelopeDescriptor): Promise<void>;
  registerSecureBody(instance: SecureBodyInstance): () => void;
}

export class SecureBodyController extends MarkdownRenderChild implements SecureBodyInstance {
  private envelope: EnvelopeDescriptor | null = null;
  private editor: EditorView | null = null;
  private privateBody = "";
  private version: string | undefined;
  private saveTimer: number | null = null;
  private saveQueue: Promise<void> = Promise.resolve();
  private mode: "edit" | "read";
  private unregister: (() => void) | null = null;
  private disposing = false;

  constructor(
    containerEl: HTMLElement,
    private readonly host: SecureBodyHost,
    private readonly preferredFile: TFile,
    private readonly expectedId: string,
    initialMode: "edit" | "read" = "edit",
    private readonly shouldFocus: () => boolean = () => false,
  ) {
    super(containerEl);
    this.mode = initialMode;
  }

  onload(): void {
    this.unregister = this.host.registerSecureBody(this);
    void this.refresh();
  }

  onunload(): void {
    if (this.saveTimer !== null) window.clearTimeout(this.saveTimer);
    this.saveTimer = null;
    if (!this.disposing) void this.flushSave();
    this.unregister?.();
    this.unregister = null;
    this.clearPrivateState();
  }

  async dispose(): Promise<void> {
    if (this.disposing) return;
    this.disposing = true;
    await this.flushSave();
    this.unload();
  }

  async refresh(): Promise<void> {
    if (this.disposing) return;
    try {
      this.envelope = await this.host.resolveEnvelope(this.expectedId, this.preferredFile);
      if (!this.host.isUnlocked()) {
        this.clearPrivateState();
        this.renderLocked();
        return;
      }
      const loaded = await this.host.loadBody(this.envelope);
      this.privateBody = loaded.body;
      this.version = loaded.version;
      await this.renderUnlocked();
    } catch (cause) {
      this.renderError(cause);
    }
  }

  async lock(): Promise<void> {
    await this.flushSave(false, true);
    this.clearPrivateState();
    this.renderLocked();
  }

  lockImmediately(): void {
    if (this.saveTimer !== null) window.clearTimeout(this.saveTimer);
    this.saveTimer = null;
    this.clearPrivateState();
    this.renderLocked();
  }

  private renderLocked(): void {
    this.containerEl.empty();
    this.containerEl.addClass("cipherlink-embedded");
    const state = this.containerEl.createDiv({ cls: "cipherlink-state cipherlink-state-embedded" });
    const icon = state.createDiv({ cls: "cipherlink-state-icon" });
    setIcon(icon, "lock-keyhole");
    state.createEl("h3", { text: this.host.t("view.locked") });
    const button = state.createEl("button", { text: this.host.t("view.unlock") });
    button.addClass("mod-cta");
    button.addEventListener("click", () => void this.host.unlock());
  }

  private async renderUnlocked(): Promise<void> {
    this.editor?.destroy();
    this.editor = null;
    this.containerEl.empty();
    this.containerEl.addClass("cipherlink-embedded");
    this.renderToolbar();
    const body = this.containerEl.createDiv({ cls: "cipherlink-body cipherlink-body-embedded" });
    if (this.mode === "read") {
      await MarkdownRenderer.render(
        this.host.app,
        this.privateBody,
        body,
        this.envelope?.file.path ?? this.preferredFile.path,
        this,
      );
      return;
    }
    this.editor = new EditorView({
      parent: body,
      state: EditorState.create({
        doc: this.privateBody,
        selection: EditorSelection.cursor(this.privateBody.length),
        extensions: [
          history(),
          markdown(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          EditorView.lineWrapping,
          livePreviewExtension((target) => {
            void this.host.app.workspace.openLinkText(
              target,
              this.envelope?.file.path ?? this.preferredFile.path,
            );
          }),
          EditorView.updateListener.of((update) => {
            if (!update.docChanged) return;
            this.privateBody = update.state.doc.toString();
            this.scheduleSave();
          }),
        ],
      }),
    });
    if (this.shouldFocus()) this.editor.focus();
  }

  private renderToolbar(): void {
    const toolbar = this.containerEl.createDiv({ cls: "cipherlink-toolbar" });
    toolbar.createDiv({
      cls: "cipherlink-toolbar-title",
      text: this.host.t("view.privateBody"),
    });
    const actions = toolbar.createDiv({ cls: "cipherlink-toolbar-actions" });
    if (this.mode === "edit") {
      this.iconButton(actions, "bold", this.host.t("view.bold"), () => this.wrapSelection("**", "**"));
      this.iconButton(actions, "italic", this.host.t("view.italic"), () => this.wrapSelection("*", "*"));
      this.iconButton(actions, "highlighter", this.host.t("view.highlight"), () => this.wrapSelection("==", "=="));
      this.iconButton(actions, "strikethrough", this.host.t("view.strike"), () => this.wrapSelection("~~", "~~"));
      this.iconButton(actions, "link", this.host.t("view.wikilink"), () => this.wrapSelection("[[", "]]"));
      this.iconButton(actions, "list-checks", this.host.t("view.task"), () => this.insertAtLineStart("- [ ] "));
    }
    this.iconButton(
      actions,
      this.mode === "edit" ? "book-open" : "square-pen",
      this.mode === "edit" ? this.host.t("view.reading") : this.host.t("view.edit"),
      () => {
        this.mode = this.mode === "edit" ? "read" : "edit";
        void this.renderUnlocked();
      },
    );
    this.iconButton(actions, "tags", this.host.t("view.editMetadata"), () => {
      if (this.envelope) void this.host.editPublicMetadata(this.envelope);
    });
    this.iconButton(actions, "save", this.host.t("view.save"), () => void this.flushSave(true));
  }

  private iconButton(
    parent: HTMLElement,
    iconName: string,
    label: string,
    action: () => void,
  ): void {
    const button = parent.createEl("button", { attr: { "aria-label": label } });
    setIcon(button, iconName);
    button.addEventListener("click", action);
  }

  private wrapSelection(before: string, after: string): void {
    if (!this.editor) return;
    const selection = this.editor.state.selection.main;
    const selected = this.editor.state.sliceDoc(selection.from, selection.to);
    this.editor.dispatch({
      changes: { from: selection.from, to: selection.to, insert: `${before}${selected}${after}` },
      selection: { anchor: selection.from + before.length, head: selection.to + before.length },
    });
    this.editor.focus();
  }

  private insertAtLineStart(value: string): void {
    if (!this.editor) return;
    const line = this.editor.state.doc.lineAt(this.editor.state.selection.main.head);
    this.editor.dispatch({ changes: { from: line.from, insert: value } });
    this.editor.focus();
  }

  private scheduleSave(): void {
    if (this.saveTimer !== null) window.clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => void this.flushSave(), 700);
  }

  private async flushSave(showNotice = false, throwOnFailure = false): Promise<void> {
    if (this.saveTimer !== null) window.clearTimeout(this.saveTimer);
    this.saveTimer = null;
    if (!this.envelope || !this.host.isUnlocked()) return;
    const envelope = this.envelope;
    const body = this.privateBody;
    this.saveQueue = this.saveQueue.catch(() => undefined).then(async () => {
      this.version = await this.host.saveBody(envelope, body, this.version);
      if (showNotice) new Notice(this.host.t("view.saveOk"));
    });
    try {
      await this.saveQueue;
    } catch (cause) {
      new Notice(this.host.t("view.saveFailed", { message: localizeError(cause, this.host.t) }));
      if (throwOnFailure) throw cause;
    }
  }

  private clearPrivateState(): void {
    this.editor?.destroy();
    this.editor = null;
    this.privateBody = "";
    this.containerEl.empty();
  }

  private renderError(cause: unknown): void {
    this.clearPrivateState();
    this.containerEl.addClass("cipherlink-embedded");
    const state = this.containerEl.createDiv({ cls: "cipherlink-state cipherlink-state-embedded" });
    state.createEl("h3", { text: this.host.t("view.openFailed") });
    state.createEl("p", { text: localizeError(cause, this.host.t) });
  }
}
